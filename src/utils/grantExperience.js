const Level = require('../models/Level');
const calculateLevelXp = require('./calculateLevelXp');

async function grantExperience(userId, guildId, amount = 0) {
  const xpGained = Math.max(Math.floor(Number(amount) || 0), 0);

  let levelData = await Level.findOne({ userId, guildId });
  if (!levelData) {
    levelData = new Level({
      userId,
      guildId,
      level: 1,
      xp: 0,
    });
  }

  if (!levelData.level || levelData.level < 1) {
    levelData.level = 1;
  }

  if (xpGained <= 0) {
    return {
      xpGained: 0,
      levelUps: [],
      level: levelData.level,
      xp: levelData.xp,
      requiredXp: calculateLevelXp(levelData.level),
    };
  }

  levelData.xp += xpGained;
  const levelUps = [];

  while (levelData.xp >= calculateLevelXp(levelData.level)) {
    levelData.xp -= calculateLevelXp(levelData.level);
    levelData.level += 1;
    levelUps.push(levelData.level);
  }

  await levelData.save();

  return {
    xpGained,
    levelUps,
    level: levelData.level,
    xp: levelData.xp,
    requiredXp: calculateLevelXp(levelData.level),
  };
}

module.exports = grantExperience;
