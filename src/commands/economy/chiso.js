const {
  Client,
  Interaction,
  ApplicationCommandOptionType,
} = require('discord.js');
const { getEquippedCombatProfile } = require('../../utils/equipmentStats');
const {
  renderEquipmentBoard,
} = require('../../utils/equipmentBoard');

module.exports = {
  name: 'chiso',
  description: 'Xem chỉ số chiến đấu hiện tại của bạn hoặc người khác',
  options: [
    {
      name: 'user',
      description: 'Người dùng bạn muốn xem chỉ số.',
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
    const profile = await getEquippedCombatProfile(targetUser.id, interaction.guild.id);
    const boardAttachment = await renderEquipmentBoard(targetUser, profile);

    return interaction.editReply({
      content: `Chỉ số của **${targetUser.username}**`,
      embeds: [],
      files: [boardAttachment],
    });
  },
};
