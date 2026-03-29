const Equipment = require('../models/Equipment');
const Item = require('../models/Item');
const Level = require('../models/Level');
const {
  EQUIPMENT_SLOTS,
  getBossItemTotalStatValue,
  getItemByType,
  getSetBonusStats,
} = require('./economyItems');

const BASE_MIN_DAMAGE = 20;
const BASE_MAX_DAMAGE = 30;
const LEVEL_MIN_DAMAGE_BONUS = 4;
const LEVEL_MAX_DAMAGE_BONUS = 5;
const BASE_HP = 420;
const LEVEL_HP_BONUS = 64;
const BASE_DEF = 14;
const LEVEL_DEF_BONUS = 4;
const DEF_DAMAGE_SCALE = 0.6;
const BASE_CRIT_DAMAGE_PERCENT = 150;
const MAX_CRIT_CHANCE = 75;
const MAX_ATTACK_SPEED = 200;
const MAX_COOLDOWN_REDUCTION = 80;
const MAX_DODGE_CHANCE = 50;
const MAX_CC_RESIST = 60;
const MAX_LIFESTEAL = 25;
const MAX_CRIT_DAMAGE_PERCENT = 250;

async function getOrCreateEquipment(userId, guildId) {
  let equipment = await Equipment.findOne({ userId, guildId });

  if (!equipment) {
    equipment = await Equipment.create({ userId, guildId });
  }

  return equipment;
}

async function getEquippedCombatProfile(userId, guildId) {
  const [equipment, levelData] = await Promise.all([
    getOrCreateEquipment(userId, guildId),
    Level.findOne({ userId, guildId }),
  ]);

  const level = Math.max(levelData?.level || 0, 0);
  const equippedItems = {};
  const totals = {
    atk: 0,
    atk_percent: 0,
    hp: 0,
    crit: 0,
    attack_speed: 0,
    cooldown_reduction: 0,
    dodge: 0,
    cc_resist: 0,
    lifesteal: 0,
    crit_damage: 0,
    armor_pen: 0,
    skill_damage: 0,
  };
  const setCounts = {};

  for (const slot of EQUIPMENT_SLOTS) {
    const equipped = equipment[slot];
    if (!equipped?.itemId) {
      equippedItems[slot] = null;
      continue;
    }

    const itemDoc = await Item.findOne({
      _id: equipped.itemId,
      userId,
      guildId,
      quantity: { $gt: 0 },
    });

    if (!itemDoc) {
      equippedItems[slot] = null;
      continue;
    }

    const meta = getItemByType(itemDoc.type);
    if (!meta?.stat || meta.slot !== slot) {
      equippedItems[slot] = null;
      continue;
    }

    const itemLevel = itemDoc.itemLevel || equipped.itemLevel || 1;
    const upgradeLevel = itemDoc.upgradeLevel || 0;
    const statValue = getBossItemTotalStatValue(meta, itemLevel, upgradeLevel);

    totals[meta.stat] += statValue;
    if (meta.set) {
      setCounts[meta.set] = (setCounts[meta.set] || 0) + 1;
    }

    equippedItems[slot] = {
      id: itemDoc.id,
      type: itemDoc.type,
      itemLevel,
      upgradeLevel,
      meta,
      statValue,
      quantity: itemDoc.quantity || 0,
    };
  }

  const activeSetBonuses = [];
  for (const [setKey, pieceCount] of Object.entries(setCounts)) {
    const bonusStats = getSetBonusStats(setKey, pieceCount);
    if (!Object.keys(bonusStats).length) continue;

    Object.entries(bonusStats).forEach(([stat, value]) => {
      totals[stat] = (totals[stat] || 0) + value;
    });

    activeSetBonuses.push({
      setKey,
      pieces: pieceCount,
      stats: bonusStats,
    });
  }

  const cappedCrit = Math.min(Math.max(totals.crit, 0), MAX_CRIT_CHANCE);
  const cappedAttackSpeed = Math.min(Math.max(totals.attack_speed, 0), MAX_ATTACK_SPEED);
  const cappedCooldownReduction = Math.min(Math.max(totals.cooldown_reduction, 0), MAX_COOLDOWN_REDUCTION);
  const cappedDodge = Math.min(Math.max(totals.dodge, 0), MAX_DODGE_CHANCE);
  const cappedCcResist = Math.min(Math.max(totals.cc_resist, 0), MAX_CC_RESIST);
  const cappedLifesteal = Math.min(Math.max(totals.lifesteal, 0), MAX_LIFESTEAL);
  const critDamagePercent = Math.min(
    BASE_CRIT_DAMAGE_PERCENT + Math.max(totals.crit_damage, 0),
    MAX_CRIT_DAMAGE_PERCENT
  );

  const baseMin = BASE_MIN_DAMAGE + (level * LEVEL_MIN_DAMAGE_BONUS);
  const baseMax = BASE_MAX_DAMAGE + (level * LEVEL_MAX_DAMAGE_BONUS);
  const baseHp = BASE_HP + (level * LEVEL_HP_BONUS);
  const baseDef = BASE_DEF + (level * LEVEL_DEF_BONUS);
  const attackMultiplier = 1 + (Math.max(totals.atk_percent, 0) / 100);
  const armorPenMultiplier = 1 + (Math.max(totals.armor_pen, 0) / 100);
  const attackMin = Math.floor((baseMin + Math.max(totals.atk, 0)) * attackMultiplier);
  const attackMax = Math.floor((baseMax + Math.max(totals.atk, 0)) * attackMultiplier);
  const totalMin = Math.floor(attackMin * armorPenMultiplier);
  const totalMax = Math.floor(attackMax * armorPenMultiplier);
  const totalHp = Math.round(baseHp + Math.max(totals.hp, 0));
  const totalDef = Math.round(baseDef);
  const damageTakenMultiplier = getDefenseDamageMultiplier(totalDef);
  const damageReductionPercent = Number(((1 - damageTakenMultiplier) * 100).toFixed(1));

  return {
    equipment,
    equippedItems,
    level,
    setCounts,
    activeSetBonuses,
    stats: {
      atk: Number(Math.max(totals.atk, 0).toFixed(1)),
      atkPercent: Number(Math.max(totals.atk_percent, 0).toFixed(1)),
      hp: totalHp,
      hpBase: Math.round(baseHp),
      hpBonus: Math.round(Math.max(totals.hp, 0)),
      def: totalDef,
      defBase: Math.round(baseDef),
      damageTakenMultiplier: Number(damageTakenMultiplier.toFixed(4)),
      damageReductionPercent,
      crit: Number(cappedCrit.toFixed(1)),
      attackSpeed: Number(cappedAttackSpeed.toFixed(1)),
      cooldownReduction: Number(cappedCooldownReduction.toFixed(1)),
      dodge: Number(cappedDodge.toFixed(1)),
      ccResist: Number(cappedCcResist.toFixed(1)),
      lifesteal: Number(cappedLifesteal.toFixed(1)),
      critDamageBonus: Number(Math.max(totals.crit_damage, 0).toFixed(1)),
      critDamagePercent: Number(critDamagePercent.toFixed(1)),
      armorPen: Number(Math.max(totals.armor_pen, 0).toFixed(1)),
      skillDamage: Number(Math.max(totals.skill_damage, 0).toFixed(1)),
      baseMin,
      baseMax,
      totalMin,
      totalMax,
      critMultiplier: Number((critDamagePercent / 100).toFixed(2)),
    },
  };
}

