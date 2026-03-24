const { Client, Interaction, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

module.exports = {
  name: 'money',
  description: 'Xem Wcoin của bạn hoặc người khác',
  options: [
    {
      name: 'target-user',
      description: 'Bạn muốn xem Wcoin của ai?',
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
        content: '❌ Chỉ dùng trong server!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const mentionedUser = interaction.options.getUser('target-user') || interaction.user;
    const query = { userId: mentionedUser.id, guildId: interaction.guild.id };
    const user = await User.findOne(query);

    const money = user?.balance || 0;

    const embed = new EmbedBuilder()
      .setTitle('💰 Wcoin Balance')
      .setColor('Gold')
      .setThumbnail(mentionedUser.displayAvatarURL({ dynamic: true }))
      .setDescription(`**${mentionedUser.username}** đang có **${money.toLocaleString()} Wcoin**`)
      .setTimestamp();

    interaction.editReply({ embeds: [embed] });
  },
};