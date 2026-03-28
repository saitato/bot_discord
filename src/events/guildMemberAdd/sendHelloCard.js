const { PermissionFlagsBits } = require('discord.js');
const WelcomeCardConfig = require('../../models/WelcomeCardConfig');
const {
  buildWelcomeCard,
  createWelcomeEmbed,
  formatRichText,
} = require('../../utils/welcomeCard');

const REQUIRED_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.AttachFiles,
];

module.exports = async (client, member) => {
  try {
    const config = await WelcomeCardConfig.findOne({ guildId: member.guild.id });
    if (!config?.hello?.channelId || !config.hello.backgroundImageUrl) {
      return;
    }

    const channel = await member.guild.channels.fetch(config.hello.channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      return;
    }

    const botMember = member.guild.members.me;
    const missingPermissions = REQUIRED_CHANNEL_PERMISSIONS.filter(
      (permission) => !channel.permissionsFor(botMember)?.has(permission)
    );

    if (missingPermissions.length) {
      console.log(
        `Hello card khong gui duoc o guild ${member.guild.id}, channel ${channel.id}: thieu quyen ${missingPermissions.join(', ')}`
      );
      return;
    }

    const attachment = await buildWelcomeCard({
      mode: 'hello',
      username: member.user.username,
      userTag: member.user.tag,
      avatarUrl: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
      guildName: member.guild.name,
      memberCount: member.guild.memberCount,
      message: config.hello.message,
      backgroundImageUrl: config.hello.backgroundImageUrl,
    });

    const content = formatRichText(config.hello.message, {
      user: member.user.username,
      guild: member.guild.name,
      server: member.guild.name,
      count: String(member.guild.memberCount),
      tag: member.user.tag,
    });

    await channel.send({
      embeds: [createWelcomeEmbed('hello', content, attachment.name)],
      files: [attachment],
    });
  } catch (error) {
    console.log(`Error gui hello card (${member.guild.id}): ${error}`);
  }
};
