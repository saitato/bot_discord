const {
  ApplicationCommandOptionType,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const WelcomeCardConfig = require('../../models/WelcomeCardConfig');
const { normalizeTemplate } = require('../../utils/welcomeCard');

const REQUIRED_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.AttachFiles,
];

module.exports = {
  name: 'byebye',
  description: 'Cài đặt ảnh và kênh tạm biệt khi thành viên rời server.',
  options: [
    {
      name: 'channel',
      description: 'Kênh bot sẽ gửi ảnh byebye',
      type: ApplicationCommandOptionType.Channel,
      required: true,
      channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
    },
    {
      name: 'image',
      description: 'Tải ảnh lên trực tiếp từ Discord để làm nền',
      type: ApplicationCommandOptionType.Attachment,
      required: true,
    },
    {
      name: 'message',
      description: 'Dùng {user}, {guild}, {count}, {tag}, id:123 để gọi kênh, /n để xuống dòng',
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],

  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: 'Chỉ dùng lệnh này trong server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = interaction.options.getChannel('channel');
      const image = interaction.options.getAttachment('image');
      const message = normalizeTemplate(
        interaction.options.getString('message')
        || 'Tạm biệt {user}. Cảm ơn bạn đã đồng hành cùng {guild}.'
      );

      if (!channel?.isTextBased()) {
        return interaction.editReply('Kênh đã chọn không hỗ trợ gửi tin nhắn.');
      }

      if (!image?.contentType?.startsWith('image/')) {
        return interaction.editReply('File bạn tải lên phải là ảnh.');
      }

      const botMember = interaction.guild.members.me;
      const missingPermissions = REQUIRED_CHANNEL_PERMISSIONS.filter(
        (permission) => !channel.permissionsFor(botMember)?.has(permission)
      );

      if (missingPermissions.length) {
        return interaction.editReply(
          `Bot chưa đủ quyền ở kênh ${channel}. Cần bật: ${missingPermissions.join(', ')}`
        );
      }

      const config = await WelcomeCardConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        {
          $set: {
            guildId: interaction.guild.id,
            'byebye.channelId': channel.id,
            'byebye.backgroundImageUrl': image.url,
            'byebye.message': message,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      return interaction.editReply(
        [
          'Đã lưu cấu hình `byebye`.',
          `Kênh: ${channel}`,
          `Ảnh nền: ${config.byebye.backgroundImageUrl}`,
          `Message: ${config.byebye.message}`,
        ].join('\n')
      );
    } catch (error) {
      console.log(`Error /byebye: ${error}`);
      return interaction.editReply('Không thể lưu cấu hình byebye.');
    }
  },
};
