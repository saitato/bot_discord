const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
} = require('discord.js');
const {
  getBossItemStatValue,
  getCombatStatLabel,
  getEquipmentSlotLabel,
  getRarityLabel,
  getSetLabel,
} = require('../../utils/economyItems');
const { getEquippedCombatProfile } = require('../../utils/equipmentStats');

function buildEquippedLine(entry) {
  if (!entry) return '`Chưa trang bị`';

  const baseStatValue = getBossItemStatValue(entry.meta, entry.itemLevel || 1);
  const upgradeBonus = Math.max((entry.statValue || 0) - baseStatValue, 0);

  return [
    `${entry.meta.name} \`Lv ${entry.itemLevel} +${entry.upgradeLevel || 0}\``,
    `> Ô: ${getEquipmentSlotLabel(entry.meta.slot)} | Độ hiếm: ${getRarityLabel(entry.meta.rarity)} | Set: ${getSetLabel(entry.meta.set)}`,
    `> ${getCombatStatLabel(entry.meta.stat)} gốc: +${baseStatValue}`,
    `> Cường hóa: +${upgradeBonus}`,
    `> Tổng: +${entry.statValue}`,
  ].join('\n');
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
    const profile = await getEquippedCombatProfile(targetUser.id, interaction.guild.id);
    const { stats, level, equippedItems, activeSetBonuses } = profile;

    const embed = new EmbedBuilder()
      .setColor('#8B5CF6')
      .setAuthor({
        name: `Chỉ số của ${targetUser.username}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
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
        { name: 'Vũ khí', value: buildEquippedLine(equippedItems.weapon), inline: false },
        { name: 'Gang tay', value: buildEquippedLine(equippedItems.gloves), inline: false },
        { name: 'Mũ', value: buildEquippedLine(equippedItems.helmet), inline: false },
        { name: 'Giày', value: buildEquippedLine(equippedItems.boots), inline: false },
        { name: 'Áo', value: buildEquippedLine(equippedItems.armor), inline: false },
        { name: 'Nhẫn', value: buildEquippedLine(equippedItems.ring), inline: false }
      )
      .setFooter({ text: 'Chỉ số món đồ gồm stat gốc theo level, cộng thêm từ cường hóa và tổng sau cùng' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
