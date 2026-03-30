const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const User = require('../../models/User');
const Item = require('../../models/Item');
const Bag = require('../../models/Bag');
const {
  UPGRADE_STONE_RARITIES,
  getBossItemLevel,
  getBossLootPool,
  getBossItemTotalStatValue,
  getCombatStatLabel,
  getEquipmentSlotLabel,
  getInventorySlots,
  getSetLabel,
  getUpgradeStoneType,
} = require('../../utils/economyItems');
const {
  getDamageAfterDefense,
  getEquippedCombatProfile,
  getReducedControlDuration,
  rollDodgeChance,
} = require('../../utils/equipmentStats');
const grantExperience = require('../../utils/grantExperience');

const PREFIX = '.testboss001';
const PREFIX_TEST_2 = '.testboss002';
const ACTIVE_BOSSES = new Map();

const BOSS_DURATION_MS = 5 * 60 * 1000;
const BASE_ATTACK_INTERVAL_MS = 3000;
const BOSS_ATTACK_INTERVAL_MS = 4000;
const BOSS_UPDATE_INTERVAL_MS = 1800;
const PLAYER_REVIVE_MS = 60 * 1000;
const BOSS_STUN_DURATION_MS = 3200;
const BOSS_SKILL_COOLDOWN_MS = 15000;
const LOOT_DAMAGE_THRESHOLD = 0.05;
const AUTO_MONSTER_SPAWN_RATE = 0.005;
const AUTO_BOSS_SPAWN_RATE = 0.0005;
const BASE_BOSS_HP = 10000;
const BASE_BOSS_ATTACK_MIN = 40;
const BASE_BOSS_ATTACK_MAX = 60;
const BOSS_TEST_PRESETS = {
  testboss001: {
    commandKey: 'testboss001',
    hpMultiplier: 1,
    attackMultiplier: 1,
    defenseMultiplier: 1,
    attackIntervalMultiplier: 1,
    suffixLabel: 'Test 1',
    lootWeights: null,
  },
  testboss002: {
    commandKey: 'testboss002',
    hpMultiplier: 0.38,
    attackMultiplier: 0.45,
    defenseMultiplier: 0.75,
    attackIntervalMultiplier: 1.08,
    suffixLabel: 'Test 2',
    lootWeights: { common: 68, rare: 24, epic: 8, legendary: 0 },
  },
};

const BOSS_RARITY_CONFIGS = {
  common: {
    label: 'Th\u01b0\u1eddng',
    color: 0x94a3b8,
    weight: 48,
    hpMultiplier: 1,
    damageMultiplier: 0.88,
    defense: 28,
    lootChance: 100,
    lootWeights: { common: 77, rare: 18, epic: 4, legendary: 1 },
  },
  rare: {
    label: 'Hi\u1ebfm',
    color: 0x3b82f6,
    weight: 29,
    hpMultiplier: 1.2,
    damageMultiplier: 0.94,
    defense: 42,
    lootChance: 100,
    lootWeights: { common: 48, rare: 34, epic: 15, legendary: 3 },
  },
  epic: {
    label: 'S\u1eed thi',
    color: 0xa855f7,
    weight: 16,
    hpMultiplier: 1.45,
    damageMultiplier: 0.98,
    defense: 58,
    lootChance: 100,
    lootWeights: { common: 24, rare: 40, epic: 30, legendary: 6 },
  },
  legendary: {
    label: 'Huy\u1ec1n tho\u1ea1i',
    color: 0xf59e0b,
    weight: 7,
    hpMultiplier: 1.75,
    damageMultiplier: 1.04,
    defense: 76,
    lootChance: 100,
    lootWeights: { common: 8, rare: 32, epic: 45, legendary: 15 },
  },
};

