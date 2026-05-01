const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
} = require('discord.js');
const { getUserActivitySummary } = require('../../utils/activityStats');
const { renderActivityStatsCard } = require('../../utils/activityStatsCard');

async function getChannelName(guild, channelId, fallbackPrefix = '#') {
  if (!channelId) return null;

  const channel = guild.channels.cache.get(channelId)
    || await guild.channels.fetch(channelId).catch(() => null);

  if (!channel) return `${fallbackPrefix}${channelId}`;
  return channel.name ? `${fallbackPrefix}${channel.name}` : `${fallbackPrefix}${channelId}`;
}

module.exports = {
  name: 'thongke',
  description: 'Xem thống kê tin nhắn và thời gian voice của bạn hoặc người khác',
  options: [
    {
      name: 'user',
      description: 'Người dùng bạn muốn xem thống kê.',
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
    const summary = await getUserActivitySummary(interaction.guild, targetUser.id);
    const topMessage = summary.topChannels.messages[0];
    const topVoice = summary.topChannels.voice[0];

    const [topMessageName, topVoiceName] = await Promise.all([
      getChannelName(interaction.guild, topMessage?.id, '#'),
      getChannelName(interaction.guild, topVoice?.id, ''),
    ]);

    const attachment = await renderActivityStatsCard(targetUser, {
      displayName: member?.displayName || targetUser.globalName || targetUser.username,
      guildName: interaction.guild.name,
      joinedAt: member?.joinedAt,
      messages: summary.messages,
      voice: summary.voice,
      ranks: summary.ranks,
      topChannels: {
        messages: topMessage ? { name: topMessageName, value: topMessage.value } : null,
        voice: topVoice ? { name: topVoiceName, value: topVoice.value } : null,
      },
      chart: summary.chart,
    });

    return interaction.editReply({
      files: [attachment],
    });
  },
};
