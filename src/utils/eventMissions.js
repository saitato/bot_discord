const Bag = require('../models/Bag');
const EventProgress = require('../models/EventProgress');
const GuildEvent = require('../models/GuildEvent');
const Item = require('../models/Item');
const Level = require('../models/Level');
const {
  getBossItemLevel,
  getBossLootPool,
  getInventorySlots,
} = require('./economyItems');

const EVENT_TIMEZONE = 'Asia/Saigon';

const EVENT_DEFINITIONS = {
  1: {
    eventId: 'event_1',
    title: 'Event 1 | Vượt Ải Thử',
    description: 'Hoàn thành 3 nhiệm vụ khó trong ngày để nhận 1 trang bị boss từ Hiếm trở lên.',
    missions: [
      {
        missionId: 'event1_voice_60',
        type: 'voice_minutes',
        label: 'Ngồi voice đủ 60 phút',
        target: 60,
      },
      {
        missionId: 'event1_play_8',
        type: 'play_game',
        label: 'Chơi game 8 lần',
        target: 8,
      },
      {
        missionId: 'event1_win_3',
        type: 'win_game',
        label: 'Thắng 3 game bất kỳ',
        target: 3,
      },
    ],
    reward: {
      type: 'boss_item',
      label: '1 trang bị boss Hiếm trở lên',
    },
  },
};

const EVENT_REWARD_RARITY_WEIGHTS = {
  rare: 70,
  epic: 23,
  legendary: 7,
};

function getDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getTodayEndInTimezone(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateKey = formatter.format(date);
  return new Date(`${dateKey}T16:59:59.999Z`);
}

function cloneMissions(missions) {
  return missions.map((mission) => ({
    ...mission,
    progress: 0,
    completed: false,
  }));
}

function weightedPick(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let roll = Math.random() * total;

  for (const [key, value] of entries) {
    roll -= value;
    if (roll <= 0) return key;
  }

  return entries[0]?.[0] || null;
}

async function getActiveGuildEvent(guildId) {
  return GuildEvent.findOne({
    guildId,
    dateKey: getDateKey(),
    expiresAt: { $gt: new Date() },
  });
}

async function createGuildEvent(guildId, eventIndex, createdBy) {
  const definition = EVENT_DEFINITIONS[eventIndex];
  if (!definition) {
    throw new Error('EVENT_NOT_FOUND');
  }

  const dateKey = getDateKey();
  const expiresAt = getTodayEndInTimezone();

  await EventProgress.deleteMany({ guildId, dateKey });

  const doc = await GuildEvent.findOneAndUpdate(
    { guildId, dateKey },
    {
      guildId,
      eventId: definition.eventId,
      eventIndex,
      dateKey,
      title: definition.title,
      description: definition.description,
      createdBy,
      expiresAt,
      missions: definition.missions,
      reward: definition.reward,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return doc;
}

async function resetGuildEvent(guildId) {
  const dateKey = getDateKey();
  await Promise.all([
    GuildEvent.deleteOne({ guildId, dateKey }),
    EventProgress.deleteMany({ guildId, dateKey }),
  ]);
}

async function ensureEventProgress(userId, guildId) {
  const activeEvent = await getActiveGuildEvent(guildId);
  if (!activeEvent) return { activeEvent: null, progress: null };

  let progress = await EventProgress.findOne({
    userId,
    guildId,
    eventId: activeEvent.eventId,
    dateKey: activeEvent.dateKey,
  });

  if (!progress) {
    progress = await EventProgress.create({
      userId,
      guildId,
      eventId: activeEvent.eventId,
      dateKey: activeEvent.dateKey,
      missions: cloneMissions(activeEvent.missions),
      reward: { claimed: false },
    });
  }

  return { activeEvent, progress };
}

async function addEventMissionProgress(userId, guildId, type, amount = 1) {
  const { activeEvent, progress } = await ensureEventProgress(userId, guildId);
  if (!activeEvent || !progress) return null;

  let changed = false;
  for (const mission of progress.missions) {
    if (mission.type !== type || mission.completed) continue;

    const nextProgress = Math.min(mission.progress + amount, mission.target);
    if (nextProgress === mission.progress) continue;

    mission.progress = nextProgress;
    mission.completed = mission.progress >= mission.target;
    changed = true;
  }

  if (changed) {
    await progress.save();
  }

  return progress;
}

async function claimEventReward(userId, guildId) {
  const { activeEvent, progress } = await ensureEventProgress(userId, guildId);
  if (!activeEvent || !progress) {
    return { activeEvent, progress, claimed: false, reason: 'NO_EVENT' };
  }

  if (progress.reward?.claimed) {
    return { activeEvent, progress, claimed: false, reason: 'ALREADY_CLAIMED' };
  }

  const allCompleted = progress.missions.every((mission) => mission.completed);
  if (!allCompleted) {
    return { activeEvent, progress, claimed: false, reason: 'NOT_COMPLETED' };
  }

  const rewardRarity = weightedPick(EVENT_REWARD_RARITY_WEIGHTS) || 'rare';
  const rewardPool = getBossLootPool(rewardRarity);
  const rewardItem = rewardPool[Math.floor(Math.random() * rewardPool.length)];
  if (!rewardItem) {
    return { activeEvent, progress, claimed: false, reason: 'NO_REWARD_POOL' };
  }

  const [levelData, bagData] = await Promise.all([
    Level.findOne({ userId, guildId }),
    Bag.findOne({ userId, guildId }),
  ]);
  const rewardLevel = getBossItemLevel(levelData?.level || 1);

  let existingItem = await Item.findOne({
    userId,
    guildId,
    type: rewardItem.type,
    itemLevel: rewardLevel,
  });

  if (!existingItem) {
    const totalSlots = getInventorySlots(bagData?.level || 1);
    const usedSlots = await Item.countDocuments({
      userId,
      guildId,
      $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
    });

    if (usedSlots >= totalSlots) {
      progress.reward = {
        claimed: false,
        rarity: rewardRarity,
        itemType: rewardItem.type,
        itemName: rewardItem.name,
        itemLevel: rewardLevel,
        blockedByBag: true,
      };
      await progress.save();
      return { activeEvent, progress, claimed: false, reason: 'BAG_FULL' };
    }
  }

  if (existingItem) {
    existingItem.quantity += 1;
    await existingItem.save();
  } else {
    existingItem = await Item.create({
      userId,
      guildId,
      type: rewardItem.type,
      itemLevel: rewardLevel,
      quantity: 1,
      expiresAt: 0,
    });
  }

  progress.reward = {
    claimed: true,
    rarity: rewardRarity,
    itemType: rewardItem.type,
    itemName: rewardItem.name,
    itemLevel: rewardLevel,
    blockedByBag: false,
  };
  await progress.save();

  return {
    activeEvent,
    progress,
    claimed: true,
    reward: progress.reward,
  };
}

module.exports = {
  EVENT_DEFINITIONS,
  claimEventReward,
  createGuildEvent,
  resetGuildEvent,
  ensureEventProgress,
  getActiveGuildEvent,
  addEventMissionProgress,
};
