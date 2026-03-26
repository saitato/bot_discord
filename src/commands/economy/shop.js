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
const { addMissionProgress } = require('../../utils/dailyMissions');
const {
  ITEMS,
  getInventorySlots,
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

async function getItemInfo(userId, guildId, type) {
  const item = await Item.findOne({ userId, guildId, type });

  if (!item) return '📦 Bạn chưa sở hữu món này.';

  const lines = [`📦 Số lượng: ${item.quantity || 0}`];

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

async function buildShopEmbed(userId, guildId) {
  await removeExpiredItems(userId, guildId);

  const [user, slots, usedSlots] = await Promise.all([
    User.findOne({ userId, guildId }),
    getUserSlots(userId, guildId),
    getUsedSlots(userId, guildId),
  ]);

  const desc = [
    `💰 Số dư: **${(user?.balance || 0).toLocaleString('vi-VN')} Wcoin**`,
    `🎒 Balo: **${usedSlots}/${slots} ô**`,
    '',
    ...Object.values(ITEMS).map(
      (item) => `${item.name} - **${item.price.toLocaleString('vi-VN')} Wcoin**\n${item.desc}`
    ),
  ].join('\n\n');

  return new EmbedBuilder()
    .setColor('#2563EB')
    .setTitle('🛒 Cửa hàng')
    .setDescription(desc);
}

const clickCooldown = new Map();

function checkCooldown(userId) {
  const now = Date.now();
  const last = clickCooldown.get(userId) || 0;

  if (now - last < 1500) return false;

  clickCooldown.set(userId, now);
  return true;
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

    let selected = null;

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_item')
      .setPlaceholder('Chọn item')
      .addOptions(
        Object.entries(ITEMS).map(([key, item]) => ({
          label: item.name,
          description: `${item.price.toLocaleString('vi-VN')} Wcoin`,
          value: key,
        }))
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy').setLabel('🛒 Mua').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('sell').setLabel('💸 Bán').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('cancel').setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
    );

    const embed = await buildShopEmbed(userId, guildId);

    const msg = await interaction.reply({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(select),
        buttons,
      ],
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

      if (i.isStringSelectMenu()) {
        selected = i.values[0];
        const item = ITEMS[selected];
        const info = await getItemInfo(userId, guildId, item.type);

        return i.reply({
          content: `✅ ${item.name}\n${item.desc}\n\n${info}`,
          ephemeral: true,
        });
      }

      if (!selected) {
        return i.reply({ content: '❌ Bạn chưa chọn item!', ephemeral: true });
      }

      const item = ITEMS[selected];
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        let userDoc = await User.findOne({ userId, guildId }).session(session);
        if (!userDoc) {
          userDoc = new User({ userId, guildId, balance: 0 });
        }

        await removeExpiredItems(userId, guildId, session);

        let exist = await Item.findOne({ userId, guildId, type: item.type }).session(session);

        if (i.customId === 'buy') {
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
                [{ userId, guildId, type: item.type, quantity: 1 }],
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
          await i.update({
            embeds: [newEmbed],
            components: [
              new ActionRowBuilder().addComponents(select),
              buttons,
            ],
          });

          await addMissionProgress(userId, guildId, 'buy_item', 1);

          return i.followUp({
            content: `✅ Mua ${item.name} thành công`,
            ephemeral: true,
          });
        }

        if (i.customId === 'sell') {
          if (!exist || exist.quantity <= 0) {
            throw new Error('NO_ITEM');
          }

          const refund = Math.floor(item.price * 0.75);

          if (item.stack) {
            exist.quantity -= 1;

            if (exist.quantity <= 0) {
              await exist.deleteOne({ session });
            } else {
              await exist.save({ session });
            }
          } else {
            await exist.deleteOne({ session });
          }

          userDoc.balance += refund;
          await userDoc.save({ session });

          await session.commitTransaction();

          const newEmbed = await buildShopEmbed(userId, guildId);
          await i.update({
            embeds: [newEmbed],
            components: [
              new ActionRowBuilder().addComponents(select),
              buttons,
            ],
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
