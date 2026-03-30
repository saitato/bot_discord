const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Interaction,
  StringSelectMenuBuilder,
} = require('discord.js');
const Item = require('../../models/Item');
const Level = require('../../models/Level');
const {
  EQUIPMENT_SLOTS,
  getBossItemStatValue,
  getEquipmentSlotDisplay,
  getItemByType,
} = require('../../utils/economyItems');
const {
  getEquippedCombatProfile,
  getOrCreateEquipment,
} = require('../../utils/equipmentStats');
const {
  renderEquipmentBoard,
} = require('../../utils/equipmentBoard');

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
          description: `${getEquipmentSlotDisplay(meta.slot)} | ${baseStatValue}`.slice(0, 100),
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
          .setLabel(`Thao ${getEquipmentSlotDisplay(slot)}`)
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

  const boardAttachment = await renderEquipmentBoard(user, profile);

  return {
    content: `Trang bị của **${user.username}**`,
    embeds: [],
    files: [boardAttachment],
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
          content: 'Đây không phải bảng trang bị của bạn.',
          ephemeral: true,
        });
      }

      if (i.customId === 'equip_close') {
        collector.stop('closed');
        return i.update({
          content: 'Đã đóng bảng trang bị.',
          embeds: [],
          files: [],
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

        const levelData = await Level.findOne({ userId, guildId });
        const userLevel = Math.max(levelData?.level || 1, 1);
        const requiredLevel = Math.max(item.itemLevel || 1, 1);
        if (userLevel < requiredLevel) {
          return i.reply({
            content: `Bạn cần đạt Lv ${requiredLevel} mới mặc được món đồ này. Hiện tại bạn đang Lv ${userLevel}.`,
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
