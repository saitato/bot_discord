const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
} = require('discord.js');
const { getEquipmentSlotLabel } = require('../../utils/economyItems');
const { getEquippedCombatProfile } = require('../../utils/equipmentStats');

function buildEquippedLine(entry) {
  if (!entry) return '`Chưa trang bị`';
  const statName = entry.meta.stat === 'crit' ? 'Crit' : entry.meta.stat === 'armor_pen' ? 'Xuyên giáp' : 'ATK';
  return `${entry.meta.name} \`Lv ${entry.itemLevel} +${entry.upgradeLevel || 0}\` • ${getEquipmentSlotLabel(entry.meta.slot)} • ${statName} +${entry.statValue}`;
}

module.exports = {
  name: 'chiso',
  description: 'Xem chỉ số chiến đấu hiện tại của bạn hoặc người khác',
  options: [
    {
      name: 'user',
      description: 'Người dùng bạn muốn xem chỉ số.',
      type: ApplicationCommandOptionType.User,
    },
  ],

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

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const profile = await getEquippedCombatProfile(
      targetUser.id,
      interaction.guild.id
    );

    const { stats, level, equippedItems } = profile;

    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setAuthor({
        name: `Chỉ số của ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        [
          `**Level nhân vật:** \`Lv ${level}\``,
          `**Sát thương đánh boss:** \`${stats.totalMin} - ${stats.totalMax}\``,
          `**Nếu chí mạng:** \`${Math.floor(stats.totalMin * stats.critMultiplier)} - ${Math.floor(stats.totalMax * stats.critMultiplier)}\``,
        ].join('\n')
      )
      .addFields(
        { name: 'ATK cộng thêm', value: `\`+${stats.atk}\``, inline: true },
        { name: 'Crit', value: `\`${stats.crit}%\``, inline: true },
        { name: 'Xuyên giáp', value: `\`+${stats.armorPen}\``, inline: true },
        { name: 'Vũ khí', value: buildEquippedLine(equippedItems.weapon), inline: false },
        { name: 'Áo', value: buildEquippedLine(equippedItems.armor), inline: false },
        { name: 'Găng tay', value: buildEquippedLine(equippedItems.gloves), inline: false },
        { name: 'Mũ', value: buildEquippedLine(equippedItems.helmet), inline: false },
        { name: 'Giày', value: buildEquippedLine(equippedItems.boots), inline: false }
      )
      .setFooter({ text: 'ATK và Xuyên giáp cộng thẳng vào damage, Crit dùng làm tỉ lệ chí mạng' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
