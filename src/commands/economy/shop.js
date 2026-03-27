const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const Equipment = require('../../models/Equipment');
const { addMissionProgress } = require('../../utils/dailyMissions');
const {
  EQUIPMENT_SLOTS,
  ITEMS,
  getBossItemTotalStatValue,
  getEquipmentSlotLabel,
  getBossItemSellPrice,
  getInventorySlots,
  getItemByType,
  formatDuration,
} = require('../../utils/economyItems');

async function removeExpiredItems(userId, guildId, session = null) {
  const query = {
    userId,
    guildId,
    expiresAt: { $gt: 0, $lte: Date.now() },
  };

  if (session) {
    await Item.deleteMany(query).session(session);
    return;
  }

  await Item.deleteMany(query);
}

async function getUsedSlots(userId, guildId, session = null) {
  const query = {
    userId,
    guildId,
    $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
  };

  let req = Item.countDocuments(query);
  if (session) req = req.session(session);
  return req;
}

async function getUserSlots(userId, guildId, session = null) {
  let req = Bag.findOne({ userId, guildId });
  if (session) req = req.session(session);
  const bagData = await req;
  return getInventorySlots(bagData?.level || 1);
}

async function getItemInfo(userId, guildId, type, itemLevel = 0) {
  const item = await Item.findOne({ userId, guildId, type, itemLevel });

  if (!item) return '📦 Bạn chưa sở hữu món này.';

  const lines = [`📦 Số lượng: ${item.quantity || 0}`];
  const meta = getItemByType(type);

  if (item.itemLevel > 0) {
    lines.push(`✨ Cấp đồ: Lv ${item.itemLevel}`);
    lines.push(`🔨 Cường hóa: +${item.upgradeLevel || 0}`);
  }

  if (meta?.stat) {
    const statName = meta.stat === 'crit' ? 'Crit' : meta.stat === 'armor_pen' ? 'Xuyên giáp' : 'ATK';
    lines.push(`🧩 Ô trang bị: ${getEquipmentSlotLabel(meta.slot)}`);
    lines.push(`📈 Chỉ số: ${statName} +${getBossItemTotalStatValue(meta, item.itemLevel || 10, item.upgradeLevel || 0)}`);
  }

  if (item.expiresAt > 0) {
    if (item.expiresAt > Date.now()) {
      lines.push(`⏳ Còn lại: ${formatDuration(item.expiresAt - Date.now())}`);
    } else {
      lines.push('⏳ Đã hết hạn');
    }
  } else {
    lines.push('⏳ Vĩnh viễn');
  }

  return lines.join('\n');
}

async function getSellableItems(userId, guildId) {
  return Item.find({
    userId,
    guildId,
    $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
  }).sort({ createdAt: 1 });
}

async function buildShopEmbed(userId, guildId) {
  await removeExpiredItems(userId, guildId);

  const [user, slots, usedSlots, sellableItems] = await Promise.all([
    User.findOne({ userId, guildId }),
    getUserSlots(userId, guildId),
    getUsedSlots(userId, guildId),
    getSellableItems(userId, guildId),
  ]);

  const ownedText = sellableItems.length
    ? sellableItems
        .slice(0, 8)
        .map((item) => {
          const meta = getItemByType(item.type);
          const itemName = meta?.name || item.type;
          const levelText = item.itemLevel > 0 ? ` Lv ${item.itemLevel}` : '';
          const upgradeText = meta?.stat ? ` +${item.upgradeLevel || 0}` : '';
          const sellPrice = meta?.rarity
            ? getBossItemSellPrice(meta, item.itemLevel || 10)
            : Math.floor((meta?.price || 0) * 0.75);
          return `${itemName}${levelText}${upgradeText} x${item.quantity} - bán ${sellPrice.toLocaleString('vi-VN')} Wcoin`;
        })
        .join('\n')
    : 'Chưa có đồ nào để bán.';

  const desc = [
    `💰 Số dư: **${(user?.balance || 0).toLocaleString('vi-VN')} Wcoin**`,
    `🎒 Balo: **${usedSlots}/${slots} ô**`,
    '',
    '**Đồ trong shop**',
    ...Object.values(ITEMS).map(
      (item) => `${item.name} - **${item.price.toLocaleString('vi-VN')} Wcoin**\n${item.desc}`
    ),
    '',
    '**Đồ có thể bán**',
    ownedText,
  ].join('\n\n');

  return new EmbedBuilder()
    .setColor('#2563EB')
    .setTitle('🛒 Cửa hàng')
    .setDescription(desc);
}

