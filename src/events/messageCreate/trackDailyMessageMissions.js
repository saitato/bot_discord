const { Client, Message } = require('discord.js');
const { trackMessageMissionProgress } = require('../../utils/dailyMissions');

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
  await trackMessageMissionProgress(message);
};
