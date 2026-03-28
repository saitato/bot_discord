const WelcomeCardConfig = require('../../models/WelcomeCardConfig');
const {
  buildWelcomeCard,
  createWelcomeEmbed,
  formatRichText,
} = require('../../utils/welcomeCard');

module.exports = async (client, member) => {
  try {
    const config = await WelcomeCardConfig.findOne({ guildId: member.guild.id });
    if (!config?.byebye?.channelId || !config.byebye.backgroundImageUrl) {
      return;
    }

    const channel = await member.guild.channels.fetch(config.byebye.channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      return;
    }

    const attachment = await buildWelcomeCard({
      mode: 'byebye',
      username: member.user.username,
      userTag: member.user.tag,
      avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
      guildName: member.guild.name,
      memberCount: member.guild.memberCount,
      message: config.byebye.message,
      backgroundImageUrl: config.byebye.backgroundImageUrl,
    });

    const content = formatRichText(config.byebye.message, {
      user: member.user.username,
      guild: member.guild.name,
      server: member.guild.name,
      count: String(member.guild.memberCount),
      tag: member.user.tag,
    });

    await channel.send({
      embeds: [createWelcomeEmbed('byebye', content, attachment.name)],
      files: [attachment],
    });
  } catch (error) {
    console.log(`Error gui byebye card: ${error}`);
  }
};