async function clearEquippedItemIfNeeded(userId, guildId, itemId, session) {
  const equipment = await Equipment.findOne({ userId, guildId }).session(session);
  if (!equipment) return;

  let changed = false;
  for (const slot of EQUIPMENT_SLOTS) {
    if (equipment[slot]?.itemId === String(itemId)) {
      equipment[slot] = {
        itemId: null,
        type: null,
        itemLevel: 0,
      };
      changed = true;
    }
  }

  if (changed) {
    await equipment.save({ session });
  }
}

const clickCooldown = new Map();

function checkCooldown(userId) {
  const now = Date.now();
  const last = clickCooldown.get(userId) || 0;

  if (now - last < 1500) return false;

  clickCooldown.set(userId, now);
  return true;
}

async function buildShopComponents(userId, guildId) {
  const shopSelect = new StringSelectMenuBuilder()
    .setCustomId('select_shop_item')
    .setPlaceholder('Chọn đồ trong shop để mua')
    .addOptions(
      Object.entries(ITEMS).map(([key, item]) => ({
        label: item.name,
        description: `${item.price.toLocaleString('vi-VN')} Wcoin`,
        value: `shop:${key}`,
      }))
    );

  const sellableItems = await getSellableItems(userId, guildId);
  const sellOptions = sellableItems.slice(0, 25).map((item) => {
    const meta = getItemByType(item.type);
    const itemName = meta?.name || item.type;
    const levelText = item.itemLevel > 0 ? ` Lv ${item.itemLevel}` : '';
    const upgradeText = meta?.stat ? ` +${item.upgradeLevel || 0}` : '';
    return {
      label: `${itemName}${levelText}${upgradeText}`.slice(0, 100),
      description: `SL ${item.quantity} | Bán ${
        (meta?.rarity
          ? getBossItemSellPrice(meta, item.itemLevel || 10)
          : Math.floor((meta?.price || 0) * 0.75)
        ).toLocaleString('vi-VN')
      } Wcoin`,
      value: `inv:${item.id}`,
    };
  });

  const rows = [new ActionRowBuilder().addComponents(shopSelect)];

  if (sellOptions.length > 0) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_inventory_item')
          .setPlaceholder('Chọn đồ trong balo để bán')
          .addOptions(sellOptions)
      )
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy').setLabel('🛒 Mua').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sell').setLabel('💸 Bán').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cancel').setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
    )
  );

  return rows;
}