const BOSS_ARCHETYPES = {
  balanced: {
    label: 'T\u1ed5ng h\u1ee3p',
    hpMultiplier: 1,
    damageMultiplier: 1,
    defenseMultiplier: 1,
    attackIntervalMultiplier: 1,
    skillChance: 10,
    stunDurationMs: BOSS_STUN_DURATION_MS,
    skillCooldownMs: 16000,
    trait: 'Ch\u1ec9 s\u1ed1 c\u00e2n b\u1eb1ng, k\u1ef9 n\u0103ng kh\u00f4ng qu\u00e1 d\u1ed3n d\u1eadp.',
    names: ['V\u1ec7 Binh C\u1ed5 \u0110\u1ea1i', 'Linh H\u1ed3n Hung B\u1ea1o', 'Qu\u00e2n V\u01b0\u01a1ng C\u1ed5 Mi\u1ebfu'],
  },
  crusher: {
    label: 'Dame to',
    hpMultiplier: 0.92,
    damageMultiplier: 1.08,
    defenseMultiplier: 0.88,
    attackIntervalMultiplier: 0.92,
    skillChance: 8,
    stunDurationMs: 2800,
    skillCooldownMs: 18000,
    trait: '\u0110\u00f2n r\u1ea5t \u0111au, nh\u01b0ng k\u1ef9 n\u0103ng kh\u1ed1ng ch\u1ebf kh\u00f4ng th\u01b0\u1eddng xuy\u00ean.',
    names: ['Cu\u1ed3ng Qu\u1ef7 Ph\u00e1 N\u00fai', 'S\u00e1t Th\u1ee7 Th\u1ea7n L\u00f4i', 'Ma V\u01b0\u01a1ng Ph\u1eabn N\u1ed9'],
  },
  ironwall: {
    label: 'Def cao',
    hpMultiplier: 1.18,
    damageMultiplier: 0.72,
    defenseMultiplier: 1.75,
    attackIntervalMultiplier: 1.08,
    skillChance: 7,
    stunDurationMs: 2500,
    skillCooldownMs: 17000,
    trait: 'Ph\u00f2ng th\u1ee7 cao, giao tranh k\u00e9o d\u00e0i nh\u01b0ng kh\u00f4ng spam cho\u00e1ng.',
    names: ['Th\u00e0nh \u0110\u00e1 B\u1ea5t Di\u1ec7t', 'Th\u1ea7n Golem S\u1eaft', 'Th\u1ee7 L\u0129nh Thi\u1ebft B\u00edch'],
  },
  tyrant: {
    label: 'Cho\u00e1ng m\u1ea1nh',
    hpMultiplier: 1.05,
    damageMultiplier: 0.82,
    defenseMultiplier: 1.02,
    attackIntervalMultiplier: 1,
    skillChance: 16,
    stunDurationMs: 4200,
    skillCooldownMs: 12000,
    trait: 'Thi\u00ean v\u1ec1 kh\u1ed1ng ch\u1ebf, nh\u01b0ng v\u1eabn c\u00f3 kho\u1ea3ng ngh\u1ec9 gi\u1eefa c\u00e1c l\u1ea7n d\u00f9ng chi\u00eau.',
    names: ['B\u1ea1o Ch\u00faa Tr\u1ea7m M\u1eb7c', 'Y\u00eau V\u01b0\u01a1ng \u0110\u1ecbnh M\u1ec7nh', 'Ch\u1ee7 T\u1ebf B\u00f3p Ngh\u1eb9t'],
  },
  assassin: {
    label: '\u0110\u00e1nh nhanh',
    hpMultiplier: 0.88,
    damageMultiplier: 0.9,
    defenseMultiplier: 0.95,
    attackIntervalMultiplier: 0.76,
    skillChance: 9,
    stunDurationMs: 2200,
    skillCooldownMs: 15000,
    trait: '\u0110\u00e1nh nhanh, nguy hi\u1ec3m v\u1edbi ng\u01b0\u1eddi m\u00e1u th\u1ea5p nh\u01b0ng \u00edt kh\u1ed1ng ch\u1ebf h\u01a1n.',
    names: ['\u00c1m S\u00e1t B\u00f3ng \u0110\u00eam', '\u0110\u1ed9c Nh\u00e3n Huy\u1ec1n Nha', 'Ph\u1ea3n H\u00ecnh T\u1eed Th\u1ea7n'],
  },
};

