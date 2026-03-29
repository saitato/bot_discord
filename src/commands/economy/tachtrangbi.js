const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Interaction,
  StringSelectMenuBuilder,
} = require('discord.js');
const mongoose = require('mongoose');
const Item = require('../../models/Item');
const Equipment = require('../../models/Equipment');
const {
  EQUIPMENT_SLOTS,
  UPGRADE_STONE_RARITIES,
  getEquipmentDismantleStoneReward,
  getEquipmentSlotLabel,
  getItemByType,
  getUpgradeStoneType,
} = require('../../utils/economyItems');

async function getDismantlableItems(userId, guildId) {
  const items = await Item.find({
    userId,
    guildId,
    quantity: { $gt: 0 },
    $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
  }).sort({ createdAt: 1 });

  return items.filter((item) => {
    const meta = getItemByType(item.type);
    return Boolean(meta?.slot && meta?.stat);
  });
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

async function getStoneCount(userId, guildId) {
  const items = await Item.find({
    userId,
    guildId,
    type: { $in: Object.keys(UPGRADE_STONE_RARITIES).map((rarity) => getUpgradeStoneType(rarity)) },
    itemLevel: 0,
  });

  return Object.entries(UPGRADE_STONE_RARITIES)
    .map(([rarity, config]) => `${config.label}: ${items.find((item) => item.type === getUpgradeStoneType(rarity))?.quantity || 0}`)
    .join(' | ');
}

function buildEmbed(user, items, stoneCount) {
  const lines = items.length
    ? items.slice(0, 15).map((item, index) => {
        const meta = getItemByType(item.type);
        const reward = getEquipmentDismantleStoneReward(meta, item.itemLevel || 1, item.upgradeLevel || 0);
        return `\`${index + 1}\` ${meta.name} \`Lv ${item.itemLevel || 1} +${item.upgradeLevel || 0}\`\n> ${getEquipmentSlotLabel(meta.slot)} | Nhận \`${reward} đá\` | SL: ${item.quantity}`;
      }).join('\n\n')
    : '**Bạn chưa có trang bị để tách.**';

  return new EmbedBuilder()
    .setColor('#DC2626')
    .setAuthor({
      name: `Tách trang bị của ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setDescription([`**Đá nâng cấp hiện có:** ${stoneCount}`, '', lines].join('\n'))
    .setFooter({ text: 'Mỗi lần tách sẽ phá 1 món trang bị và đổi lấy đá nâng cấp' })
    .setTimestamp();
}

function buildComponents(items) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('dismantle_equipment_select')
    .setPlaceholder(items.length ? 'Chọn trang bị để tách' : 'Không có trang bị để tách')
    .setDisabled(items.length === 0);

  if (items.length) {
    select.addOptions(
      items.slice(0, 25).map((item) => {
        const meta = getItemByType(item.type);
        const reward = getEquipmentDismantleStoneReward(meta, item.itemLevel || 1, item.upgradeLevel || 0);
        return {
          label: `${meta.name} Lv ${item.itemLevel || 1} +${item.upgradeLevel || 0}`.slice(0, 100),
          description: `${getEquipmentSlotLabel(meta.slot)} | Nhận ${reward} đá`.slice(0, 100),
          value: item.id,
        };
      })
    );
  } else {
    select.addOptions([
      {
        label: 'Không có trang bị',
        description: 'Hãy đánh boss để nhận thêm đồ',
        value: 'no_item',
      },
    ]);
  }

  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('dismantle_equipment_refresh')
        .setLabel('Làm mới')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('dismantle_equipment_close')
        .setLabel('Đóng')
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

async function buildView(userId, guildId, user) {
  const [items, stoneCount] = await Promise.all([
    getDismantlableItems(userId, guildId),
    getStoneCount(userId, guildId),
  ]);

  return {
    embeds: [buildEmbed(user, items, stoneCount)],
    components: buildComponents(items),
  };
}

async function performDismantle(userId, guildId, itemId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  let transactionCommitted = false;

  try {
    const itemDoc = await Item.findOne({
      _id: itemId,
      userId,
      guildId,
      quantity: { $gt: 0 },
      $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
    }).session(session);

    if (!itemDoc) throw new Error('ITEM_NOT_FOUND');

    const meta = getItemByType(itemDoc.type);
    if (!meta?.slot || !meta?.stat) throw new Error('INVALID_ITEM');

    const reward = getEquipmentDismantleStoneReward(meta, itemDoc.itemLevel || 1, itemDoc.upgradeLevel || 0);

    const stoneType = getUpgradeStoneType(meta.rarity || 'common');
    let stoneItem = await Item.findOne({
      userId,
      guildId,
      type: stoneType,
      itemLevel: 0,
    }).session(session);

    if (itemDoc.quantity <= 1) {
      await clearEquippedItemIfNeeded(userId, guildId, itemDoc.id, session);
      await itemDoc.deleteOne({ session });
    } else {
      itemDoc.quantity -= 1;
      await itemDoc.save({ session });
    }

    if (stoneItem) {
      stoneItem.quantity += reward;
      await stoneItem.save({ session });
    } else {
      stoneItem = new Item({
        userId,
        guildId,
        type: stoneType,
        itemLevel: 0,
        quantity: reward,
        expiresAt: 0,
      });
      await stoneItem.save({ session });
    }

    await session.commitTransaction();
    transactionCommitted = true;

    return {
      meta,
      itemLevel: itemDoc.itemLevel || 1,
      upgradeLevel: itemDoc.upgradeLevel || 0,
      reward,
      stoneRarity: meta.rarity || 'common',
      stoneBalance: stoneItem.quantity || reward,
    };
  } catch (error) {
    if (!transactionCommitted) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

function buildResultEmbed(user, result) {
  return new EmbedBuilder()
    .setColor('#16A34A')
    .setAuthor({
      name: `Tách trang bị của ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTitle('Tách trang bị thành công')
    .setDescription(
      [
        `**Trang bị:** ${result.meta.name}`,
        `**Cấp đồ:** \`Lv ${result.itemLevel} +${result.upgradeLevel}\``,
        `**Đã nhận được:** \`${result.reward} đá ${UPGRADE_STONE_RARITIES[result.stoneRarity]?.label || result.stoneRarity}\``,
        `**Đá hiện có:** \`${result.stoneBalance}\``,
      ].join('\n')
    )
    .setTimestamp();
}

module.exports = {
  name: 'tachtrangbi',
  description: 'Tách trang bị boss để đổi lấy đá nâng cấp',

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Chỉ dùng trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    await interaction.editReply(await buildView(userId, guildId, interaction.user));
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({ content: 'Đây không phải bảng tách đồ của bạn.', ephemeral: true });
      }

      if (i.customId === 'dismantle_equipment_close') {
        collector.stop('closed');
        return i.update({ content: 'Đã đóng bảng tách trang bị.', embeds: [], components: [] });
      }

      if (i.customId === 'dismantle_equipment_refresh') {
        return i.update(await buildView(userId, guildId, interaction.user));
      }

      if (i.isStringSelectMenu() && i.customId === 'dismantle_equipment_select') {
        const itemId = i.values[0];
        if (itemId === 'no_item') {
          return i.reply({ content: 'Bạn chưa có trang bị để tách.', ephemeral: true });
        }

        try {
          const result = await performDismantle(userId, guildId, itemId);
          const refreshedView = await buildView(userId, guildId, interaction.user);
          refreshedView.embeds.unshift(buildResultEmbed(interaction.user, result));
          return i.update(refreshedView);
        } catch (error) {
          if (error.message === 'ITEM_NOT_FOUND') {
            return i.update(await buildView(userId, guildId, interaction.user));
          }
          if (error.message === 'INVALID_ITEM') {
            return i.reply({ content: 'Item này không phải trang bị boss để tách.', ephemeral: true });
          }

          console.log(error);
          return i.reply({ content: 'Đã xảy ra lỗi khi tách trang bị.', ephemeral: true });
        }
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'closed') return;
      await interaction.editReply({ components: [] }).catch(() => null);
    });
  },
};
