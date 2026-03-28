const { PermissionFlagsBits } = require('discord.js');
const WelcomeCardConfig = require('../../models/WelcomeCardConfig');
const {
  buildWelcomeCard,
  createWelcomeEmbed,
  formatRichText,
} = require('../../utils/welcomeCard');

const REQUIRED_PREVIEW_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
];

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) {
    return;
  }

  const content = message.content.trim().toLowerCase();
  if (!['wwhello', 'wwbyebye'].includes(content)) {
    return;
  }

  try {
    const botMember = message.guild.members.me;
    const missingBasePermissions = REQUIRED_PREVIEW_PERMISSIONS.filter(
      (permission) => !message.channel.permissionsFor(botMember)?.has(permission)
    );

    if (missingBasePermissions.length) {
      console.log(
        `Khong preview duoc o guild ${message.guild.id}, channel ${message.channel.id}: thieu quyen ${missingBasePermissions.join(', ')}`
      );
      return;
    }

    const config = await WelcomeCardConfig.findOne({ guildId: message.guild.id });
    const mode = content === 'wwhello' ? 'hello' : 'byebye';
    const section = config?.[mode];

    if (!section?.backgroundImageUrl) {
      await message.reply(
        mode === 'hello'
          ? 'Bạn chưa cài `hello`. Hãy dùng `/hello` trước.'
          : 'Bạn chưa cài `byebye`. Hãy dùng `/byebye` trước.'
      );
      return;
    }

    const previewText = formatRichText(section.message, {
      user: message.author.username,
      guild: message.guild.name,
      server: message.guild.name,
      count: String(message.guild.memberCount),
      tag: message.author.tag,
    });

    const canAttachFiles = message.channel
      .permissionsFor(botMember)
      ?.has(PermissionFlagsBits.AttachFiles);

    if (!canAttachFiles) {
      await message.reply({
        content: `Xem trước:\n${previewText}\n\nBot đang thiếu quyền \`Attach Files\` nên chưa gửi được ảnh preview.`,
      });
      return;
    }

    const attachment = await buildWelcomeCard({
      mode,
      username: message.author.username,
      userTag: message.author.tag,
      avatarUrl: message.author.displayAvatarURL({ extension: 'png', size: 256 }),
      guildName: message.guild.name,
      memberCount: message.guild.memberCount,
      message: section.message,
      backgroundImageUrl: section.backgroundImageUrl,
    });

    await message.reply({
      embeds: [
        createWelcomeEmbed(mode, `Xem trước:\n${previewText}`, attachment.name),
      ],
      files: [attachment],
    });
  } catch (error) {
    console.log(`Error preview welcome card: ${error}`);
  }
};
