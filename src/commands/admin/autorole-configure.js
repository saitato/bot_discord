const { ApplicationCommandOptionType, Client, Interaction, PermissionFlagsBits } = require('discord.js');
const AutoRole = require('../../models/AutoRole');

module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      interaction.reply('Bạn chỉ có thể chạy lệnh này bên trong máy chủ.');
      return;
    }

    const targetRoleId = interaction.options.get('role').value;

    try {
      await interaction.deferReply();

      let autoRole = await AutoRole.findOne({ guildId: interaction.guild.id });

      if (autoRole) {
        if (autoRole.roleId === targetRoleId) {
          interaction.editReply('Vai trò tự động đã được định cấu hình cho vai trò đó. Để tắt chạy `/autorole-disable`');
          return;
        }

        autoRole.roleId = targetRoleId;
      } else {
        autoRole = new AutoRole({
          guildId: interaction.guild.id,
          roleId: targetRoleId,
        });
      }

      await autoRole.save();
      interaction.editReply('Autorole hiện đã được định cấu hình. Để tắt chạy `/autorole-disable`');
    } catch (error) {
      console.log(error);
    }
  },

  name: 'autorole-configure',
  description: 'Định cấu hình vai trò tự động của bạn cho máy chủ này.',
  options: [
    {
      name: 'role',
      description: 'Vai trò bạn muốn người dùng tham gia.',
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
  ],
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
};
