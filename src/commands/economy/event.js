const { Client, Interaction, EmbedBuilder } = require('discord.js');
const {
  claimEventReward,
  ensureEventProgress,
} = require('../../utils/eventMissions');

function renderMission(mission) {
  const status = mission.completed ? 'Hoàn thành' : 'Đang làm';
  return `**${mission.label}**\n> Tiến độ: ${mission.progress}/${mission.target} | ${status}`;
}

module.exports = {
  name: 'event',
  description: 'Xem sự kiện trong ngày và nhận thưởng khi hoàn thành',

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

    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;

      const claimResult = await claimEventReward(userId, guildId);
      const { activeEvent, progress } = claimResult.activeEvent
        ? claimResult
        : await ensureEventProgress(userId, guildId);

      if (!activeEvent || !progress) {
        return interaction.editReply('Hôm nay chưa có event nào đang mở.');
      }

      const rewardText = progress.reward?.claimed
        ? `Đã nhận: ${progress.reward.itemName} Lv ${progress.reward.itemLevel}`
        : progress.reward?.blockedByBag
          ? 'Đã hoàn thành nhưng balo đầy, dọn ô trống rồi mở lại /event để nhận.'
          : activeEvent.reward.label;

      const embed = new EmbedBuilder()
        .setColor('#F97316')
        .setTitle(activeEvent.title)
        .setDescription(
          [
            activeEvent.description,
            '',
            `**Kết thúc:** <t:${Math.floor(new Date(activeEvent.expiresAt).getTime() / 1000)}:R>`,
            `**Thưởng:** ${rewardText}`,
          ].join('\n')
        )
        .addFields({
          name: 'Nhiệm vụ',
          value: progress.missions.map(renderMission).join('\n\n'),
          inline: false,
        })
        .setFooter({
          text: claimResult.claimed
            ? 'Bạn vừa nhận thưởng event thành công'
            : 'Hoàn thành tất cả nhiệm vụ trong ngày để nhận thưởng',
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      return interaction.editReply('Đã xảy ra lỗi khi tải event.');
    }
  },
};