function parseIdList(value) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatDuration(ms) {
  const safeMs = Math.max(Number(ms) || 0, 0);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function createHpBar(current, max, size = 16) {
  const safeMax = Math.max(max, 1);
  const ratio = Math.max(0, Math.min(current / safeMax, 1));
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function getAttackIntervalMs(attackSpeedPercent = 0) {
  const safeAttackSpeed = Math.max(Number(attackSpeedPercent) || 0, 0);
  return Math.max(600, Math.round(BASE_ATTACK_INTERVAL_MS / (1 + (safeAttackSpeed / 100))));
}

function weightedRandomKey(configMap) {
  const entries = Object.entries(configMap);
  const totalWeight = entries.reduce((sum, [, value]) => sum + (value.weight || value), 0);
  let roll = Math.random() * totalWeight;

  for (const [key, value] of entries) {
    roll -= value.weight || value;
    if (roll <= 0) return key;
  }

  return entries[0]?.[0] || null;
}

function pickBossRarity() {
  return weightedRandomKey(BOSS_RARITY_CONFIGS) || 'common';
}

function pickBossLootRarity(state) {
  const weights = state.lootWeights || BOSS_RARITY_CONFIGS.common.lootWeights;
  return weightedRandomKey(weights) || 'common';
}

function buildBossTemplate(preset = BOSS_TEST_PRESETS.testboss001) {
  const rarityKey = pickBossRarity();
  const rarity = BOSS_RARITY_CONFIGS[rarityKey] || BOSS_RARITY_CONFIGS.common;
  const archetypeKey = weightedRandomKey({
    balanced: 30,
    crusher: 22,
    ironwall: 20,
    tyrant: 18,
    assassin: 10,
  }) || 'balanced';
  const archetype = BOSS_ARCHETYPES[archetypeKey] || BOSS_ARCHETYPES.balanced;
  const bossName = archetype.names[Math.floor(Math.random() * archetype.names.length)];

  return {
    rarityKey,
    rarityLabel: rarity.label,
    archetypeKey,
    archetypeLabel: archetype.label,
    color: rarity.color,
    name: `${bossName} | ${preset.suffixLabel}`,
    maxHp: Math.max(1200, Math.round(BASE_BOSS_HP * rarity.hpMultiplier * archetype.hpMultiplier * preset.hpMultiplier)),
    attackMin: Math.max(8, Math.round(BASE_BOSS_ATTACK_MIN * rarity.damageMultiplier * archetype.damageMultiplier * preset.attackMultiplier)),
    attackMax: Math.max(14, Math.round(BASE_BOSS_ATTACK_MAX * rarity.damageMultiplier * archetype.damageMultiplier * preset.attackMultiplier)),
    defense: Math.max(8, Math.round(rarity.defense * archetype.defenseMultiplier * preset.defenseMultiplier)),
    attackIntervalMs: Math.max(2200, Math.round(BOSS_ATTACK_INTERVAL_MS * archetype.attackIntervalMultiplier * preset.attackIntervalMultiplier)),
    skillChance: archetype.skillChance,
    stunDurationMs: archetype.stunDurationMs,
    skillCooldownMs: archetype.skillCooldownMs || BOSS_SKILL_COOLDOWN_MS,
    lootChance: rarity.lootChance,
    lootWeights: preset.lootWeights || rarity.lootWeights,
    trait: archetype.trait,
  };
}

function getBossAttackDamage(state) {
  const min = Math.max(state.attackMin || BASE_BOSS_ATTACK_MIN, 1);
  const max = Math.max(state.attackMax || BASE_BOSS_ATTACK_MAX, min);
  return min + Math.floor(Math.random() * (max - min + 1));
}

function formatLootRate(weights = {}) {
  const parts = [];

  if ((weights.common || 0) > 0) parts.push(`Th\u01b0\u1eddng ${weights.common}%`);
  if ((weights.rare || 0) > 0) parts.push(`Hi\u1ebfm ${weights.rare}%`);
  if ((weights.epic || 0) > 0) parts.push(`S\u1eed thi ${weights.epic}%`);
  if ((weights.legendary || 0) > 0) parts.push(`Huy\u1ec1n tho\u1ea1i ${weights.legendary}%`);

  return parts.join(' | ') || 'Kh\u00f4ng c\u00f3';
}

function createBossState(message, preset = BOSS_TEST_PRESETS.testboss001) {
  const template = buildBossTemplate(preset);

  return {
    commandKey: preset.commandKey,
    guildId: message.guild.id,
    channelId: message.channel.id,
    ownerId: message.author.id,
    ownerName: message.author.username,
    bossName: template.name,
    rarityKey: template.rarityKey,
    rarityLabel: template.rarityLabel,
    archetypeKey: template.archetypeKey,
    archetypeLabel: template.archetypeLabel,
    maxHp: template.maxHp,
    hp: template.maxHp,
    attackMin: template.attackMin,
    attackMax: template.attackMax,
    defense: template.defense,
    attackIntervalMs: template.attackIntervalMs,
    skillChance: template.skillChance,
    stunDurationMs: template.stunDurationMs,
    skillCooldownMs: template.skillCooldownMs,
    nextSkillAt: 0,
    lootChance: template.lootChance,
    lootWeights: template.lootWeights,
    trait: template.trait,
    startedAt: Date.now(),
    expiresAt: Date.now() + BOSS_DURATION_MS,
    messageId: null,
    participants: new Map(),
    cooldowns: new Map(),
    autoAttackers: new Map(),
    pendingDescription: null,
    updateTimeoutId: null,
    bossAttackTimeoutId: null,
    locked: false,
    defeated: false,
    color: template.color,
  };
}

function getRarityLabel(rarity) {
  if (rarity === 'legendary') return 'Huy\u1ec1n tho\u1ea1i';
  if (rarity === 'epic') return 'S\u1eed thi';
  if (rarity === 'rare') return 'Hi\u1ebfm';
  return 'Th\u01b0\u1eddng';
}

function getStatLabel(stat) {
  return getCombatStatLabel(stat);
}

function getBossStoneDropCount(state) {
  const rarityStoneMap = {
    common: [1, 2],
    rare: [2, 4],
    epic: [4, 7],
    legendary: [7, 11],
  };
  const [min, max] = rarityStoneMap[state.rarityKey] || rarityStoneMap.common;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickBossStoneRarity(state) {
  const weightsByBossRarity = {
    common: { common: 88, rare: 12, epic: 0, legendary: 0 },
    rare: { common: 45, rare: 45, epic: 10, legendary: 0 },
    epic: { common: 15, rare: 45, epic: 33, legendary: 7 },
    legendary: { common: 0, rare: 25, epic: 45, legendary: 30 },
  };

  return weightedRandomKey(weightsByBossRarity[state.rarityKey] || weightsByBossRarity.common) || 'common';
}

function getBossExpReward(state, participant, rankingIndex) {
  const rarityBaseMap = {
    common: 18,
    rare: 28,
    epic: 40,
    legendary: 55,
  };
  const rankingBonusMap = [12, 8, 5];
  const baseExp = rarityBaseMap[state.rarityKey] || rarityBaseMap.common;
  const damageShare = Math.max(0, Math.min((participant.damage || 0) / Math.max(state.maxHp || 1, 1), 2));
  const contributionBonus = Math.round(baseExp * damageShare * 0.9);
  const rankingBonus = rankingBonusMap[rankingIndex] || 0;
  return Math.max(10, baseExp + contributionBonus + rankingBonus);
}

function getParticipantStatus(entry, now = Date.now()) {
  if (!entry) return 'unknown';
  if (entry.deadUntil > now) return 'dead';
  if (entry.stunnedUntil > now) return 'stunned';
  return 'alive';
}

function reviveParticipantIfNeeded(entry, now = Date.now()) {
  if (!entry) return false;
  if (!entry.deadUntil || entry.deadUntil <= now) {
    if (entry.deadUntil) {
      entry.deadUntil = 0;
      entry.hp = entry.maxHp;
      return true;
    }
  }
  return false;
}

function getAliveParticipants(state, now = Date.now()) {
  const participants = [...state.participants.values()];
  return participants.filter((entry) => {
    reviveParticipantIfNeeded(entry, now);
    return getParticipantStatus(entry, now) === 'alive';
  });
}

function pickAggroTarget(participants) {
  if (!participants.length) return null;

  const weighted = participants.map((entry) => ({
    entry,
    // Ai gây nhiều sát thương hơn sẽ dễ bị boss nhắm hơn, nhưng vẫn giữ trọng số nền
    weight: Math.max(1, 10 + Math.floor((entry.damage || 0) / 250)),
  }));
  const totalWeight = weighted.reduce((sum, current) => sum + current.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const current of weighted) {
    roll -= current.weight;
    if (roll <= 0) return current.entry;
  }

  return weighted[0].entry;
}

function pickRandomAliveTarget(participants) {
  if (!participants.length) return null;
  return participants[Math.floor(Math.random() * participants.length)];
}

function getTopDamagers(state, limit = 5) {
  return [...state.participants.values()]
    .sort((a, b) => b.damage - a.damage)
    .slice(0, limit);
}

function buildRosterLines(state, filter, emptyText, limit = 6) {
  const now = Date.now();
  const lines = [...state.participants.values()]
    .filter((entry) => {
      reviveParticipantIfNeeded(entry, now);
      return filter(entry, now);
    })
    .sort((a, b) => b.damage - a.damage)
    .slice(0, limit)
    .map((entry) => {
      const status = getParticipantStatus(entry, now);
      if (status === 'dead') {
        return `${entry.username}: KO | hồi sinh sau ${formatDuration(entry.deadUntil - now)}`;
      }
      if (status === 'stunned') {
        return `${entry.username}: ${formatNumber(entry.hp)}/${formatNumber(entry.maxHp)} HP | choáng ${formatDuration(entry.stunnedUntil - now)}`;
      }
      return `${entry.username}: ${formatNumber(entry.hp)}/${formatNumber(entry.maxHp)} HP | DEF ${formatNumber(entry.def)}`;
    });

  return lines.length ? lines.join('\n') : emptyText;
}

function buildBossEmbed(state, description) {
  const hpPercent = Math.max(0, Math.round((state.hp / state.maxHp) * 100));
  const now = Date.now();
  const topDamagers = getTopDamagers(state);
  const ranking = topDamagers.length
    ? topDamagers
        .map((entry, index) => {
          const status = getParticipantStatus(entry, now);
          const suffix = status === 'dead'
            ? ' | KO'
            : status === 'stunned'
              ? ' | Choang'
              : '';
          return `**${index + 1}.** ${entry.username} - ${formatNumber(entry.damage)} dame${suffix}`;
        })
        .join('\n')
    : 'Chưa có ai gây sát thương.';

  return new EmbedBuilder()
    .setColor(state.defeated ? 0x22c55e : state.color || 0xef4444)
    .setTitle(`${state.bossName} | ${state.rarityLabel} | ${state.archetypeLabel}`)
    .setDescription(
      [
        description || 'Boss có đánh ngược, có skill choáng, trạng thái và loot thay đổi theo từng loại boss.',
        '',
        `**Boss HP:** ${formatNumber(state.hp)}/${formatNumber(state.maxHp)}`,
        `\`${createHpBar(state.hp, state.maxHp)}\` **${hpPercent}%**`,
        `**Boss dame:** ${formatNumber(state.attackMin)} - ${formatNumber(state.attackMax)} | **Boss DEF:** ${formatNumber(state.defense)}`,
        `**Kỹ năng:** ${state.skillChance}% tỉ lệ choáng | **Thời gian choáng:** ${(state.stunDurationMs / 1000).toFixed(1)}s | **Hồi chiêu chiêu:** ${(state.skillCooldownMs / 1000).toFixed(0)}s`,
        `**Rơi đồ:** 100% | **Tỉ lệ:** ${formatLootRate(state.lootWeights)} | **Đặc tính:** ${state.trait}`,
      ].join('\n')
    )
    .addFields(
      {
        name: 'Raid',
        value: `Trieu hoi: <@${state.ownerId}>\nCon lai: ${state.defeated ? 'Boss da guc' : formatDuration(state.expiresAt - now)}`,
        inline: false,
      },
      {
        name: 'Người sống',
        value: buildRosterLines(
          state,
          (entry, time) => getParticipantStatus(entry, time) === 'alive',
          'Chưa có ai còn chiến đấu.'
        ),
        inline: false,
      },
      {
        name: 'Bị choáng / Nằm xuống',
        value: buildRosterLines(
          state,
          (entry, time) => ['stunned', 'dead'].includes(getParticipantStatus(entry, time)),
          'Không có ai đang gặp trạng thái xấu.'
        ),
        inline: false,
      },
      {
        name: 'Bảng dame',
        value: ranking,
        inline: false,
      }
    )
    .setFooter({
      text: state.defeated
        ? 'Boss đã bị hạ gục'
        : 'Bấm Tấn công để bật auto đánh. Boss sẽ phản đòn định kỳ.',
    })
    .setTimestamp();
}

function buildBossButtons(commandKey = 'testboss001', disabled = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${commandKey}_attack`)
        .setLabel('Tấn công')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`${commandKey}_status`)
        .setLabel('Trạng thái')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    ),
  ];
}

async function rewardParticipants(state) {
  const ranking = [...state.participants.values()].sort((a, b) => b.damage - a.damage);
  const damageThreshold = Math.floor(state.maxHp * LOOT_DAMAGE_THRESHOLD);

  for (let index = 0; index < ranking.length; index++) {
    const participant = ranking[index];
    let reward = 150 + Math.floor(participant.damage / 8);

    if (index === 0) reward += 600;
    else if (index === 1) reward += 350;
    else if (index === 2) reward += 200;

    let user = await User.findOne({
      userId: participant.userId,
      guildId: state.guildId,
    });

    if (!user) {
      user = new User({
        userId: participant.userId,
        guildId: state.guildId,
        balance: 0,
      });
    }

    user.balance += reward;
    participant.exp = getBossExpReward(state, participant, index);
    participant.xpResult = await grantExperience(participant.userId, state.guildId, participant.exp);
    await user.save();
    participant.reward = reward;

    const stoneCount = getBossStoneDropCount(state);
    const stoneRarity = pickBossStoneRarity(state);
    const stoneType = getUpgradeStoneType(stoneRarity);
    let stoneItem = await Item.findOne({
      userId: participant.userId,
      guildId: state.guildId,
      type: stoneType,
      itemLevel: 0,
    });

    if (stoneItem) {
      stoneItem.quantity += stoneCount;
      await stoneItem.save();
    } else {
      const bag = await Bag.findOne({
        userId: participant.userId,
        guildId: state.guildId,
      });
      const totalSlots = getInventorySlots(bag?.level || 1);
      const usedSlots = await Item.countDocuments({
        userId: participant.userId,
        guildId: state.guildId,
        $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
      });

      if (usedSlots < totalSlots) {
        stoneItem = new Item({
          userId: participant.userId,
          guildId: state.guildId,
          type: stoneType,
          itemLevel: 0,
          quantity: stoneCount,
          expiresAt: 0,
        });
        await stoneItem.save();
      } else {
        participant.stoneBlocked = true;
      }
    }

    if (!participant.stoneBlocked) {
      participant.stones = (participant.stones || 0) + stoneCount;
      participant.stoneRarity = stoneRarity;
    }

    if (participant.damage < damageThreshold) continue;

    const rarity = pickBossLootRarity(state);
    const lootPool = getBossLootPool(rarity);
    const loot = lootPool[Math.floor(Math.random() * lootPool.length)];
    const lootLevel = getBossItemLevel(participant.level || 0);

    if (!loot) continue;

    const bag = await Bag.findOne({
      userId: participant.userId,
      guildId: state.guildId,
    });
    const totalSlots = getInventorySlots(bag?.level || 1);
    const usedSlots = await Item.countDocuments({
      userId: participant.userId,
      guildId: state.guildId,
      $or: [{ expiresAt: 0 }, { expiresAt: { $gt: Date.now() } }],
    });

    let existingItem = await Item.findOne({
      userId: participant.userId,
      guildId: state.guildId,
      type: loot.type,
      itemLevel: lootLevel,
    });

    if (existingItem) {
      existingItem.quantity += 1;
      await existingItem.save();
      participant.loot = {
        ...loot,
        itemLevel: lootLevel,
        scaledStatValue: getBossItemTotalStatValue(loot, lootLevel, 0),
      };
      continue;
    }

    if (usedSlots >= totalSlots) {
      participant.lootBlocked = true;
      continue;
    }

    existingItem = new Item({
      userId: participant.userId,
      guildId: state.guildId,
      type: loot.type,
      itemLevel: lootLevel,
      quantity: 1,
      expiresAt: 0,
    });
    await existingItem.save();
    participant.loot = {
      ...loot,
      itemLevel: lootLevel,
      scaledStatValue: getBossItemTotalStatValue(loot, lootLevel, 0),
    };
  }
}

function buildVictorySummary(state) {
  const ranking = getTopDamagers(state, 10);

  return ranking.length
    ? ranking
        .map((entry, index) => {
          const rewardText = entry.reward ? ` | +${formatNumber(entry.reward)} Wcoin` : '';
          const expText = entry.exp ? ` | +${formatNumber(entry.exp)} EXP` : '';
          const stoneText = entry.stones
            ? ` | +${formatNumber(entry.stones)} da ${UPGRADE_STONE_RARITIES[entry.stoneRarity]?.label || entry.stoneRarity}`
            : entry.stoneBlocked
              ? ' | Mat da vi balo day'
              : '';
          const lootText = entry.loot
            ? ` | Nhan: ${entry.loot.name} Lv ${entry.loot.itemLevel} (${getEquipmentSlotLabel(entry.loot.slot)} - Set ${getSetLabel(entry.loot.set)} - ${getStatLabel(entry.loot.stat)} +${entry.loot.scaledStatValue})`
            : entry.noLoot
              ? ' | Khong may man roi trang bi lan nay'
            : entry.lootBlocked
              ? ' | Balo day nen khong nhan duoc do'
              : '';
          return `**${index + 1}.** ${entry.username} - ${formatNumber(entry.damage)} dame${rewardText}${expText}${stoneText}${lootText}`;
        })
        .join('\n')
    : 'Khong co ai gay sat thuong.';
}

function clearAutoAttackers(state) {
  for (const timeoutId of state.autoAttackers.values()) {
    clearTimeout(timeoutId);
  }
  state.autoAttackers.clear();
  clearBossUpdateTimer(state);
}

function clearBossAttackTimer(state) {
  if (state.bossAttackTimeoutId) {
    clearTimeout(state.bossAttackTimeoutId);
    state.bossAttackTimeoutId = null;
  }
}

function clearBossUpdateTimer(state) {
  if (state.updateTimeoutId) {
    clearTimeout(state.updateTimeoutId);
    state.updateTimeoutId = null;
  }
}

async function flushBossUpdate(state, bossMessage) {
  if (state.defeated || state.hp <= 0) return;
  if (!state.pendingDescription) return;

  const description = state.pendingDescription;
  state.pendingDescription = null;
  clearBossUpdateTimer(state);

  await bossMessage.edit({
    embeds: [buildBossEmbed(state, description)],
    components: buildBossButtons(state.commandKey, false),
  });
}

function queueBossUpdate(state, bossMessage, description) {
  if (state.defeated || state.hp <= 0) return;

  state.pendingDescription = description;
  if (state.updateTimeoutId) return;

  state.updateTimeoutId = setTimeout(() => {
    flushBossUpdate(state, bossMessage).catch((error) => console.log(error));
  }, BOSS_UPDATE_INTERVAL_MS);
}

async function hydrateParticipant(state, user) {
  const profile = await getEquippedCombatProfile(user.id, state.guildId);
  const existing = state.participants.get(user.id);

  const participant = existing || {
    userId: user.id,
    username: user.username,
    damage: 0,
    hits: 0,
    deaths: 0,
    deadUntil: 0,
    stunnedUntil: 0,
    hp: profile.stats.hp,
    maxHp: profile.stats.hp,
  };

  participant.username = user.username;
  participant.level = profile.level;
  participant.maxHp = profile.stats.hp;
  participant.def = profile.stats.def;
  participant.dodge = profile.stats.dodge;
  participant.ccResist = profile.stats.ccResist;
  participant.lifesteal = profile.stats.lifesteal;
  participant.attackMin = profile.stats.totalMin;
  participant.attackMax = profile.stats.totalMax;
  participant.attackSpeed = profile.stats.attackSpeed;
  participant.crit = profile.stats.crit;
  participant.critMultiplier = profile.stats.critMultiplier;
  participant.profile = profile;

  if (!existing) {
    participant.hp = participant.maxHp;
  } else if (participant.deadUntil <= Date.now()) {
    participant.hp = Math.min(Math.max(participant.hp || 0, 1), participant.maxHp);
  }

  state.participants.set(user.id, participant);
  return participant;
}

async function scheduleAutoAttack(state, user, bossMessage, collector, guildId, delayMs) {
  if (state.defeated || state.hp <= 0) {
    state.autoAttackers.delete(user.id);
    return;
  }

  const timeoutId = setTimeout(async () => {
    if (state.defeated || state.hp <= 0) {
      state.autoAttackers.delete(user.id);
      return;
    }

    const nextDelayMs = await processPlayerAttack(
      state,
      user,
      bossMessage,
      collector,
      guildId,
      'auto'
    );

    if (state.defeated || state.hp <= 0 || !state.autoAttackers.has(user.id)) {
      state.autoAttackers.delete(user.id);
      return;
    }

    await scheduleAutoAttack(
      state,
      user,
      bossMessage,
      collector,
      guildId,
      nextDelayMs || BASE_ATTACK_INTERVAL_MS
    );
  }, delayMs);

  state.autoAttackers.set(user.id, timeoutId);
}

function stopPlayerAutoAttack(state, userId) {
  const timeoutId = state.autoAttackers.get(userId);
  if (timeoutId) clearTimeout(timeoutId);
  state.autoAttackers.delete(userId);
}

async function processPlayerAttack(state, user, bossMessage, collector, guildId, source = 'auto') {
  if (state.defeated || state.hp <= 0) return;

  while (state.locked && !state.defeated && state.hp > 0) {
    await new Promise((resolve) => setTimeout(resolve, 75));
  }

  if (state.defeated || state.hp <= 0) return;

  const now = Date.now();
  const cooldownUntil = state.cooldowns.get(user.id) || 0;
  if (cooldownUntil > now) return Math.max(cooldownUntil - now, 500);

  state.locked = true;
  let nextAttackIntervalMs = BASE_ATTACK_INTERVAL_MS;

  try {
    const participant = await hydrateParticipant(state, user);
    const revived = reviveParticipantIfNeeded(participant, now);
    if (revived) {
      participant.stunnedUntil = 0;
    }

    if (participant.deadUntil > now) {
      stopPlayerAutoAttack(state, user.id);
      queueBossUpdate(
        state,
        bossMessage,
        `${user} dang nam xuong va se hoi sinh sau ${formatDuration(participant.deadUntil - now)}.`
      );
      return Math.max(participant.deadUntil - now, 1000);
    }

    if (participant.stunnedUntil > now) {
      queueBossUpdate(
        state,
        bossMessage,
        `${user} dang bi choang, con ${formatDuration(participant.stunnedUntil - now)} moi danh tiep duoc.`
      );
      return Math.max(participant.stunnedUntil - now, 1000);
    }

    nextAttackIntervalMs = getAttackIntervalMs(participant.attackSpeed);
    const minDamage = Math.max(participant.attackMin, 1);
    const maxDamage = Math.max(participant.attackMax, minDamage);
    const rolledDamage = minDamage + Math.floor(Math.random() * (maxDamage - minDamage + 1));
    const isCritical = Math.random() * 100 < participant.crit;
    const damageBeforeBossDef = isCritical
      ? Math.floor(rolledDamage * participant.critMultiplier)
      : rolledDamage;
    const damageAfterBossDef = getDamageAfterDefense(damageBeforeBossDef, state.defense);
    const finalDamage = Math.min(state.hp, damageAfterBossDef);
    const lifestealHeal = Math.min(
      Math.max(participant.maxHp - participant.hp, 0),
      Math.floor(finalDamage * ((participant.lifesteal || 0) / 100))
    );

    state.hp -= finalDamage;
    state.cooldowns.set(user.id, now + nextAttackIntervalMs);
    participant.damage += finalDamage;
    participant.hits += 1;
    if (lifestealHeal > 0) {
      participant.hp = Math.min(participant.maxHp, participant.hp + lifestealHeal);
    }

    const attackText = [
      `${user} gay **${formatNumber(finalDamage)}** dame len boss.`,
      `Roll: **${formatNumber(rolledDamage)}** trong khoang **${formatNumber(minDamage)} - ${formatNumber(maxDamage)}**.`,
      `Boss DEF giam tu **${formatNumber(damageBeforeBossDef)}** con **${formatNumber(finalDamage)}**.`,
      lifestealHeal > 0
        ? `Hut mau hoi **${formatNumber(lifestealHeal)} HP**, hien tai **${formatNumber(participant.hp)}/${formatNumber(participant.maxHp)}**.`
        : `HP hien tai: **${formatNumber(participant.hp)}/${formatNumber(participant.maxHp)}**.`,
      isCritical ? `Crit no ra voi he so **x${participant.critMultiplier}**.` : `Crit hien tai: **${formatNumber(participant.crit)}%**.`,
    ].join(' ');

    if (state.hp <= 0) {
      state.hp = 0;
      state.defeated = true;
      clearAutoAttackers(state);
      clearBossAttackTimer(state);

      await rewardParticipants(state);

      await bossMessage.edit({
        embeds: [
          buildBossEmbed(state, `${user} da tung don ket lieu boss.`).setFields(
            {
              name: 'Ket qua',
              value: `Boss da bi tieu diet boi <@${user.id}>`,
              inline: false,
            },
            {
              name: 'Bang thuong',
              value: buildVictorySummary(state),
              inline: false,
            }
          ),
        ],
        components: buildBossButtons(state.commandKey, true),
      });

      ACTIVE_BOSSES.delete(guildId);
      collector.stop('defeated');
      return nextAttackIntervalMs;
    }

    const description = source === 'button'
      ? `${user} bat dau auto chien. ${attackText}`
      : `${user} vua danh mot don. ${attackText}`;

    queueBossUpdate(state, bossMessage, description);
  } catch (error) {
    console.log(error);
  } finally {
    state.locked = false;
  }

  return nextAttackIntervalMs;
}

async function processBossAttackTurn(state, bossMessage) {
  if (state.defeated || state.hp <= 0) return;

  const now = Date.now();
  const aliveParticipants = getAliveParticipants(state, now);
  if (!aliveParticipants.length) {
    queueBossUpdate(state, bossMessage, 'Boss gao thet nhung chua tim thay muc tieu song de tan cong.');
    return;
  }

  const target = pickAggroTarget(aliveParticipants);
  const rawDamage = getBossAttackDamage(state);
  const dodged = rollDodgeChance(target.dodge);

  if (dodged) {
    queueBossUpdate(
      state,
      bossMessage,
      `Boss vung don vao ${target.username} nhung bi ne mat. Ti le ne hien tai: **${formatNumber(target.dodge)}%**.`
    );
    return;
  }

  const finalDamage = Math.min(target.hp, getDamageAfterDefense(rawDamage, target.def));
  target.hp = Math.max(0, target.hp - finalDamage);

  let suffix = `Boss danh ${target.username} **${formatNumber(finalDamage)}** dame. Raw: **${formatNumber(rawDamage)}**, sau DEF con **${formatNumber(finalDamage)}**.`;

  const canUseSkill = now >= (state.nextSkillAt || 0);
  const useSkill = canUseSkill && Math.random() * 100 < (state.skillChance || 0);
  if (useSkill) {
    const stunTarget = pickRandomAliveTarget(getAliveParticipants(state, now));
    const reducedDuration = getReducedControlDuration(
      state.stunDurationMs || BOSS_STUN_DURATION_MS,
      stunTarget?.ccResist || 0
    );
    state.nextSkillAt = now + (state.skillCooldownMs || BOSS_SKILL_COOLDOWN_MS);
    if (stunTarget && reducedDuration > 0) {
      stunTarget.stunnedUntil = now + reducedDuration;
      suffix += ` Boss tung kỹ năng khống chế, ${stunTarget.username} bị choáng **${(reducedDuration / 1000).toFixed(1)}s**.`;
    } else if (stunTarget) {
      suffix += ` Boss tung kỹ năng khống chế nhưng ${stunTarget.username} kháng hoàn toàn hiệu ứng.`;
    }
  }

  if (target.hp <= 0) {
    target.deaths = (target.deaths || 0) + 1;
    target.deadUntil = now + PLAYER_REVIVE_MS;
    target.stunnedUntil = 0;
    target.hp = 0;
    suffix += ` ${target.username} da guc va se hoi sinh sau **${formatDuration(PLAYER_REVIVE_MS)}**.`;
  }

  queueBossUpdate(state, bossMessage, suffix);
}

function scheduleBossAttack(state, bossMessage) {
  if (state.defeated || state.hp <= 0) return;

  clearBossAttackTimer(state);
  state.bossAttackTimeoutId = setTimeout(async () => {
    if (state.defeated || state.hp <= 0) return;
    await processBossAttackTurn(state, bossMessage);
    scheduleBossAttack(state, bossMessage);
  }, state.attackIntervalMs || BOSS_ATTACK_INTERVAL_MS);
}

function buildPersonalStatus(entry) {
  const now = Date.now();
  const revived = reviveParticipantIfNeeded(entry, now);
  if (revived) entry.stunnedUntil = 0;

  const status = getParticipantStatus(entry, now);
  const statusText = status === 'dead'
    ? `KO | Hoi sinh sau ${formatDuration(entry.deadUntil - now)}`
    : status === 'stunned'
      ? `Bi choang | Con ${formatDuration(entry.stunnedUntil - now)}`
      : 'Dang chien dau';

  return [
    `HP: **${formatNumber(entry.hp)}/${formatNumber(entry.maxHp)}**`,
    `DEF: **${formatNumber(entry.def)}** | Giam sat thuong: **${formatNumber(entry.profile.stats.damageReductionPercent)}%**`,
    `Ne tranh: **${formatNumber(entry.dodge)}%** | Khang CC: **${formatNumber(entry.ccResist)}%**`,
    `Hut mau: **${formatNumber(entry.lifesteal)}%**`,
    `Dame da gay: **${formatNumber(entry.damage)}** | So lan guc: **${formatNumber(entry.deaths)}**`,
    `Trang thai: **${statusText}**`,
  ].join('\n');
}

async function startBossEncounter(message, commandKey) {
  const guildId = message.guild.id;
  const activeBoss = ACTIVE_BOSSES.get(guildId);

  if (activeBoss && !activeBoss.defeated && Date.now() < activeBoss.expiresAt) {
    return false;
  }

  const preset = BOSS_TEST_PRESETS[commandKey] || BOSS_TEST_PRESETS.testboss001;
  const state = createBossState(message, preset);
  ACTIVE_BOSSES.set(guildId, state);

  const bossMessage = await message.channel.send({
    embeds: [buildBossEmbed(state)],
    components: buildBossButtons(state.commandKey, false),
  });

  state.messageId = bossMessage.id;
  scheduleBossAttack(state, bossMessage);

  const collector = bossMessage.createMessageComponentCollector({
    time: BOSS_DURATION_MS,
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === `${state.commandKey}_status`) {
      const participant = state.participants.get(interaction.user.id);
      if (!participant) {
        return interaction.reply({
          content: 'Ban chua tham gia raid. Bam Tan cong de vao tran.',
          ephemeral: true,
        });
      }

      await hydrateParticipant(state, interaction.user);
      return interaction.reply({
        content: buildPersonalStatus(state.participants.get(interaction.user.id)),
        ephemeral: true,
      });
    }

    if (interaction.customId !== `${state.commandKey}_attack`) return;

    if (state.defeated || state.hp <= 0) {
      return interaction.reply({
        content: 'Boss nay da bi ha roi.',
        ephemeral: true,
      });
    }

    const participant = await hydrateParticipant(state, interaction.user);
    const now = Date.now();
    const revived = reviveParticipantIfNeeded(participant, now);
    if (revived) participant.stunnedUntil = 0;

    if (participant.deadUntil > now) {
      return interaction.reply({
        content: `Ban dang nam xuong. Con ${formatDuration(participant.deadUntil - now)} nua moi hoi sinh.`,
        ephemeral: true,
      });
    }

    if (participant.stunnedUntil > now) {
      return interaction.reply({
        content: `Ban dang bi choang. Con ${formatDuration(participant.stunnedUntil - now)} nua moi hanh dong duoc.`,
        ephemeral: true,
      });
    }

    if (state.autoAttackers.has(interaction.user.id)) {
      return interaction.reply({
        content: 'Ban dang bat auto danh roi. Dung nut Trang thai de xem HP va trang thai ca nhan.',
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: 'Da vao raid va bat auto danh. Boss se danh nguoc, co the gay choang 5s va ha guc nguoi choi.',
      ephemeral: true,
    });

    const nextDelayMs = await processPlayerAttack(
      state,
      interaction.user,
      bossMessage,
      collector,
      guildId,
      'button'
    );

    if (!state.defeated && state.hp > 0) {
      await scheduleAutoAttack(
        state,
        interaction.user,
        bossMessage,
        collector,
        guildId,
        nextDelayMs || BASE_ATTACK_INTERVAL_MS
      );
    }
  });

  collector.on('end', async (_, reason) => {
    clearAutoAttackers(state);
    clearBossAttackTimer(state);

    if (reason === 'defeated') return;

    ACTIVE_BOSSES.delete(guildId);

    if (state.hp > 0) {
      try {
        await bossMessage.edit({
          embeds: [
            buildBossEmbed(state, 'Het thoi gian, boss da rut lui khoi chien truong.'),
          ],
          components: buildBossButtons(state.commandKey, true),
        });
      } catch (error) {
        console.log(error);
      }
    }
  });
  return true;
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;

  const content = message.content.toLowerCase();
  const commandKey = content.startsWith(PREFIX_TEST_2)
    ? 'testboss002'
    : content.startsWith(PREFIX)
      ? 'testboss001'
      : null;

  if (commandKey) {
    const devIds = parseIdList(process.env.DEVS);
    if (!devIds.includes(message.author.id)) {
      return message.reply('Chi DEVS moi duoc dung lenh `.testboss001` hoac `.testboss002`.');
    }

    const started = await startBossEncounter(message, commandKey);
    if (!started) {
      return message.reply('Server nay dang co boss test roi. Moi nguoi vao danh tiep di.');
    }
    return;
  }

  const activeBoss = ACTIVE_BOSSES.get(message.guild.id);
  if (activeBoss && !activeBoss.defeated && Date.now() < activeBoss.expiresAt) return;

  const roll = Math.random();
  let autoCommandKey = null;
  if (roll < AUTO_BOSS_SPAWN_RATE) autoCommandKey = 'testboss001';
  else if (roll < AUTO_BOSS_SPAWN_RATE + AUTO_MONSTER_SPAWN_RATE) autoCommandKey = 'testboss002';

  if (!autoCommandKey) return;
  await startBossEncounter(message, autoCommandKey);
};
