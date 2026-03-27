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
const User = require('../../models/User');
const Item = require('../../models/Item');
const {
  EQUIPMENT_DOWNGRADE_RATE_ON_FAIL,
  MAX_EQUIPMENT_UPGRADE_LEVEL,
  getBossItemTotalStatValue,
  getEquipmentSlotLabel,
  getEquipmentUpgradeInfo,
  getItemByType,
} = require('../../utils/economyItems');

function getStatLabel(stat) {
  if (stat === 'crit') return 'Crit';
  if (stat === 'armor_pen') return 'Xuyên giáp';
  return 'ATK';
}

async function getUpgradeableItems(userId, guildId) {
  const items = await Item.find({
    userId,
    guildId,
    $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
  }).sort({ createdAt: 1 });

  return items.filter((item) => {
    const meta = getItemByType(item.type);
    return Boolean(meta?.slot && meta?.stat);
  });
}

function buildOverviewEmbed(user, items) {
  const lines = items.length
    ? items.slice(0, 15).map((item, index) => {
        const meta = getItemByType(item.type);
        const nextInfo = getEquipmentUpgradeInfo(item.upgradeLevel || 0, {
          ...meta,
          itemLevel: item.itemLevel || 10,
        });
        const statValue = getBossItemTotalStatValue(
          meta,
          item.itemLevel || 10,
          item.upgradeLevel || 0
        );

        return [
          `\`${index + 1}\` ${meta.name} \`Lv ${item.itemLevel || 10} +${item.upgradeLevel || 0}\``,
          `> ${getEquipmentSlotLabel(meta.slot)} • ${getStatLabel(meta.stat)} +${statValue}${nextInfo ? ` • Giá nâng cấp: ${nextInfo.price.toLocaleString('vi-VN')} Wcoin` : ' • Đã max'}`,
        ].join('\n');
      })
    : ['**Bạn chưa có trang bị boss để nâng cấp.**'];

  return new EmbedBuilder()
    .setColor('#F59E0B')
    .setAuthor({
      name: `Nâng cấp trang bị của ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: 'Chọn món đồ trong menu để nâng cấp nhanh' })
    .setTimestamp();
}

function buildComponents(items) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('upgrade_equipment_select')
    .setPlaceholder(
      items.length > 0
        ? 'Chọn trang bị để nâng cấp'
        : 'Bạn chưa có đồ boss để nâng cấp'
    )
    .setDisabled(items.length === 0);

  if (items.length > 0) {
    select.addOptions(
      items.slice(0, 25).map((item) => {
        const meta = getItemByType(item.type);
        const nextInfo = getEquipmentUpgradeInfo(item.upgradeLevel || 0, {
          ...meta,
          itemLevel: item.itemLevel || 10,
        });
        return {
          label: `${meta.name} Lv ${item.itemLevel || 10} +${item.upgradeLevel || 0}`.slice(0, 100),
          description: `${getEquipmentSlotLabel(meta.slot)} | ${nextInfo ? `${nextInfo.successRate}% - ${nextInfo.price.toLocaleString('vi-VN')} Wcoin` : 'Đã max cấp'}`.slice(0, 100),
          value: item.id,
        };
      })
    );
  } else {
    select.addOptions([
      {
        label: 'Không có trang bị',
        description: 'Hãy đánh boss để kiếm đồ trước',
        value: 'no_item',
      },
    ]);
  }

  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('upgrade_equipment_refresh')
        .setLabel('Làm mới')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('upgrade_equipment_close')
        .setLabel('Đóng')
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

async function buildUpgradeView(userId, guildId, user) {
  const items = await getUpgradeableItems(userId, guildId);
  return {
    embeds: [buildOverviewEmbed(user, items)],
    components: buildComponents(items),
  };
}

async function performUpgrade(userId, guildId, itemId) {
  const session = await mongoose.startSession();
  session.startTransaction();
  let transactionCommitted = false;

  try {
    let user = await User.findOne({ userId, guildId }).session(session);
    if (!user) user = new User({ userId, guildId, balance: 0 });

    const itemDoc = await Item.findOne({
      _id: itemId,
      userId,
      guildId,
      $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
    }).session(session);

    if (!itemDoc) {
      throw new Error('ITEM_NOT_FOUND');
    }

    const meta = getItemByType(itemDoc.type);
    if (!meta?.slot || !meta?.stat) {
      throw new Error('INVALID_ITEM');
    }

    const oldUpgradeLevel = Math.max(itemDoc.upgradeLevel || 0, 0);
    if (oldUpgradeLevel >= MAX_EQUIPMENT_UPGRADE_LEVEL) {
      throw new Error('MAX_LEVEL');
    }

    const upgradeInfo = getEquipmentUpgradeInfo(oldUpgradeLevel, {
      ...meta,
      itemLevel: itemDoc.itemLevel || 10,
    });

    if (!upgradeInfo) {
      throw new Error('NO_UPGRADE_INFO');
    }

    if ((user.balance || 0) < upgradeInfo.price) {
      throw new Error('NOT_ENOUGH');
    }

    user.balance -= upgradeInfo.price;

    const success = Math.random() * 100 < upgradeInfo.successRate;
    let downgraded = false;

    if (success) {
      itemDoc.upgradeLevel = oldUpgradeLevel + 1;
    } else if (oldUpgradeLevel > 0 && Math.random() * 100 < EQUIPMENT_DOWNGRADE_RATE_ON_FAIL) {
      const downgradeLevels = Math.random() < 0.5 ? 1 : 2;
      itemDoc.upgradeLevel = Math.max(0, oldUpgradeLevel - downgradeLevels);
      downgraded = true;
    }

    await Promise.all([
      user.save({ session }),
      itemDoc.save({ session }),
    ]);

    await session.commitTransaction();
    transactionCommitted = true;

    return {
      userBalance: user.balance || 0,
      item: itemDoc,
      meta,
      success,
      downgraded,
      upgradeInfo,
      oldUpgradeLevel,
      newUpgradeLevel: itemDoc.upgradeLevel || 0,
    };
  } catch (error) {
    if (!transactionCommitted) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
}

function buildResultEmbed(result) {
  const {
    userBalance,
    item,
    meta,
    success,
    downgraded,
    upgradeInfo,
    oldUpgradeLevel,
    newUpgradeLevel,
  } = result;

  const statBefore = getBossItemTotalStatValue(meta, item.itemLevel || 10, oldUpgradeLevel);
  const statAfter = getBossItemTotalStatValue(meta, item.itemLevel || 10, newUpgradeLevel);
  const statLabel = getStatLabel(meta.stat);

  return new EmbedBuilder()
    .setColor(success ? '#22C55E' : downgraded ? '#EF4444' : '#F59E0B')
    .setTitle(success ? 'Nâng cấp trang bị thành công' : 'Nâng cấp trang bị thất bại')
    .setDescription(
      [
        `**Trang bị:** ${meta.name}`,
        `**Ô:** ${getEquipmentSlotLabel(meta.slot)}`,
        `**Cấp đồ:** \`Lv ${item.itemLevel || 10}\``,
        `**Cường hóa:** \`+${oldUpgradeLevel} -> +${newUpgradeLevel}\``,
        `**Chỉ số:** \`${statLabel} ${statBefore} -> ${statAfter}\``,
        '',
        success
          ? 'Trang bị đã hấp thụ năng lượng cường hóa.'
          : downgraded
            ? 'Cường hóa thất bại và trang bị bị tụt cấp.'
            : 'Cường hóa thất bại nhưng trang bị được giữ nguyên cấp.',
      ].join('\n')
    )
    .addFields(
      { name: 'Chi phí', value: `\`${upgradeInfo.price.toLocaleString('vi-VN')} Wcoin\``, inline: true },
      { name: 'Tỉ lệ thành công', value: `\`${upgradeInfo.successRate}%\``, inline: true },
      { name: 'Số dư còn lại', value: `\`${userBalance.toLocaleString('vi-VN')} Wcoin\``, inline: true }
    )
    .setFooter({ text: `Thất bại có ${EQUIPMENT_DOWNGRADE_RATE_ON_FAIL}% khả năng tụt cấp` })
    .setTimestamp();
}

