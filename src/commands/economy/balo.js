const {
  Client,
  Interaction,
  EmbedBuilder,
} = require('discord.js');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const {
  getBossItemTotalStatValue,
  getCombatStatLabel,
  getEquipmentSlotLabel,
  getItemByType,
  getInventorySlots,
  getSetLabel,
  formatDuration,
} = require('../../utils/economyItems');

const createSlotBar = (used, total, size = 10) => {
  const safeTotal = Math.max(total, 1);
  const filled = Math.min(Math.round((used / safeTotal) * size), size);
  return `${'[#]'.repeat(filled)}${'[ ]'.repeat(size - filled)}`;
};

const buildItemLine = (item, index) => {
  const meta = getItemByType(item.type);
  const itemName = meta?.name || `Item ${item.type}`;
  const itemLevelText = item.itemLevel > 0 ? ` | Lv ${item.itemLevel}` : '';
  const upgradeText = meta?.stat ? ` | +${item.upgradeLevel || 0}` : '';
  const slotText = meta?.slot ? ` | ${getEquipmentSlotLabel(meta.slot)}` : '';
  const setText = meta?.set ? ` | Set ${getSetLabel(meta.set)}` : '';
  const statText = meta?.stat
    ? ` | ${getCombatStatLabel(meta.stat)} +${getBossItemTotalStatValue(meta, item.itemLevel || 1, item.upgradeLevel || 0)}`
    : '';
  const quantityText = `SL: ${item.quantity}`;
  const requirementText = meta?.slot ? `Yêu cầu: Lv ${Math.max(item.itemLevel || 1, 1)}` : null;
  const statusText =
    item.expiresAt > 0
      ? `Hạn: ${formatDuration(item.expiresAt - Date.now())}`
      : 'Vĩnh viễn';

  return `\`${String(index + 1).padStart(2, '0')}\` ${itemName}${itemLevelText}${upgradeText}${slotText}${setText}${statText}\n> ${[quantityText, requirementText, statusText].filter(Boolean).join(' | ')}`;
};

module.exports = {
  name: 'balo',
  description: 'Xem balo item của bạn',

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

    const targetUser = interaction.user;
    const query = { userId: targetUser.id, guildId: interaction.guild.id };

    await Item.deleteMany({
      ...query,
      expiresAt: { $gt: 0, $lte: Date.now() },
    });

    const [items, bagData] = await Promise.all([
      Item.find({
        ...query,
        $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
      }).sort({ createdAt: 1 }),
      Bag.findOne(query),
    ]);

    const bagLevel = Math.max(bagData?.level || 1, 1);
    const totalSlots = getInventorySlots(bagLevel);
    const usedSlots = items.length;
    const emptySlots = Math.max(totalSlots - usedSlots, 0);
    const slotBar = createSlotBar(usedSlots, totalSlots);

    const itemSection = items.length
      ? items.map(buildItemLine).join('\n\n')
      : [
          '**Balo đang trống**',
          '> Hãy vào `/shop` để mua item đầu tiên.',
        ].join('\n');

    const embed = new EmbedBuilder()
      .setColor('#F97316')
      .setAuthor({
        name: `Balo của ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        [
          '**Kho đồ cá nhân**',
          `${slotBar} **${usedSlots}/${totalSlots} ô**`,
          `Còn trống: **${emptySlots} ô**`,
          '',
          itemSection,
        ].join('\n')
      )
      .addFields(
        { name: 'Cấp balo', value: `\`Level ${bagLevel}\``, inline: true },
        { name: 'Loại item', value: `\`${usedSlots}\``, inline: true },
        { name: 'Mở rộng', value: '`Lv1:8 ô | Lv2-5:+3/level | Lv6-10:+4/level`', inline: true }
      )
      .setFooter({ text: 'Đồ boss hiện màu độ hiếm, set, slot và tổng chỉ số sau cường hóa' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
