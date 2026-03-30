const {
  Client,
  Interaction,
} = require('discord.js');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const {
  getInventorySlots,
} = require('../../utils/economyItems');
const {
  renderInventoryBoard,
} = require('../../utils/inventoryBoard');

module.exports = {
  name: 'balo',
  description: 'Xem ba lô item của bạn',

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

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.user;
    const query = { userId: targetUser.id, guildId: interaction.guild.id };

    await Item.deleteMany({
      ...query,
      expiresAt: { $gt: 0, $lte: Date.now() },
    });

    const [items, bagData] = await Promise.all([
      Item.find({
        ...query,
        $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
      }).sort({ createdAt: 1 }),
      Bag.findOne(query),
    ]);

    const bagLevel = Math.max(bagData?.level || 1, 1);
    const totalSlots = getInventorySlots(bagLevel);
    const usedSlots = items.length;
    const boardAttachment = await renderInventoryBoard(targetUser, items, {
      bagLevel,
      usedSlots,
      totalSlots,
    });

    await interaction.editReply({
      content: `Ba lô của **${targetUser.username}**`,
      embeds: [],
      files: [boardAttachment],
    });
  },
};
