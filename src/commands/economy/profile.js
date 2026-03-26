const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
  EmbedBuilder,
} = require('discord.js');
const User = require('../../models/User');
const Level = require('../../models/Level');
const calculateLevelXp = require('../../utils/calculateLevelXp');

const createProgressBar = (current, total, size = 12) => {
  const safeTotal = Math.max(total, 1);
  const progress = Math.min(current / safeTotal, 1);
  const filled = Math.round(progress * size);
  const empty = size - filled;

  return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
};

const formatNumber = (value) => Number(value || 0).toLocaleString('vi-VN');

module.exports = {
  name: 'profile',
  description: 'Xem hồ sơ gồm Wcoin và level của bạn hoặc người khác',
  options: [
    {
      name: 'user',
      description: 'Người dùng bạn muốn xem hồ sơ.',
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
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const query = { userId: targetUser.id, guildId: interaction.guild.id };

    const [userData, levelData] = await Promise.all([
      User.findOne(query),
      Level.findOne(query),
    ]);

    const money = userData?.balance || 0;
    const level = levelData?.level || 0;
    const xp = levelData?.xp || 0;
    const requiredXp = calculateLevelXp(level || 1);
    const progressBar = createProgressBar(xp, requiredXp);
    const progressPercent = Math.min(
      Math.floor((xp / Math.max(requiredXp, 1)) * 100),
      100
    );
    const displayName = member?.displayName || targetUser.globalName || targetUser.username;
    const rank =
      level > 0
        ? (
            await Level.countDocuments({
              guildId: interaction.guild.id,
              $or: [
                { level: { $gt: level } },
                { level, xp: { $gt: xp } },
              ],
            })
          ) + 1
        : 'Chưa xếp hạng';
    const joinedAt = member?.joinedAt
      ? member.joinedAt.toLocaleDateString('vi-VN')
      : 'Không rõ';

    const embed = new EmbedBuilder()
      .setColor('#14B8A6')
      .setAuthor({
        name: `Hồ sơ của ${displayName}`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        [
          `**${targetUser.username}** đang phát triển rất tốt trong server này.`,
          '',
          `**Tiến độ cấp độ**`,
          `${progressBar} **${progressPercent}%**`,
          `\`${formatNumber(xp)} / ${formatNumber(requiredXp)} EXP\``,
        ].join('\n')
      )
      .addFields(
        { name: '💰 Wcoin', value: `\`${formatNumber(money)} Wcoin\``, inline: true },
        { name: '⭐ Cấp độ', value: `\`Level ${formatNumber(level)}\``, inline: true },
        { name: '🏆 Hạng server', value: `\`${typeof rank === 'number' ? `#${rank}` : rank}\``, inline: true },
        { name: '📅 Vào server', value: `\`${joinedAt}\``, inline: true }
      )
      .setFooter({ text: 'Chat nhiều hơn để kiếm thêm EXP và Wcoin' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
