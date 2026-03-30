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
const {
  EQUIPMENT_DOWNGRADE_RATE_ON_FAIL,
  MAX_EQUIPMENT_UPGRADE_LEVEL,
  UPGRADE_STONE_RARITIES,
  getBossItemTotalStatValue,
  getEquipmentSlotDisplay,
  getEquipmentUpgradeInfo,
  getItemByType,
  getUpgradeStoneSuccessBonus,
  getUpgradeStoneType,
} = require('../../utils/economyItems');
const { createEquipmentIconAttachment } = require('../../utils/equipmentIconAttachment');

function getStatLabel(stat) {
  if (stat === 'atk') return 'ATK';
  if (stat === 'atk_percent') return 'ATK%';
  if (stat === 'hp') return 'HP';
  if (stat === 'crit') return 'Crit';
  if (stat === 'attack_speed') return 'Toc danh';
  if (stat === 'cooldown_reduction') return 'Hoi chieu';
  if (stat === 'dodge') return 'Ne tranh';
  if (stat === 'cc_resist') return 'Khang CC';
  if (stat === 'lifesteal') return 'Hut mau';
  if (stat === 'crit_damage') return 'Crit damage';
  if (stat === 'armor_pen') return 'Xuyen giap';
  if (stat === 'skill_damage') return 'ST ky nang';
  return stat || 'Chi so';
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

async function getStoneCounts(userId, guildId) {
  const types = Object.keys(UPGRADE_STONE_RARITIES).map((rarity) => getUpgradeStoneType(rarity));
  const stoneItems = await Item.find({
    userId,
    guildId,
    type: { $in: types },
    itemLevel: 0,
  });

  const counts = {};
  for (const rarity of Object.keys(UPGRADE_STONE_RARITIES)) {
    counts[rarity] = stoneItems.find((item) => item.type === getUpgradeStoneType(rarity))?.quantity || 0;
  }
  return counts;
}

function formatStoneInventory(stoneCounts) {
  return Object.entries(UPGRADE_STONE_RARITIES)
    .map(([rarity, config]) => `${config.label}: ${stoneCounts[rarity] || 0}`)
    .join(' | ');
}

function getItemPreview(item) {
  const meta = getItemByType(item.type);
  if (!meta) return null;

  const upgradeInfo = getEquipmentUpgradeInfo(item.upgradeLevel || 0, {
    ...meta,
    itemLevel: item.itemLevel || 1,
  });

  return {
    item,
    meta,
    upgradeInfo,
    statValue: getBossItemTotalStatValue(meta, item.itemLevel || 1, item.upgradeLevel || 0),
  };
}

function buildStoneOptions(selectedItem, stoneCounts) {
  if (!selectedItem) return [];

  const preview = getItemPreview(selectedItem);
  if (!preview?.upgradeInfo) return [];

  return Object.entries(UPGRADE_STONE_RARITIES).map(([rarity, config]) => {
    const ownCount = stoneCounts[rarity] || 0;
    return {
      rarity,
      ownCount,
      bonus: getUpgradeStoneSuccessBonus(rarity),
      enough: ownCount >= preview.upgradeInfo.stoneCost,
      finalSuccessRate: Math.min(95, preview.upgradeInfo.successRate + getUpgradeStoneSuccessBonus(rarity)),
      stoneCost: preview.upgradeInfo.stoneCost,
      label: config.label,
    };
  });
}

function buildOverviewEmbed(user, items, stoneCounts, selectedItem = null, selectedStoneRarity = null) {
  const lines = items.length
    ? items.slice(0, 15).map((item, index) => {
        const preview = getItemPreview(item);
        return [
          `\`${index + 1}\` ${preview.meta.name} \`Lv ${item.itemLevel || 1} +${item.upgradeLevel || 0}\``,
          `> ${getEquipmentSlotDisplay(preview.meta.slot)} | ${getStatLabel(preview.meta.stat)} +${preview.statValue}${preview.upgradeInfo ? ` | Đá cần: ${preview.upgradeInfo.stoneCost}` : ' | Đã max'}`,
        ].join('\n');
      })
    : ['**Bạn chưa có trang bị boss để nâng cấp.**'];

  const selectedBlock = [];
  if (selectedItem) {
    const preview = getItemPreview(selectedItem);
    if (preview) {
      selectedBlock.push(`**Đã chọn:** ${preview.meta.name} \`Lv ${selectedItem.itemLevel || 1} +${selectedItem.upgradeLevel || 0}\``);
      if (preview.upgradeInfo) {
        selectedBlock.push(`Cần \`${preview.upgradeInfo.stoneCost}\` đá | Tỉ lệ gốc \`${preview.upgradeInfo.successRate}%\``);
      }
    }
  }

  if (selectedStoneRarity && selectedItem) {
    const stoneOption = buildStoneOptions(selectedItem, stoneCounts).find((entry) => entry.rarity === selectedStoneRarity);
    if (stoneOption) {
      selectedBlock.push(
        `**Đã chọn:** Đá ${stoneOption.label} | Bonus \`+${stoneOption.bonus}%\` | Tỉ lệ cuối \`${stoneOption.finalSuccessRate}%\` | Sở hữu \`${stoneOption.ownCount}\``
      );
      if (!stoneOption.enough) {
        selectedBlock.push('`Không đủ số lượng đá này để nâng cấp`');
      }
    }
  }

  return new EmbedBuilder()
    .setColor('#F59E0B')
    .setAuthor({
      name: `Nâng cấp trang bị của ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setDescription(
      [
        `**Đá nâng cấp hiện có:** ${formatStoneInventory(stoneCounts)}`,
        selectedBlock.length ? '' : null,
        selectedBlock.length ? selectedBlock.join('\n') : null,
        '',
        lines.join('\n\n'),
      ].filter(Boolean).join('\n')
    )
    .setFooter({ text: 'Chọn trang bị, chọn loại đá, rồi bấm nâng cấp' })
    .setTimestamp();
}

function buildComponents(items, stoneCounts, selectedItem = null, selectedStoneRarity = null) {
  const equipmentSelect = new StringSelectMenuBuilder()
    .setCustomId('upgrade_equipment_select')
    .setPlaceholder(items.length ? 'Chọn trang bị để nâng cấp' : 'Bạn chưa có đồ boss để nâng cấp')
    .setDisabled(items.length === 0);

  if (items.length) {
    equipmentSelect.addOptions(
      items.slice(0, 25).map((item) => {
        const preview = getItemPreview(item);
        return {
          label: `${preview.meta.name} Lv ${item.itemLevel || 1} +${item.upgradeLevel || 0}`.slice(0, 100),
          description: `${getEquipmentSlotDisplay(preview.meta.slot)} | ${preview.upgradeInfo ? `${preview.upgradeInfo.successRate}% - ${preview.upgradeInfo.stoneCost} đá` : 'Đã max cấp'}`.slice(0, 100),
          value: item.id,
          default: selectedItem ? item.id === selectedItem.id : false,
        };
      })
    );
  } else {
    equipmentSelect.addOptions([
      {
        label: 'Không có trang bị',
        description: 'Hãy đánh boss để kiếm đồ trước',
        value: 'no_item',
      },
    ]);
  }

  const rows = [new ActionRowBuilder().addComponents(equipmentSelect)];

  const stoneOptions = buildStoneOptions(selectedItem, stoneCounts);
  if (selectedItem && stoneOptions.length) {
    const stoneSelect = new StringSelectMenuBuilder()
      .setCustomId('upgrade_stone_select')
      .setPlaceholder('Chọn loại đá nâng cấp')
      .addOptions(
        stoneOptions.map((option) => ({
          label: `Đá ${option.label}`.slice(0, 100),
          description: `${option.ownCount}/${option.stoneCost} | +${option.bonus}% | Cuối ${option.finalSuccessRate}%`.slice(0, 100),
          value: option.rarity,
          default: option.rarity === selectedStoneRarity,
        }))
      );
    rows.push(new ActionRowBuilder().addComponents(stoneSelect));
  }

  const selectedStone = stoneOptions.find((option) => option.rarity === selectedStoneRarity);
  const canUpgrade = Boolean(selectedItem && selectedStone && selectedStone.enough);

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('upgrade_equipment_confirm')
        .setLabel('Nâng cấp')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!canUpgrade),
      new ButtonBuilder()
        .setCustomId('upgrade_equipment_refresh')
        .setLabel('Làm mới')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('upgrade_equipment_close')
        .setLabel('Đóng')
        .setStyle(ButtonStyle.Danger)
    )
  );

  return rows;
}

async function buildUpgradeView(userId, guildId, user, selectedItemId = null, selectedStoneRarity = null) {
  const [items, stoneCounts] = await Promise.all([
    getUpgradeableItems(userId, guildId),
    getStoneCounts(userId, guildId),
  ]);

  const selectedItem = selectedItemId ? items.find((item) => item.id === selectedItemId) || null : null;
  const validStone = selectedItem && selectedStoneRarity ? selectedStoneRarity : null;

  return {
    embeds: [buildOverviewEmbed(user, items, stoneCounts, selectedItem, validStone)],
    components: buildComponents(items, stoneCounts, selectedItem, validStone),
  };
}

async function performUpgrade(userId, guildId, itemId, stoneRarity) {
  const session = await mongoose.startSession();
  session.startTransaction();
  let transactionCommitted = false;

  try {
    const itemDoc = await Item.findOne({
      _id: itemId,
      userId,
      guildId,
      $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
    }).session(session);
    if (!itemDoc) throw new Error('ITEM_NOT_FOUND');

    const meta = getItemByType(itemDoc.type);
    if (!meta?.slot || !meta?.stat) throw new Error('INVALID_ITEM');

    const oldUpgradeLevel = Math.max(itemDoc.upgradeLevel || 0, 0);
    if (oldUpgradeLevel >= MAX_EQUIPMENT_UPGRADE_LEVEL) throw new Error('MAX_LEVEL');

    const upgradeInfo = getEquipmentUpgradeInfo(oldUpgradeLevel, {
      ...meta,
      itemLevel: itemDoc.itemLevel || 1,
    });
    if (!upgradeInfo) throw new Error('NO_UPGRADE_INFO');

    if (!UPGRADE_STONE_RARITIES[stoneRarity]) throw new Error('INVALID_STONE');

    const stoneItem = await Item.findOne({
      userId,
      guildId,
      type: getUpgradeStoneType(stoneRarity),
      itemLevel: 0,
    }).session(session);

    if (!stoneItem || (stoneItem.quantity || 0) < upgradeInfo.stoneCost) {
      throw new Error('NOT_ENOUGH_STONE');
    }

    stoneItem.quantity -= upgradeInfo.stoneCost;
    const successBonus = getUpgradeStoneSuccessBonus(stoneRarity);
    const finalSuccessRate = Math.min(95, upgradeInfo.successRate + successBonus);
    const success = Math.random() * 100 < finalSuccessRate;
    let downgraded = false;

    if (success) {
      itemDoc.upgradeLevel = oldUpgradeLevel + 1;
    } else if (oldUpgradeLevel > 0 && Math.random() * 100 < EQUIPMENT_DOWNGRADE_RATE_ON_FAIL) {
      const downgradeLevels = Math.random() < 0.5 ? 1 : 2;
      itemDoc.upgradeLevel = Math.max(0, oldUpgradeLevel - downgradeLevels);
      downgraded = true;
    }

    const operations = [itemDoc.save({ session })];
    if (stoneItem.quantity <= 0) operations.push(stoneItem.deleteOne({ session }));
    else operations.push(stoneItem.save({ session }));
    await Promise.all(operations);

    await session.commitTransaction();
    transactionCommitted = true;

    return {
      item: itemDoc,
      meta,
      success,
      downgraded,
      upgradeInfo: { ...upgradeInfo, finalSuccessRate },
      selectedStone: {
        rarity: stoneRarity,
        successBonus,
        label: UPGRADE_STONE_RARITIES[stoneRarity].label,
      },
      oldUpgradeLevel,
      newUpgradeLevel: itemDoc.upgradeLevel || 0,
      stoneBalance: Math.max(stoneItem.quantity || 0, 0),
    };
  } catch (error) {
    if (!transactionCommitted) await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

function buildResultEmbed(result, thumbnailUrl = null) {
  const {
    stoneBalance,
    item,
    meta,
    success,
    downgraded,
    upgradeInfo,
    selectedStone,
    oldUpgradeLevel,
    newUpgradeLevel,
  } = result;

  const statBefore = getBossItemTotalStatValue(meta, item.itemLevel || 1, oldUpgradeLevel);
  const statAfter = getBossItemTotalStatValue(meta, item.itemLevel || 1, newUpgradeLevel);
  const statLabel = getStatLabel(meta.stat);

  const embed = new EmbedBuilder()
    .setColor(success ? '#22C55E' : downgraded ? '#EF4444' : '#F59E0B')
    .setTitle(success ? 'Nâng cấp trang bị thành công' : 'Nâng cấp trang bị thất bại')
    .setDescription(
      [
        `**Trang bị:** ${meta.name}`,
        `**O:** ${getEquipmentSlotDisplay(meta.slot)}`,
        `**Cấp đồ:** \`Lv ${item.itemLevel || 1}\``,
        `**Cường hóa:** \`+${oldUpgradeLevel} -> +${newUpgradeLevel}\``,
        `**Chỉ số:** \`${statLabel} ${statBefore} -> ${statAfter}\``,
        '',
        success
          ? 'Trang bị đã hấp thụ đá nâng cấp.'
          : downgraded
            ? 'Nâng cấp thất bại và trang bị bị tụt cấp.'
            : 'Nâng cấp thất bại nhưng trang bị được giữ nguyên cấp.',
      ].join('\n')
    )
    .addFields(
      { name: 'Đá tiêu hao', value: `\`${upgradeInfo.stoneCost} đá\``, inline: true },
      { name: 'Loại đá', value: `\`${selectedStone.label} (+${selectedStone.successBonus}%)\``, inline: true },
      { name: 'Tỉ lệ thành công', value: `\`${upgradeInfo.successRate}% -> ${upgradeInfo.finalSuccessRate}%\``, inline: true },
      { name: 'Đá còn lại', value: `\`${stoneBalance} viên ${selectedStone.label}\``, inline: true }
    )
    .setFooter({ text: `Thất bại có ${EQUIPMENT_DOWNGRADE_RATE_ON_FAIL}% khả năng tụt cấp` })
    .setTimestamp();

  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
  return embed;
}

module.exports = {
  name: 'nangcaptrangbi',
  description: 'Nâng cấp trang bị boss bằng menu chọn đá',

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
    let selectedItemId = null;
    let selectedStoneRarity = null;

    await interaction.editReply(await buildUpgradeView(userId, guildId, interaction.user));
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({ time: 120000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({ content: 'Đây không phải bảng nâng cấp của bạn.', ephemeral: true });
      }

      if (i.customId === 'upgrade_equipment_close') {
        collector.stop('closed');
        return i.update({ content: 'Đã đóng bảng nâng cấp trang bị.', embeds: [], components: [] });
      }

      if (i.customId === 'upgrade_equipment_refresh') {
        return i.update(await buildUpgradeView(userId, guildId, interaction.user, selectedItemId, selectedStoneRarity));
      }

      if (i.isStringSelectMenu() && i.customId === 'upgrade_equipment_select') {
        const itemId = i.values[0];
        if (itemId === 'no_item') {
          return i.reply({ content: 'Bạn chưa có trang bị boss để nâng cấp.', ephemeral: true });
        }

        selectedItemId = itemId;
        selectedStoneRarity = null;
        return i.update(await buildUpgradeView(userId, guildId, interaction.user, selectedItemId, selectedStoneRarity));
      }

      if (i.isStringSelectMenu() && i.customId === 'upgrade_stone_select') {
        selectedStoneRarity = i.values[0];
        return i.update(await buildUpgradeView(userId, guildId, interaction.user, selectedItemId, selectedStoneRarity));
      }

      if (i.customId === 'upgrade_equipment_confirm') {
        if (!selectedItemId) {
          return i.reply({ content: 'Bạn chưa chọn trang bị.', ephemeral: true });
        }
        if (!selectedStoneRarity) {
          return i.reply({ content: 'Bạn chưa chọn loại đá nâng cấp.', ephemeral: true });
        }

        try {
          const result = await performUpgrade(userId, guildId, selectedItemId, selectedStoneRarity);
          const icon = createEquipmentIconAttachment(result.meta);
          const refreshedView = await buildUpgradeView(userId, guildId, interaction.user, selectedItemId, selectedStoneRarity);
          refreshedView.embeds.unshift(buildResultEmbed(result, icon?.url || null));
          if (icon) refreshedView.files = [icon.attachment];
          return i.update(refreshedView);
        } catch (error) {
          if (error.message === 'ITEM_NOT_FOUND') {
            selectedItemId = null;
            selectedStoneRarity = null;
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
          if (error.message === 'INVALID_STONE') {
            return i.reply({ content: 'Loại đá nâng cấp không hợp lệ.', ephemeral: true });
          }
          if (error.message === 'NOT_ENOUGH_STONE') {
            return i.reply({ content: 'Không đủ số lượng đá đã chọn để nâng cấp món này.', ephemeral: true });
          }

          console.log(error);
          return i.reply({ content: 'Đã xảy ra lỗi khi nâng cấp trang bị.', ephemeral: true });
        }
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'closed') return;
      await interaction.editReply({ components: [] }).catch(() => null);
    });
  },
};