function getDefenseDamageMultiplier(def = 0, scale = DEF_DAMAGE_SCALE) {
  const safeDef = Math.max(Number(def) || 0, 0);
  const safeScale = Math.max(Number(scale) || 0, 0);
  return 100 / (100 + (safeDef * safeScale));
}

function getDamageAfterDefense(rawDamage, def = 0, scale = DEF_DAMAGE_SCALE) {
  const safeDamage = Math.max(Number(rawDamage) || 0, 0);
  const multiplier = getDefenseDamageMultiplier(def, scale);
  return Math.max(1, Math.floor(safeDamage * multiplier));
}

function rollDodgeChance(dodgeChance = 0) {
  const safeChance = Math.max(Number(dodgeChance) || 0, 0);
  return Math.random() * 100 < safeChance;
}

function getReducedControlDuration(baseDurationMs, ccResist = 0) {
  const safeDuration = Math.max(Number(baseDurationMs) || 0, 0);
  const safeResist = Math.min(Math.max(Number(ccResist) || 0, 0), MAX_CC_RESIST);
  return Math.max(0, Math.round(safeDuration * (1 - (safeResist / 100))));
}

module.exports = {
  BASE_DEF,
  DEF_DAMAGE_SCALE,
  BASE_HP,
  BASE_CRIT_DAMAGE_PERCENT,
  BASE_MAX_DAMAGE,
  BASE_MIN_DAMAGE,
  LEVEL_DEF_BONUS,
  LEVEL_HP_BONUS,
  LEVEL_MAX_DAMAGE_BONUS,
  LEVEL_MIN_DAMAGE_BONUS,
  MAX_ATTACK_SPEED,
  MAX_CC_RESIST,
  MAX_COOLDOWN_REDUCTION,
  MAX_CRIT_CHANCE,
  MAX_CRIT_DAMAGE_PERCENT,
  MAX_DODGE_CHANCE,
  MAX_LIFESTEAL,
  getDamageAfterDefense,
  getDefenseDamageMultiplier,
  getEquippedCombatProfile,
  getReducedControlDuration,
  getOrCreateEquipment,
  rollDodgeChance,
};
