const ActivityStat = require('../models/ActivityStat');

const TIMEZONE = 'Asia/Ho_Chi_Minh';
const voiceSessions = new Map();

function getDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getDateKeys(days, endDate = new Date()) {
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(getDateKey(addDays(endDate, -i)));
  }
  return keys;
}

function getSessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

async function incrementActivity({ guildId, userId, dateKey, messageCount = 0, voiceSeconds = 0, channelId = null, voiceChannelId = null }) {
  const inc = {};
  if (messageCount) inc.messageCount = messageCount;
  if (voiceSeconds) inc.voiceSeconds = voiceSeconds;
  if (messageCount && channelId) inc[`channelMessages.${channelId}`] = messageCount;
  if (voiceSeconds && voiceChannelId) inc[`voiceChannelSeconds.${voiceChannelId}`] = voiceSeconds;

  if (!Object.keys(inc).length) return;

  await ActivityStat.updateOne(
    { guildId, userId, dateKey },
    { $inc: inc },
    { upsert: true }
  );
}

async function trackMessageActivity(message) {
  if (!message.inGuild() || message.author.bot) return;

  await incrementActivity({
    guildId: message.guild.id,
    userId: message.author.id,
    dateKey: getDateKey(),
    messageCount: 1,
    channelId: message.channel.id,
  });
}

async function flushVoiceSession(guildId, userId, endedAt = Date.now()) {
  const key = getSessionKey(guildId, userId);
  const session = voiceSessions.get(key);
  if (!session) return 0;

  const voiceSeconds = Math.floor((endedAt - session.startedAt) / 1000);
  voiceSessions.delete(key);

  if (voiceSeconds <= 0) return 0;

  await incrementActivity({
    guildId,
    userId,
    dateKey: getDateKey(new Date(session.startedAt)),
    voiceSeconds,
    voiceChannelId: session.channelId,
  });

  return voiceSeconds;
}

async function trackVoiceActivity(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const guildId = member.guild.id;
  const userId = member.id;
  const key = getSessionKey(guildId, userId);
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (oldChannelId === newChannelId) return;

  const now = Date.now();
  if (oldChannelId) {
    await flushVoiceSession(guildId, userId, now);
  }

  if (newChannelId) {
    voiceSessions.set(key, {
      guildId,
      userId,
      channelId: newChannelId,
      startedAt: now,
    });
  }
}

function getActiveVoiceSeconds(guildId, userId, fromDateKey = null) {
  const session = voiceSessions.get(getSessionKey(guildId, userId));
  if (!session) return 0;
  if (fromDateKey && getDateKey(new Date(session.startedAt)) !== fromDateKey) return 0;
  return Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
}

function sumStats(stats, field) {
  return stats.reduce((sum, stat) => sum + (stat[field] || 0), 0);
}

function sumMapValues(stats, field) {
  const totals = new Map();
  for (const stat of stats) {
    const map = stat[field];
    if (!map) continue;

    for (const [key, value] of map.entries()) {
      totals.set(key, (totals.get(key) || 0) + Number(value || 0));
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, value]) => ({ id, value }));
}

async function getUserActivitySummary(guild, userId) {
  const guildId = guild.id;
  const keys14 = getDateKeys(14);
  const todayKey = keys14[keys14.length - 1];
  const keys7 = keys14.slice(-7);
  const now = new Date();
  const monthPrefix = getDateKey(now).slice(0, 7);

  const [recentStats, monthStats, totalAgg, messageRank, voiceRank] = await Promise.all([
    ActivityStat.find({
      guildId,
      userId,
      dateKey: { $in: keys14 },
    }),
    ActivityStat.find({
      guildId,
      userId,
      dateKey: { $regex: `^${monthPrefix}` },
    }),
    ActivityStat.aggregate([
      { $match: { guildId, userId } },
      {
        $group: {
          _id: null,
          messages: { $sum: '$messageCount' },
          voiceSeconds: { $sum: '$voiceSeconds' },
        },
      },
    ]),
    ActivityStat.aggregate([
      { $match: { guildId } },
      { $group: { _id: '$userId', total: { $sum: '$messageCount' } } },
      { $sort: { total: -1 } },
    ]),
    ActivityStat.aggregate([
      { $match: { guildId } },
      { $group: { _id: '$userId', total: { $sum: '$voiceSeconds' } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  const activeTodaySeconds = getActiveVoiceSeconds(guildId, userId, todayKey);
  const activeTotalSeconds = getActiveVoiceSeconds(guildId, userId);
  const byKey = new Map(recentStats.map((stat) => [stat.dateKey, stat]));
  const todayStats = byKey.get(todayKey);
  const stats7 = recentStats.filter((stat) => keys7.includes(stat.dateKey));
  const total = totalAgg[0] || { messages: 0, voiceSeconds: 0 };

  const chart = keys14.map((dateKey) => {
    const stat = byKey.get(dateKey);
    const activeSeconds = dateKey === todayKey ? activeTodaySeconds : 0;
    return {
      dateKey,
      messages: stat?.messageCount || 0,
      voiceSeconds: (stat?.voiceSeconds || 0) + activeSeconds,
    };
  });

  return {
    todayKey,
    messages: {
      day: todayStats?.messageCount || 0,
      week: sumStats(stats7, 'messageCount'),
      month: sumStats(monthStats, 'messageCount'),
      fourteenDays: sumStats(recentStats, 'messageCount'),
      total: total.messages || 0,
    },
    voice: {
      daySeconds: (todayStats?.voiceSeconds || 0) + activeTodaySeconds,
      weekSeconds: sumStats(stats7, 'voiceSeconds') + activeTodaySeconds,
      monthSeconds: sumStats(monthStats, 'voiceSeconds') + activeTodaySeconds,
      fourteenDaySeconds: sumStats(recentStats, 'voiceSeconds') + activeTodaySeconds,
      totalSeconds: (total.voiceSeconds || 0) + activeTotalSeconds,
    },
    ranks: {
      message: Math.max(messageRank.findIndex((entry) => entry._id === userId) + 1, 0),
      voice: Math.max(voiceRank.findIndex((entry) => entry._id === userId) + 1, 0),
    },
    topChannels: {
      messages: sumMapValues(recentStats, 'channelMessages').slice(0, 1),
      voice: sumMapValues(recentStats, 'voiceChannelSeconds').slice(0, 1),
    },
    chart,
  };
}

module.exports = {
  TIMEZONE,
  getUserActivitySummary,
  trackMessageActivity,
  trackVoiceActivity,
};
