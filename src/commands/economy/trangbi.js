const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Interaction,
  StringSelectMenuBuilder,
} = require('discord.js');
const Item = require('../../models/Item');
const Level = require('../../models/Level');
const {
  EQUIPMENT_SLOTS,
  getBossItemStatValue,
  getCombatStatLabel,
  getEquipmentSlotLabel,
  getItemByType,
  getSetLabel,
} = require('../../utils/economyItems');
const {
  getEquippedCombatProfile,
  getOrCreateEquipment,
} = require('../../utils/equipmentStats');

function formatEquippedItem(entry, userLevel) {
  if (!entry) return '`Chưa mặc`';

  const baseStatValue = getBossItemStatValue(entry.meta, entry.itemLevel || 1);
  const upgradeBonus = Math.max((entry.statValue || 0) - baseStatValue, 0);
  const requiredLevel = Math.max(entry.itemLevel || 1, 1);
  const statusLabel = userLevel >= requiredLevel ? 'Đang mặc được' : 'Chưa đủ level';

  return [
    `${entry.meta.name} \`Lv ${entry.itemLevel} +${entry.upgradeLevel || 0}\``,
    `> Set: ${getSetLabel(entry.meta.set)}`,
    `> Yêu cầu: Lv ${requiredLevel} | ${statusLabel}`,
    `> ${getCombatStatLabel(entry.meta.stat)} gốc: +${baseStatValue}`,
    `> Cường hóa: +${upgradeBonus}`,
    `> Tổng chỉ số: +${entry.statValue}`,
  ].join('\n');
}

async function getOwnedGearItems(userId, guildId) {
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

function buildSetBonusLines(activeSetBonuses) {
  if (!activeSetBonuses.length) return '`Chưa kích hoạt set`';

  return activeSetBonuses.map((bonus) => {
    const statsText = Object.entries(bonus.stats)
      .map(([stat, value]) => `${getCombatStatLabel(stat)} +${value}`)
      .join(' | ');
    return `${getSetLabel(bonus.setKey)} (${bonus.pieces} món): ${statsText}`;
  }).join('\n');
}

function buildEquipmentEmbed(user, profile) {
  const { stats, equippedItems, level, activeSetBonuses } = profile;

  return new EmbedBuilder()
    .setColor('#F59E0B')
    .setAuthor({
      name: `Trang bị của ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setDescription(
      [
        `**Level nhân vật:** \`Lv ${level}\``,
        `**Damage boss:** \`${stats.totalMin} - ${stats.totalMax}\``,
        `**Nếu crit:** \`${Math.floor(stats.totalMin * stats.critMultiplier)} - ${Math.floor(stats.totalMax * stats.critMultiplier)}\``,
        `**ATK:** \`+${stats.atk}\` | **ATK%:** \`${stats.atkPercent}%\``,
        `**HP:** \`${stats.hp}\` | **DEF:** \`${stats.def}\``,
        `**HP cơ bản:** \`${stats.hpBase}\` | **HP từ đồ:** \`+${stats.hpBonus}\``,
        `**Giảm sát thương từ DEF:** \`${stats.damageReductionPercent}%\``,
        `**Crit:** \`${stats.crit}%\` | **Crit damage:** \`${stats.critDamagePercent}%\``,
        `**Tốc đánh:** \`${stats.attackSpeed}%\` | **Hồi chiêu:** \`${stats.cooldownReduction}%\``,
        `**Né tránh:** \`${stats.dodge}%\` | **Kháng CC:** \`${stats.ccResist}%\``,
        `**Hút máu:** \`${stats.lifesteal}%\``,
        `**Xuyên giáp:** \`${stats.armorPen}%\` | **ST kỹ năng:** \`${stats.skillDamage}%\``,
      ].join('\n')
    )
    .addFields(
      { name: 'Set đang kích hoạt', value: buildSetBonusLines(activeSetBonuses), inline: false },
      { name: 'Vũ khí', value: formatEquippedItem(equippedItems.weapon, level), inline: false },
      { name: 'Găng tay', value: formatEquippedItem(equippedItems.gloves, level), inline: false },
      { name: 'Mũ', value: formatEquippedItem(equippedItems.helmet, level), inline: false },
      { name: 'Giày', value: formatEquippedItem(equippedItems.boots, level), inline: false },
      { name: 'Áo', value: formatEquippedItem(equippedItems.armor, level), inline: false },
      { name: 'Nhẫn', value: formatEquippedItem(equippedItems.ring), inline: false }
    )
    .setFooter({ text: 'Mỗi món đồ hiển thị stat gốc theo level, cường hóa, màu độ hiếm và set' })
    .setTimestamp();
}

function buildComponents(gearItems) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('equip_select')
    .setPlaceholder(
      gearItems.length > 0
        ? 'Chon trang bi cua ban de mac'
        : 'Ban chua co do boss de trang bi'
    )
    .setDisabled(gearItems.length === 0);

  if (gearItems.length > 0) {
    select.addOptions(
      gearItems.slice(0, 25).map((item) => {
        const meta = getItemByType(item.type);
        const baseStatValue = getBossItemStatValue(meta, item.itemLevel || 1);
        return {
          label: `${meta.name} Lv ${item.itemLevel || 1} +${item.upgradeLevel || 0}`.slice(0, 100),
          description: `${getEquipmentSlotLabel(meta.slot)} | ${getCombatStatLabel(meta.stat)} +${baseStatValue} | ${getSetLabel(meta.set)}`.slice(0, 100),
          value: item.id,
        };
      })
    );
  } else {
    select.addOptions([
      {
        label: 'Không có đồ boss',
        description: 'Hãy đánh boss để nhận trang bị',
        value: 'no_item',
      },
    ]);
  }

  const removeRows = [
    EQUIPMENT_SLOTS.slice(0, 3),
    EQUIPMENT_SLOTS.slice(3),
  ].map((slots) =>
    new ActionRowBuilder().addComponents(
      slots.map((slot) =>
        new ButtonBuilder()
          .setCustomId(`unequip_${slot}`)
          .setLabel(`Thao ${getEquipmentSlotLabel(slot)}`)
          .setStyle(ButtonStyle.Secondary)
      )
    )
  );

  return [
    new ActionRowBuilder().addComponents(select),
    ...removeRows,
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('equip_refresh')
        .setLabel('Lam moi')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('equip_close')
        .setLabel('Dong')
        .setStyle(ButtonStyle.Danger)
    ),
  ];
}

