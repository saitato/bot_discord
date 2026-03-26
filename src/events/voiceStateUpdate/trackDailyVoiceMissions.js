const { VoiceState } = require('discord.js');
const { addMissionProgress } = require('../../utils/dailyMissions');

const voiceSessions = new Map();

/**
 * @param {import('discord.js').Client} client
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 */
module.exports = async (client, oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;
  const key = `${member.guild.id}:${userId}`;

  if (!oldState.channelId && newState.channelId) {
    voiceSessions.set(key, Date.now());
    return;
  }

  if (oldState.channelId && !newState.channelId) {
    const joinedAt = voiceSessions.get(key);
    if (!joinedAt) return;

    voiceSessions.delete(key);

    const minutesInVoice = Math.floor((Date.now() - joinedAt) / (1000 * 60));
    if (minutesInVoice > 0) {
      await addMissionProgress(userId, member.guild.id, 'voice_minutes', minutesInVoice);
    }
  }
};
