const { VoiceState, EmbedBuilder } = require('discord.js');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const Level = require('../../models/Level');
const User = require('../../models/User');

const cooldownsVoice = new Map(); // userId -> join timestamp

/**
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 */
module.exports = async (oldState, newState) => {
  const member = newState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;

  // User join VC
  if (!oldState.channel && newState.channel) {
    cooldownsVoice.set(userId, Date.now());
  }

  // User leave VC
  if (oldState.channel && !newState.channel) {
    const joinedAt = cooldownsVoice.get(userId);
    if (!joinedAt) return;

    const minutesInVC = (Date.now() - joinedAt) / (1000 * 60);
    if (minutesInVC >= 30) {
      const xpToGive = Math.floor(minutesInVC / 30) * 50; // mỗi 30p = 50 XP
      const query = { userId, guildId: oldState.guild.id };

      try {
        let level = await Level.findOne(query);
        let user = await User.findOne(query);

        if (!level) level = new Level({ ...query, xp: xpToGive, level: 1 });
        else level.xp += xpToGive;

        // Check level up
        let leveledUp = false;
        let reward = 0;
        while (level.xp >= calculateLevelXp(level.level)) {
          level.xp -= calculateLevelXp(level.level);
          level.level += 1;
          reward += level.level * 100;
          leveledUp = true;
        }

        if (!user) user = new User({ ...query, balance: reward });
        else user.balance += reward;

        await level.save();
        await user.save();

        if (leveledUp) {
          const embed = new EmbedBuilder()
            .setTitle('🎉 LEVEL UP (VC)!')
            .setColor('Purple')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setDescription(`${member} đã lên **Level ${level.level}** nhờ ngồi voice ${Math.floor(minutesInVC)} phút!`)
            .addFields({ name: '🎁 Wcoin nhận được', value: `+${reward} Wcoin`, inline: true })
            .setTimestamp();

          const defaultChannel = oldState.guild.systemChannel || oldState.guild.channels.cache.find(c => c.isTextBased());
          if (defaultChannel) defaultChannel.send({ embeds: [embed] });
        }

        cooldownsVoice.delete(userId);
      } catch (err) {
        console.log('Error giving XP from VC:', err);
        cooldownsVoice.delete(userId);
      }
    } else {
      cooldownsVoice.delete(userId);
    }
  }
};