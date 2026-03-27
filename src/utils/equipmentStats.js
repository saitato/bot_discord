const Equipment = require('../models/Equipment');
const Item = require('../models/Item');
const Level = require('../models/Level');
const {
  EQUIPMENT_SLOTS,
  getBossItemTotalStatValue,
  getItemByType,
} = require('./economyItems');

const BASE_MIN_DAMAGE = 100;
const BASE_MAX_DAMAGE = 150;
const LEVEL_DAMAGE_BONUS = 5;
const CRIT_MULTIPLIER = 1.5;

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
    crit: 0,
    armor_pen: 0,
  };

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

    const statValue = getBossItemTotalStatValue(
      meta,
      itemDoc.itemLevel || equipped.itemLevel || 10,
      itemDoc.upgradeLevel || 0
    );
    totals[meta.stat] += statValue;
    equippedItems[slot] = {
      id: itemDoc.id,
      type: itemDoc.type,
      itemLevel: itemDoc.itemLevel || 0,
      upgradeLevel: itemDoc.upgradeLevel || 0,
      meta,
      statValue,
      quantity: itemDoc.quantity || 0,
    };
  }

  const baseMin = BASE_MIN_DAMAGE + level * LEVEL_DAMAGE_BONUS;
  const baseMax = BASE_MAX_DAMAGE + level * LEVEL_DAMAGE_BONUS;
  const totalMin = baseMin + totals.atk + totals.armor_pen;
  const totalMax = baseMax + totals.atk + totals.armor_pen;
  const critChance = Math.max(totals.crit, 0);

  return {
    equipment,
    equippedItems,
    level,
    stats: {
      atk: totals.atk,
      crit: critChance,
      armorPen: totals.armor_pen,
      baseMin,
      baseMax,
      totalMin,
      totalMax,
      critMultiplier: CRIT_MULTIPLIER,
    },
  };
}

module.exports = {
  BASE_MAX_DAMAGE,
  BASE_MIN_DAMAGE,
  CRIT_MULTIPLIER,
  LEVEL_DAMAGE_BONUS,
  getEquippedCombatProfile,
  getOrCreateEquipment,
};
