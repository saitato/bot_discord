const { Client, Interaction, ApplicationCommandOptionType, Component, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const cooldowns = new Set();
module.exports = {
  name: 'noitu',
    description: "solo nối từ với bot",

  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      interaction.reply({
        content: 'Bạn chỉ có thể chạy lệnh này bên trong máy chủ.',
        ephemeral: true,
      });
      return;
    }	
     
    try {

    } catch (error) {
      console.log(`Error /robmoney: ${error}`);
    }
    return;

  }, 
};