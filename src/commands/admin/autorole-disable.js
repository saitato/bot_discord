const { Client, Interaction, PermissionFlagsBits } = require('discord.js');
const AutoRole = require('../../models/AutoRole');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    try {
      await interaction.deferReply();

      if (!(await AutoRole.exists({ guildId: interaction.guild.id }))) {
        interaction.editReply('Vai trò tự động chưa được định cấu hình cho máy chủ này. Sử dụng `/autorole-configure` để thiết lập.');
        return;
      }

      await AutoRole.findOneAndDelete({ guildId: interaction.guild.id });
      interaction.editReply('Vai trò tự động đã bị vô hiệu hóa cho máy chủ này. Sử dụng `/autorole-configure` để thiết lập lại.');
    } catch (error) {
      console.log(error);
    }
  },

  name: 'autorole-disable',
  description: 'Disable auto-role in this server.',
  permissionsRequired: [PermissionFlagsBits.Administrator],
};