async function buildEquipmentView(userId, guildId, user) {
  const [profile, gearItems] = await Promise.all([
    getEquippedCombatProfile(userId, guildId),
    getOwnedGearItems(userId, guildId),
  ]);

  return {
    embeds: [buildEquipmentEmbed(user, profile)],
    components: buildComponents(gearItems),
  };
}

module.exports = {
  name: 'trangbi',
  description: 'Mac hoac thao do boss bang giao dien chon nhanh',

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Chi dung trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const initialView = await buildEquipmentView(userId, guildId, interaction.user);

    await interaction.editReply(initialView);
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({
          content: 'Day khong phai bang trang bi cua ban.',
          ephemeral: true,
        });
      }

      if (i.customId === 'equip_close') {
        collector.stop('closed');
        return i.update({
          content: 'Da dong bang trang bi.',
          embeds: [],
          components: [],
        });
      }

      if (i.customId === 'equip_refresh') {
        const refreshedView = await buildEquipmentView(userId, guildId, interaction.user);
        return i.update(refreshedView);
      }

      if (i.isStringSelectMenu() && i.customId === 'equip_select') {
        const itemId = i.values[0];
        if (itemId === 'no_item') {
          return i.reply({
            content: 'Ban chua co do boss de mac.',
            ephemeral: true,
          });
        }

        const item = await Item.findOne({
          _id: itemId,
          userId,
          guildId,
          quantity: { $gt: 0 },
        });

        if (!item) {
          const refreshedView = await buildEquipmentView(userId, guildId, interaction.user);
          return i.update(refreshedView);
        }

        const meta = getItemByType(item.type);
        if (!meta?.slot || !meta?.stat) {
          return i.reply({
            content: 'Item nay khong the trang bi.',
            ephemeral: true,
          });
        }

        const levelData = await Level.findOne({ userId, guildId });
        const userLevel = Math.max(levelData?.level || 1, 1);
        const requiredLevel = Math.max(item.itemLevel || 1, 1);
        if (userLevel < requiredLevel) {
          return i.reply({
            content: `Ban can dat Lv ${requiredLevel} moi mac duoc mon do nay. Hien tai ban dang Lv ${userLevel}.`,
            ephemeral: true,
          });
        }

        const equipment = await getOrCreateEquipment(userId, guildId);
        equipment[meta.slot] = {
          itemId: item.id,
          type: item.type,
          itemLevel: item.itemLevel || 0,
        };
        await equipment.save();

        const refreshedView = await buildEquipmentView(userId, guildId, interaction.user);
        return i.update(refreshedView);
      }

      if (i.customId.startsWith('unequip_')) {
        const slot = i.customId.replace('unequip_', '');
        if (!EQUIPMENT_SLOTS.includes(slot)) {
          return i.reply({
            content: 'O trang bi khong hop le.',
            ephemeral: true,
          });
        }

        const equipment = await getOrCreateEquipment(userId, guildId);
        equipment[slot] = {
          itemId: null,
          type: null,
          itemLevel: 0,
        };
        await equipment.save();

        const refreshedView = await buildEquipmentView(userId, guildId, interaction.user);
        return i.update(refreshedView);
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