module.exports = {
  name: 'nangcaptrangbi',
  description: 'Nâng cấp trang bị boss bằng menu chọn nhanh',

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

    await interaction.editReply(await buildUpgradeView(userId, guildId, interaction.user));
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({
          content: 'Đây không phải bảng nâng cấp của bạn.',
          ephemeral: true,
        });
      }

      if (i.customId === 'upgrade_equipment_close') {
        collector.stop('closed');
        return i.update({
          content: 'Đã đóng bảng nâng cấp trang bị.',
          embeds: [],
          components: [],
        });
      }

      if (i.customId === 'upgrade_equipment_refresh') {
        return i.update(await buildUpgradeView(userId, guildId, interaction.user));
      }

      if (i.isStringSelectMenu() && i.customId === 'upgrade_equipment_select') {
        const itemId = i.values[0];
        if (itemId === 'no_item') {
          return i.reply({
            content: 'Bạn chưa có trang bị boss để nâng cấp.',
            ephemeral: true,
          });
        }

        try {
          const result = await performUpgrade(userId, guildId, itemId);
          const refreshedView = await buildUpgradeView(userId, guildId, interaction.user);
          refreshedView.embeds.unshift(buildResultEmbed(result));
          return i.update(refreshedView);
        } catch (error) {
          if (error.message === 'ITEM_NOT_FOUND') {
            return i.update(await buildUpgradeView(userId, guildId, interaction.user));
          }

          if (error.message === 'INVALID_ITEM') {
            return i.reply({ content: 'Item này không phải trang bị boss để nâng cấp.', ephemeral: true });
          }

          if (error.message === 'MAX_LEVEL') {
            return i.reply({ content: 'Trang bị này đã đạt cấp cường hóa tối đa.', ephemeral: true });
          }

          if (error.message === 'NO_UPGRADE_INFO') {
            return i.reply({ content: 'Không lấy được dữ liệu nâng cấp trang bị.', ephemeral: true });
          }

          if (error.message === 'NOT_ENOUGH') {
            return i.reply({ content: 'Bạn không đủ Wcoin để nâng cấp món này.', ephemeral: true });
          }

          console.log(error);
          return i.reply({ content: 'Đã xảy ra lỗi khi nâng cấp trang bị.', ephemeral: true });
        }
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'closed') return;

      await interaction.editReply({
        components: [],
      }).catch(() => null);
    });
  },
};
