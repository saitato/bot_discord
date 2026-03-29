const { Client, Interaction, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const {
  claimCompletedMissionRewards,
  ensureDailyMissions,
  getDateKey,
} = require('../../utils/dailyMissions');

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDifficultyLabel(difficulty) {
  if (difficulty === 'easy') return 'Dễ';
  if (difficulty === 'medium') return 'Vừa';
  return 'Hiếm';
}

function renderMission(mission) {
  const status = mission.claimed
    ? 'Đã nhận'
    : mission.completed
      ? 'Hoàn thành'
      : 'Đang làm';

  return [
    `**[${getDifficultyLabel(mission.difficulty)}] ${mission.label}**`,
    `> Tiến độ: ${mission.progress}/${mission.target} | Thưởng: ${mission.reward} Wcoin + ${mission.expReward || 0} EXP | ${status}`,
  ].join('\n');
}

function getNextResetText() {
  const now = new Date();
  const nextReset = new Date(now);
  nextReset.setUTCHours(17, 0, 0, 0);

  if (now.getTime() >= nextReset.getTime()) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  }

  const diff = nextReset.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

module.exports = {
  name: 'daily',
  description: 'Nhận thưởng ngày và xem nhiệm vụ random hôm nay',

  /**
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ Chỉ dùng trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const query = {
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      };

      let user = await User.findOne(query);
      let dailyAmount = getRandom(100, 200);
      let dailyClaimed = false;
      let lucky = false;

      if (!user) {
        user = new User({
          ...query,
          balance: 0,
          lastDaily: null,
          streak: 0,
        });
      }

      const todayKey = getDateKey();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = getDateKey(yesterday);
      const lastDailyKey = user.lastDaily ? getDateKey(user.lastDaily) : null;

      if (lastDailyKey !== todayKey) {
        dailyClaimed = true;

        if (lastDailyKey === yesterdayKey) user.streak = (user.streak || 0) + 1;
        else user.streak = 1;

        dailyAmount += user.streak * 10;

        if (Math.random() < 0.05) {
          dailyAmount *= 3;
          lucky = true;
        }

        user.balance += dailyAmount;
        user.lastDaily = new Date();
        await user.save();
      } else if (user.isNew) {
        await user.save();
      }

      const createdDaily = await ensureDailyMissions(query.userId, query.guildId);
      const {
        daily,
        claimedReward,
        claimedExp,
        claimedMissions,
        xpResult,
      } = await claimCompletedMissionRewards(user);

      const activeDaily = daily || createdDaily;
      const nextResetText = getNextResetText();

      const embed = new EmbedBuilder()
        .setColor('#22C55E')
        .setTitle('🎁 Daily & Nhiệm vụ hôm nay')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setDescription(
          dailyClaimed
            ? `💰 Bạn đã nhận **${dailyAmount} Wcoin** từ daily hôm nay.`
            : `⏳ Daily hôm nay đã nhận rồi. Reset lúc **0h H+7** còn **${nextResetText}**.`
        )
        .addFields(
          { name: '💼 Số dư', value: `\`${user.balance.toLocaleString('vi-VN')} Wcoin\``, inline: true },
          { name: '🔥 Streak', value: `\`${user.streak || 0} ngày\``, inline: true },
          {
            name: '📜 Nhiệm vụ random',
            value: activeDaily.missions.map(renderMission).join('\n\n'),
            inline: false,
          }
        )
        .setFooter({ text: 'Daily reset mỗi ngày lúc 0h H+7' })
        .setTimestamp();

      if (lucky) {
        embed.addFields({
          name: '🍀 Lucky Bonus',
          value: 'Bạn đã nổ x3 daily hôm nay!',
          inline: false,
        });
      }

      if (claimedReward > 0) {
        embed.addFields({
          name: '🎉 Thưởng nhiệm vụ đã nhận',
          value: [
            `+${claimedReward.toLocaleString('vi-VN')} Wcoin`,
            `+${claimedExp.toLocaleString('vi-VN')} EXP`,
            xpResult?.levelUps?.length
              ? `Lên cấp: ${xpResult.levelUps.map((level) => `Lv ${level}`).join(', ')}`
              : null,
            ...claimedMissions,
          ].filter(Boolean).join('\n'),
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.log(error);
      return interaction.editReply('❌ Có lỗi xảy ra!');
    }
  },
};
