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
const {
  EQUIPMENT_SLOTS,
  getBossItemStatValue,
  getEquipmentSlotLabel,
  getItemByType,
} = require('../../utils/economyItems');
const {
  getEquippedCombatProfile,
  getOrCreateEquipment,
} = require('../../utils/equipmentStats');

function getStatLabel(stat) {
  if (stat === 'crit') return 'Crit';
  if (stat === 'armor_pen') return 'Xuyên giáp';
  return 'ATK';
}

function formatEquippedItem(entry) {
  if (!entry) return '`Chưa mặc`';
  return `${entry.meta.name} \`Lv ${entry.itemLevel} +${entry.upgradeLevel || 0}\` • ${getStatLabel(entry.meta.stat)} +${entry.statValue}`;
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

function buildEquipmentEmbed(user, profile) {
  const { stats, equippedItems, level } = profile;

  return new EmbedBuilder()
    .setColor('#F59E0B')
    .setAuthor({
      name: `Trang bị của ${user.username}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setDescription(
      [
        `**Level nhân vật:** \`Lv ${level}\``,
        `**Sát thương hiện tại:** \`${stats.totalMin} - ${stats.totalMax}\``,
        `**Nếu chí mạng:** \`${Math.floor(stats.totalMin * stats.critMultiplier)} - ${Math.floor(stats.totalMax * stats.critMultiplier)}\``,
        '',
        `**ATK:** \`+${stats.atk}\` • **Crit:** \`${stats.crit}%\` • **Xuyên giáp:** \`+${stats.armorPen}\``,
      ].join('\n')
    )
    .addFields(
      { name: 'Vũ khí', value: formatEquippedItem(equippedItems.weapon), inline: false },
      { name: 'Áo', value: formatEquippedItem(equippedItems.armor), inline: false },
      { name: 'Găng tay', value: formatEquippedItem(equippedItems.gloves), inline: false },
      { name: 'Mũ', value: formatEquippedItem(equippedItems.helmet), inline: false },
      { name: 'Giày', value: formatEquippedItem(equippedItems.boots), inline: false }
    )
    .setFooter({ text: 'Chọn đồ để mặc hoặc bấm nút để tháo riêng từng ô' })
    .setTimestamp();
}

function buildComponents(gearItems) {
  const select = new StringSelectMenuBuilder()
    .setCustomId('equip_select')
    .setPlaceholder(
      gearItems.length > 0
        ? 'Chọn trang bị của bạn để mặc'
        : 'Bạn chưa có đồ boss để trang bị'
    )
    .setDisabled(gearItems.length === 0);

  if (gearItems.length > 0) {
    select.addOptions(
      gearItems.slice(0, 25).map((item) => {
        const meta = getItemByType(item.type);
        const statValue = getBossItemStatValue(meta, item.itemLevel || 10);
        return {
          label: `${meta.name} Lv ${item.itemLevel || 0} +${item.upgradeLevel || 0}`.slice(0, 100),
          description: `${getEquipmentSlotLabel(meta.slot)} | ${getStatLabel(meta.stat)} +${statValue} | SL ${item.quantity}`.slice(0, 100),
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

  const removeButtons = EQUIPMENT_SLOTS.map((slot) =>
    new ButtonBuilder()
      .setCustomId(`unequip_${slot}`)
      .setLabel(`Tháo ${getEquipmentSlotLabel(slot)}`)
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(removeButtons),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('equip_refresh')
        .setLabel('Làm mới')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('equip_close')
        .setLabel('Đóng')
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
  description: 'Mặc hoặc tháo đồ boss bằng giao diện chọn nhanh',

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
    const initialView = await buildEquipmentView(userId, guildId, interaction.user);

    await interaction.editReply(initialView);
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      time: 120000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({
          content: 'Đây không phải bảng trang bị của bạn.',
          ephemeral: true,
        });
      }

      if (i.customId === 'equip_close') {
        collector.stop('closed');
        return i.update({
          content: 'Đã đóng bảng trang bị.',
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
            content: 'Bạn chưa có đồ boss để mặc.',
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
            content: 'Item này không thể trang bị.',
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
            content: 'Ô trang bị không hợp lệ.',
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
