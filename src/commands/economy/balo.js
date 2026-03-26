const {
  Client,
  Interaction,
  EmbedBuilder,
} = require('discord.js');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const {
  getItemByType,
  getInventorySlots,
  formatDuration,
} = require('../../utils/economyItems');

const createSlotBar = (used, total, size = 10) => {
  const safeTotal = Math.max(total, 1);
  const filled = Math.min(Math.round((used / safeTotal) * size), size);
  return `${'▰'.repeat(filled)}${'▱'.repeat(size - filled)}`;
};

const buildItemLine = (item, index) => {
  const meta = getItemByType(item.type);
  const itemName = meta?.name || `📦 ${item.type}`;
  const quantityText = `SL: ${item.quantity}`;
  const statusText =
    item.expiresAt > 0
      ? `Hạn: ${formatDuration(item.expiresAt - Date.now())}`
      : 'Vĩnh viễn';

  return `\`${String(index + 1).padStart(2, '0')}\` ${itemName}\n> ${quantityText} • ${statusText}`;
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
          `**Kho đồ cá nhân**`,
          `${slotBar} **${usedSlots}/${totalSlots} ô**`,
          `Còn trống: **${emptySlots} ô**`,
          '',
          itemSection,
        ].join('\n')
      )
      .addFields(
        { name: '🎒 Cấp balo', value: `\`Level ${bagLevel}\``, inline: true },
        { name: '📦 Đồ đang có', value: `\`${usedSlots} loại item\``, inline: true },
        { name: '✨ Mở rộng', value: `\`Lv2-4:+1 | Lv5-8:+2 | Lv9-10:+3\``, inline: true }
      )
      .setFooter({ text: 'Level 1 có 4 ô. Lv2-4 mỗi level +1, Lv5-8 +2, Lv9-10 +3' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