module.exports = {
  name: 'shop',
  description: 'Mua bán item trong cửa hàng',

  callback: async (client, interaction) => {
    if (!interaction.inGuild()) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    let user = await User.findOne({ userId, guildId });
    if (!user) user = await User.create({ userId, guildId, balance: 0 });

    let selectedShopKey = null;
    let selectedInventoryItemId = null;

    const embed = await buildShopEmbed(userId, guildId);
    const components = await buildShopComponents(userId, guildId);

    const msg = await interaction.reply({
      embeds: [embed],
      components,
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({ content: '❌ Đây không phải cửa hàng của bạn!', ephemeral: true });
      }

      if (!checkCooldown(userId)) {
        return i.reply({ content: '⏳ Hãy chờ 1.5 giây rồi thử lại!', ephemeral: true });
      }

      if (i.customId === 'cancel') {
        collector.stop();
        return i.update({
          content: '❌ Đã đóng cửa hàng',
          embeds: [],
          components: [],
        });
      }

      if (i.isStringSelectMenu() && i.customId === 'select_shop_item') {
        selectedShopKey = i.values[0].replace('shop:', '');
        const item = ITEMS[selectedShopKey];
        const info = await getItemInfo(userId, guildId, item.type);

        return i.reply({
          content: `✅ ${item.name}\n${item.desc}\n\n${info}`,
          ephemeral: true,
        });
      }

      if (i.isStringSelectMenu() && i.customId === 'select_inventory_item') {
        selectedInventoryItemId = i.values[0].replace('inv:', '');
        const selectedItem = await Item.findById(selectedInventoryItemId);
        const meta = selectedItem ? getItemByType(selectedItem.type) : null;
        const itemName = meta?.name || selectedItem?.type || 'Item';
        const info = selectedItem
          ? await getItemInfo(userId, guildId, selectedItem.type, selectedItem.itemLevel || 0)
          : '📦 Không tìm thấy item.';

        return i.reply({
          content: `✅ ${itemName}\n${meta?.desc || 'Đồ trong balo'}\n\n${info}`,
          ephemeral: true,
        });
      }

      if (i.customId === 'buy' && !selectedShopKey) {
        return i.reply({ content: '❌ Bạn chưa chọn đồ trong shop!', ephemeral: true });
      }

      if (i.customId === 'sell' && !selectedInventoryItemId) {
        return i.reply({ content: '❌ Bạn chưa chọn đồ trong balo để bán!', ephemeral: true });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let userDoc = await User.findOne({ userId, guildId }).session(session);
        if (!userDoc) {
          userDoc = new User({ userId, guildId, balance: 0 });
        }

        await removeExpiredItems(userId, guildId, session);

        if (i.customId === 'buy') {
          const item = ITEMS[selectedShopKey];
          let exist = await Item.findOne({ userId, guildId, type: item.type, itemLevel: 0 }).session(session);

          if (userDoc.balance < item.price) {
            throw new Error('NOT_ENOUGH');
          }

          const slots = await getUserSlots(userId, guildId, session);
          const usedSlots = await getUsedSlots(userId, guildId, session);
          const hasActiveItem = exist && (exist.expiresAt === 0 || exist.expiresAt > Date.now());

          if (!hasActiveItem && usedSlots >= slots) {
            throw new Error('BAG_FULL');
          }

          if (item.stack) {
            if (exist) {
              exist.quantity += 1;
              await exist.save({ session });
            } else {
              await Item.create(
                [{ userId, guildId, type: item.type, itemLevel: 0, quantity: 1 }],
                { session }
              );
            }
          } else if (exist) {
            if (exist.expiresAt > Date.now()) {
              throw new Error('ALREADY_HAVE');
            }

            exist.expiresAt = Date.now() + 86400000;
            exist.quantity = 1;
            await exist.save({ session });
          } else {
            await Item.create(
              [{
                userId,
                guildId,
                type: item.type,
                itemLevel: 0,
                quantity: 1,
                expiresAt: Date.now() + 86400000,
              }],
              { session }
            );
          }

          userDoc.balance -= item.price;
          await userDoc.save({ session });

          await session.commitTransaction();

          const newEmbed = await buildShopEmbed(userId, guildId);
          const newComponents = await buildShopComponents(userId, guildId);
          await i.update({
            embeds: [newEmbed],
            components: newComponents,
          });

          await addMissionProgress(userId, guildId, 'buy_item', 1);

          return i.followUp({
            content: `✅ Mua ${item.name} thành công`,
            ephemeral: true,
          });
        }

        if (i.customId === 'sell') {
          const exist = await Item.findOne({ _id: selectedInventoryItemId, userId, guildId }).session(session);
          const item = exist ? getItemByType(exist.type) : null;

          if (!exist || !item || exist.quantity <= 0) {
            throw new Error('NO_ITEM');
          }

          const refund = item.rarity
            ? getBossItemSellPrice(item, exist.itemLevel || 10)
            : Math.floor(item.price * 0.75);

          if (item.stack) {
            exist.quantity -= 1;

            if (exist.quantity <= 0) {
              await clearEquippedItemIfNeeded(userId, guildId, exist.id, session);
              await exist.deleteOne({ session });
            } else {
              await exist.save({ session });
            }
          } else {
            await clearEquippedItemIfNeeded(userId, guildId, exist.id, session);
            await exist.deleteOne({ session });
          }

          userDoc.balance += refund;
          await userDoc.save({ session });

          await session.commitTransaction();

          const newEmbed = await buildShopEmbed(userId, guildId);
          const newComponents = await buildShopComponents(userId, guildId);
          await i.update({
            embeds: [newEmbed],
            components: newComponents,
          });

          return i.followUp({
            content: `💸 Bạn nhận lại ${refund.toLocaleString('vi-VN')} Wcoin`,
            ephemeral: true,
          });
        }
      } catch (err) {
        await session.abortTransaction();

        if (err.message === 'NOT_ENOUGH') {
          return i.reply({ content: '❌ Bạn không đủ Wcoin!', ephemeral: true });
        }

        if (err.message === 'ALREADY_HAVE') {
          return i.reply({ content: '❌ Item này vẫn đang còn hiệu lực!', ephemeral: true });
        }

        if (err.message === 'NO_ITEM') {
          return i.reply({ content: '❌ Bạn không có item này để bán!', ephemeral: true });
        }

        if (err.message === 'BAG_FULL') {
          return i.reply({ content: '❌ Balo đã đầy, hãy tăng level hoặc bán bớt item!', ephemeral: true });
        }

        console.log(err);
        return i.reply({ content: '❌ Đã xảy ra lỗi hệ thống!', ephemeral: true });
      } finally {
        session.endSession();
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => null);
    });
  },
};
