const { Client, Interaction, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const Level = require('../../models/Level'); // nếu bạn lưu level

module.exports = {
  name: 'sodu',
  description: "Xem số dư Wcoin + rank của bạn/của người khác",
  options: [
    {
      name: 'user',
      description: 'Người dùng bạn muốn xem số dư.',
      type: ApplicationCommandOptionType.User,
    },
  ],

  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ Chỉ dùng trong server!',
        ephemeral: true,
      });
    }

    const targetUserId = interaction.options.get('user')?.value || interaction.member.id;

    await interaction.deferReply({ ephemeral: true });

    const user = await User.findOne({ userId: targetUserId, guildId: interaction.guild.id });
    if (!user) {
      return interaction.editReply(`<@${targetUserId}> chưa có hồ sơ.`);
    }

    // Lấy level nếu có
    let level = await Level.findOne({ userId: targetUserId, guildId: interaction.guild.id });
    level = level?.level || 0;

    const member = interaction.guild.members.cache.get(targetUserId);

    const embed = new EmbedBuilder()
      .setColor('#1ABC9C') // màu xanh game-style
      .setAuthor({
        name: member?.user.username || 'Người dùng',
        iconURL: member?.user.displayAvatarURL(),
      })
      .setTitle('💳 Hồ sơ tài khoản Wcoin')
      .setThumbnail(member?.user.displayAvatarURL())
      .addFields(
        { name: '💰 Wcoin', value: `**${user.balance || 0} Wcoin**`, inline: true },
        { name: '🏅 Rank/Level', value: `**${level}**`, inline: true }
      )
      .setFooter({ text: '💎 Xem profile game-style của bạn hoặc người khác' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};