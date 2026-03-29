const DailyMission = require('../models/DailyMission');
const { addEventMissionProgress } = require('./eventMissions');
const grantExperience = require('./grantExperience');

const DAILY_TIMEZONE = 'Asia/Saigon';
const MESSAGE_MISSION_COOLDOWN_MS = 5 * 60 * 1000;

const MISSION_POOLS = {
  easy: [
    {
      missionId: 'voice_easy_10',
      type: 'voice_minutes',
      label: 'Ngồi voice đủ 10 phút',
      target: 10,
      reward: 150,
      expReward: 20,
    },
    {
      missionId: 'game_easy_1',
      type: 'play_game',
      label: 'Chơi Bầu cua hoặc Tài xỉu 1 lần',
      target: 1,
      reward: 180,
      expReward: 24,
    },
    {
      missionId: 'shop_easy_1',
      type: 'buy_item',
      label: 'Mua 1 item trong /shop',
      target: 1,
      reward: 200,
      expReward: 26,
    },
    {
      missionId: 'message_easy_20',
      type: 'message_count',
      label: 'Gửi 20 tin nhắn hợp lệ',
      target: 20,
      reward: 220,
      expReward: 28,
    },
    {
      missionId: 'win_easy_1',
      type: 'win_game',
      label: 'Thắng 1 game bất kỳ',
      target: 1,
      reward: 240,
      expReward: 30,
    },
  ],
  medium: [
    {
      missionId: 'voice_medium_30',
      type: 'voice_minutes',
      label: 'Ngồi voice đủ 30 phút',
      target: 30,
      reward: 350,
      expReward: 38,
    },
    {
      missionId: 'game_medium_3',
      type: 'play_game',
      label: 'Chơi Bầu cua hoặc Tài xỉu 3 lần',
      target: 3,
      reward: 400,
      expReward: 42,
    },
    {
      missionId: 'shop_medium_2',
      type: 'buy_item',
      label: 'Mua 2 item trong /shop',
      target: 2,
      reward: 450,
      expReward: 46,
    },
    {
      missionId: 'message_medium_50',
      type: 'message_count',
      label: 'Gửi 50 tin nhắn hợp lệ',
      target: 50,
      reward: 500,
      expReward: 50,
    },
    {
      missionId: 'win_medium_2',
      type: 'win_game',
      label: 'Thắng 2 game bất kỳ',
      target: 2,
      reward: 520,
      expReward: 54,
    },
  ],
  rare: [
    {
      missionId: 'voice_rare_60',
      type: 'voice_minutes',
      label: 'Ngồi voice đủ 60 phút',
      target: 60,
      reward: 700,
      expReward: 62,
    },
    {
      missionId: 'game_rare_5',
      type: 'play_game',
      label: 'Chơi Bầu cua hoặc Tài xỉu 5 lần',
      target: 5,
      reward: 750,
      expReward: 68,
    },
    {
      missionId: 'shop_rare_3',
      type: 'buy_item',
      label: 'Mua 3 item trong /shop',
      target: 3,
      reward: 800,
      expReward: 72,
    },
    {
      missionId: 'message_rare_100',
      type: 'message_count',
      label: 'Gửi 100 tin nhắn hợp lệ',
      target: 100,
      reward: 900,
      expReward: 78,
    },
    {
      missionId: 'win_rare_5',
      type: 'win_game',
      label: 'Thắng 5 game bất kỳ',
      target: 5,
      reward: 950,
      expReward: 84,
    },
  ],
};

function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createMission(mission, difficulty) {
  return {
    ...mission,
    difficulty,
    progress: 0,
    completed: false,
    claimed: false,
  };
}

function generateMissions() {
  const easy = shuffle(MISSION_POOLS.easy).slice(0, 2).map((mission) => createMission(mission, 'easy'));
  const medium = createMission(shuffle(MISSION_POOLS.medium)[0], 'medium');
  const rare = createMission(shuffle(MISSION_POOLS.rare)[0], 'rare');

  return [...easy, medium, rare];
}

async function ensureDailyMissions(userId, guildId) {
  const dateKey = getDateKey();
  let daily = await DailyMission.findOne({ userId, guildId, dateKey });

  if (!daily) {
    daily = await DailyMission.create({
      userId,
      guildId,
      dateKey,
      missions: generateMissions(),
    });
  }

  return daily;
}

async function addMissionProgress(userId, guildId, type, amount = 1) {
  const daily = await ensureDailyMissions(userId, guildId);
  let changed = false;

  for (const mission of daily.missions) {
    if (mission.type !== type || mission.claimed) continue;

    const nextProgress = Math.min(mission.progress + amount, mission.target);
    if (nextProgress === mission.progress) continue;

    mission.progress = nextProgress;
    mission.completed = mission.progress >= mission.target;
    changed = true;
  }

  if (changed) {
    await daily.save();
  }

  await addEventMissionProgress(userId, guildId, type, amount);

  return daily;
}

async function claimCompletedMissionRewards(user) {
  const daily = await ensureDailyMissions(user.userId, user.guildId);
  const claimable = daily.missions.filter((mission) => mission.completed && !mission.claimed);

  if (!claimable.length) {
    return { daily, claimedReward: 0, claimedExp: 0, claimedMissions: [], xpResult: null };
  }

  const claimedReward = claimable.reduce((sum, mission) => sum + mission.reward, 0);
  const claimedExp = claimable.reduce((sum, mission) => sum + (mission.expReward || 0), 0);

  claimable.forEach((mission) => {
    mission.claimed = true;
  });

  user.balance += claimedReward;
  const xpResult = await grantExperience(user.userId, user.guildId, claimedExp);
  await Promise.all([daily.save(), user.save()]);

  return {
    daily,
    claimedReward,
    claimedExp,
    claimedMissions: claimable.map((mission) => mission.label),
    xpResult,
  };
}

async function trackMessageMissionProgress(message) {
  if (!message?.inGuild?.() || message.author?.bot) return null;

  const content = message.content?.trim() || '';
  if (content.length < 5) return null;

  const daily = await ensureDailyMissions(message.author.id, message.guild.id);
  const now = new Date();

  if (
    daily.lastMessageProgressAt &&
    now.getTime() - new Date(daily.lastMessageProgressAt).getTime() < MESSAGE_MISSION_COOLDOWN_MS
  ) {
    return daily;
  }

  let changed = false;

  for (const mission of daily.missions) {
    if (mission.type !== 'message_count' || mission.claimed) continue;

    const nextProgress = Math.min(mission.progress + 1, mission.target);
    if (nextProgress === mission.progress) continue;

    mission.progress = nextProgress;
    mission.completed = mission.progress >= mission.target;
    changed = true;
  }

  if (changed) {
    daily.lastMessageProgressAt = now;
    await daily.save();
  }

  await addEventMissionProgress(message.author.id, message.guild.id, 'message_count', 1);

  return daily;
}

module.exports = {
  addMissionProgress,
  claimCompletedMissionRewards,
  ensureDailyMissions,
  getDateKey,
  trackMessageMissionProgress,
};
