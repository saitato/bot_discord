const ITEMS = {
  camera: {
    key: 'camera',
    name: 'Camera',
    type: 'guard',
    price: 500,
    desc: 'Tu dong bat cuop trong 24 gio',
    stack: false,
  },
  lock_basic: {
    key: 'lock_basic',
    name: 'Khoa chong trom',
    type: 'lock_basic',
    price: 200,
    desc: 'Tăng độ khó khi bị cướp trong 24 giờ',
    stack: false,
  },
  lock_smart: {
    key: 'lock_smart',
    name: 'Khoa thong minh',
    type: 'lock_smart',
    price: 300,
    desc: 'Khoa dao chieu input trong 24 gio',
    stack: false,
  },
  lockpick: {
    key: 'lockpick',
    name: 'Lockpick',
    type: 'lockpick',
    price: 200,
    desc: 'Dung cu de di cuop',
    stack: true,
  },
};

const UPGRADE_STONE_RARITIES = {
  common: { label: 'Thường', successBonus: 0 },
  rare: { label: 'Hiếm', successBonus: 4 },
  epic: { label: 'Sử thi', successBonus: 8 },
  legendary: { label: 'Huyền thoại', successBonus: 12 },
};

function getUpgradeStoneType(rarity = 'common') {
  return `upgrade_stone_${rarity}`;
}

const MATERIAL_ITEMS = Object.keys(UPGRADE_STONE_RARITIES).reduce((acc, rarity) => {
  const type = getUpgradeStoneType(rarity);
  acc[type] = {
    key: type,
    name: `Đá nâng cấp ${UPGRADE_STONE_RARITIES[rarity].label}`,
    type,
    rarity,
    desc: `Nguyên liệu dùng để nâng cấp trang bị boss, cộng thêm ${UPGRADE_STONE_RARITIES[rarity].successBonus}% tỉ lệ thành công.`,
    stack: true,
  };
  return acc;
}, {});

const LEVEL_TIERS = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const MAX_EQUIPMENT_UPGRADE_LEVEL = 10;
const EQUIPMENT_DOWNGRADE_RATE_ON_FAIL = 50;
const EQUIPMENT_SLOTS = ['weapon', 'gloves', 'helmet', 'boots', 'armor', 'ring'];

const SLOT_CONFIGS = {
  weapon: {
    label: 'Vũ khí',
    stat: 'atk',
    baseByLevel: {
      1: 3,
      10: 10,
      20: 16,
      30: 22,
      40: 28,
      50: 34,
      60: 41,
      70: 48,
      80: 56,
      90: 64,
      100: 73,
    },
    upgradePerLevel: 2.2,
  },
  gloves: {
    label: 'Găng tay',
    stat: 'atk_percent',
    baseByLevel: {
      1: 1,
      10: 3,
      20: 4.8,
      30: 6.6,
      40: 8.4,
      50: 10.2,
      60: 12.3,
      70: 14.4,
      80: 16.8,
      90: 19.2,
      100: 22,
    },
    upgradePerLevel: 0.75,
  },
  helmet: {
    label: 'Mũ',
    stat: 'crit',
    baseByLevel: {
      1: 0.8,
      10: 2.5,
      20: 4,
      30: 5.5,
      40: 7,
      50: 8.5,
      60: 10.2,
      70: 11.9,
      80: 13.8,
      90: 15.7,
      100: 17.8,
    },
    upgradePerLevel: 0.65,
  },
  boots: {
    label: 'Giày',
    stat: 'attack_speed',
    baseByLevel: {
      1: 2,
      10: 6,
      20: 10,
      30: 14,
      40: 18,
      50: 22,
      60: 27,
      70: 32,
      80: 38,
      90: 44,
      100: 50,
    },
    upgradePerLevel: 1.3,
  },
  armor: {
    label: 'Áo',
    stat: 'hp',
    baseByLevel: {
      1: 40,
      10: 110,
      20: 190,
      30: 280,
      40: 380,
      50: 490,
      60: 610,
      70: 740,
      80: 880,
      90: 1030,
      100: 1190,
    },
    upgradePerLevel: 35,
  },
  ring: {
    label: 'Nhẫn',
    stat: 'crit_damage',
    baseByLevel: {
      1: 3,
      10: 8,
      20: 13,
      30: 18,
      40: 23,
      50: 28,
      60: 34,
      70: 40,
      80: 47,
      90: 54,
      100: 62,
    },
    upgradePerLevel: 2.5,
  },
};

const RARITY_CONFIGS = {
  common: { label: 'Thường', multiplier: 1 },
  rare: { label: 'Hiếm', multiplier: 1.22 },
  epic: { label: 'Sử thi', multiplier: 1.5 },
  legendary: { label: 'Huyền thoại', multiplier: 1.85 },
};

const SET_CONFIGS = {
  destroyer: {
    label: 'Hủy Diệt',
    bonuses: {
      2: { armor_pen: 8 },
      3: { armor_pen: 15 },
    },
    slotNames: {
      weapon: 'Kiếm Hủy Diệt',
      gloves: 'Găng Hủy Diệt',
      helmet: 'Mũ Hủy Diệt',
      boots: 'Giày Hủy Diệt',
      armor: 'Áo Hủy Diệt',
      ring: 'Nhẫn Hủy Diệt',
    },
  },
  arcanist: {
    label: 'Ma Năng',
    bonuses: {
      2: { skill_damage: 8 },
      3: { skill_damage: 15 },
    },
    slotNames: {
      weapon: 'Kiếm Ma Năng',
      gloves: 'Găng Ma Năng',
      helmet: 'Mũ Ma Năng',
      boots: 'Giày Ma Năng',
      armor: 'Áo Ma Năng',
      ring: 'Nhẫn Ma Năng',
    },
  },
  chrono: {
    label: 'Thời Không',
    bonuses: {
      2: { cooldown_reduction: 8 },
      3: { cooldown_reduction: 15 },
    },
    slotNames: {
      weapon: 'Kiếm Thời Không',
      gloves: 'Găng Thời Không',
      helmet: 'Mũ Thời Không',
      boots: 'Giày Thời Không',
      armor: 'Áo Thời Không',
      ring: 'Nhẫn Thời Không',
    },
  },
  phantom: {
    label: 'Ảo Ảnh',
    bonuses: {
      2: { dodge: 8 },
      3: { dodge: 15 },
    },
    slotNames: {
      weapon: 'Kiếm Ảo Ảnh',
      gloves: 'Găng Ảo Ảnh',
      helmet: 'Mũ Ảo Ảnh',
      boots: 'Giày Ảo Ảnh',
      armor: 'Áo Ảo Ảnh',
      ring: 'Nhẫn Ảo Ảnh',
    },
  },
  guardian: {
    label: 'Bất Diệt',
    bonuses: {
      2: { cc_resist: 10 },
      3: { cc_resist: 18 },
    },
    slotNames: {
      weapon: 'Kiếm Bất Diệt',
      gloves: 'Găng Bất Diệt',
      helmet: 'Mũ Bất Diệt',
      boots: 'Giày Bất Diệt',
      armor: 'Áo Bất Diệt',
      ring: 'Nhẫn Bất Diệt',
    },
  },
  sanguine: {
    label: 'Huyết Nguyệt',
    bonuses: {
      2: { lifesteal: 4 },
      3: { lifesteal: 8 },
    },
    slotNames: {
      weapon: 'Kiếm Huyết Nguyệt',
      gloves: 'Găng Huyết Nguyệt',
      helmet: 'Mũ Huyết Nguyệt',
      boots: 'Giày Huyết Nguyệt',
      armor: 'Áo Huyết Nguyệt',
      ring: 'Nhẫn Huyết Nguyệt',
    },
  },
  piercer: {
    label: 'Phá Giáp',
    bonuses: {
      2: { armor_pen: 6 },
      3: { armor_pen: 12 },
    },
    slotNames: {
      weapon: 'Kiếm Phá Giáp',
      gloves: 'Găng Phá Giáp',
      helmet: 'Mũ Phá Giáp',
      boots: 'Giày Phá Giáp',
      armor: 'Áo Phá Giáp',
      ring: 'Nhẫn Phá Giáp',
    },
  },
};

const BAG_UPGRADE = {
  1: { successRate: 81, price: 1000 },
  2: { successRate: 64, price: 1000 },
  3: { successRate: 50, price: 1000 },
  4: { successRate: 26, price: 1000 },
  5: { successRate: 15, price: 1000 },
  6: { successRate: 7, price: 1000 },
  7: { successRate: 5, price: 1000 },
  8: { successRate: 4, price: 1000 },
  9: { successRate: 3, price: 1000 },
};

function getCombatStatLabel(stat) {
  if (stat === 'atk') return 'ATK';
  if (stat === 'atk_percent') return 'ATK%';
  if (stat === 'hp') return 'HP';
  if (stat === 'crit') return 'Crit';
  if (stat === 'attack_speed') return 'Tốc đánh';
  if (stat === 'cooldown_reduction') return 'Hồi chiêu';
  if (stat === 'dodge') return 'Né tránh';
  if (stat === 'cc_resist') return 'Kháng khống chế';
  if (stat === 'lifesteal') return 'Hút máu';
  if (stat === 'crit_damage') return 'Crit damage';
  if (stat === 'armor_pen') return 'Xuyên giáp';
  if (stat === 'skill_damage') return 'Sát thương kỹ năng';
  return stat || 'Chỉ số';
}

function getStatPrecision(stat) {
  return ['atk', 'hp'].includes(stat) ? 0 : 1;
}

function roundStatValue(stat, value) {
  const precision = getStatPrecision(stat);
  const factor = 10 ** precision;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function createBossLootItems() {
  const generated = {};

  for (const [setKey, setConfig] of Object.entries(SET_CONFIGS)) {
    for (const [slot, slotConfig] of Object.entries(SLOT_CONFIGS)) {
      for (const [rarityKey, rarityConfig] of Object.entries(RARITY_CONFIGS)) {
        const itemKey = `${setKey}_${slot}_${rarityKey}`;
        generated[itemKey] = {
          key: itemKey,
          type: itemKey,
          name: `${setConfig.slotNames[slot]} ${rarityConfig.label}`,
          slot,
          set: setKey,
          rarity: rarityKey,
          stat: slotConfig.stat,
          desc: `${slotConfig.label} thuoc set ${setConfig.label}, tang ${getCombatStatLabel(slotConfig.stat)}.`,
          stack: true,
        };
      }
    }
  }

  return generated;
}

const BOSS_LOOT_ITEMS = createBossLootItems();

const ALL_ITEMS = {
  ...ITEMS,
  ...MATERIAL_ITEMS,
  ...BOSS_LOOT_ITEMS,
};

const BOSS_LOOT_TABLE = Object.keys(RARITY_CONFIGS).reduce((acc, rarity) => {
  acc[rarity] = Object.values(BOSS_LOOT_ITEMS)
    .filter((item) => item.rarity === rarity)
    .map((item) => item.key);
  return acc;
}, {});

function getEquipmentSlotLabel(slot) {
  return SLOT_CONFIGS[slot]?.label || 'Trang bị';
}

function getRarityLabel(rarity) {
  return RARITY_CONFIGS[rarity]?.label || 'Thường';
}

function getSetLabel(setKey) {
  return SET_CONFIGS[setKey]?.label || 'Không set';
}

function getBossItemLevel(playerLevel) {
  const normalizedLevel = Math.max(Number(playerLevel) || 1, 1);
  if (normalizedLevel < 10) return 1;
  return Math.min(100, Math.max(10, Math.floor(normalizedLevel / 10) * 10));
}

function getBaseStatForLevel(item, itemLevel = 1) {
  const slot = item?.slot;
  if (!slot || !SLOT_CONFIGS[slot]) return 0;
  const safeLevel = getBossItemLevel(itemLevel);
  return SLOT_CONFIGS[slot].baseByLevel[safeLevel] || 0;
}

function getBossItemStatValue(item, itemLevel = 1) {
  if (!item?.slot || !item?.stat) return 0;

  const baseValue = getBaseStatForLevel(item, itemLevel);
  const rarityMultiplier = RARITY_CONFIGS[item.rarity]?.multiplier || 1;
  return roundStatValue(item.stat, baseValue * rarityMultiplier);
}

function getEquipmentUpgradeBonus(item, upgradeLevel = 0) {
  if (!item?.slot || !item?.stat) return 0;
  const safeUpgradeLevel = Math.max(Number(upgradeLevel) || 0, 0);
  const perLevelBonus = SLOT_CONFIGS[item.slot]?.upgradePerLevel || 0;
  return roundStatValue(item.stat, safeUpgradeLevel * perLevelBonus);
}

function getBossItemTotalStatValue(item, itemLevel = 1, upgradeLevel = 0) {
  return roundStatValue(
    item?.stat,
    getBossItemStatValue(item, itemLevel) + getEquipmentUpgradeBonus(item, upgradeLevel)
  );
}

function getEquipmentUpgradeInfo(upgradeLevel = 0, item = null) {
  const currentLevel = Math.max(Number(upgradeLevel) || 0, 0);
  if (currentLevel >= MAX_EQUIPMENT_UPGRADE_LEVEL) return null;

  const bagStyleInfo = BAG_UPGRADE[Math.min(currentLevel + 1, 9)] || BAG_UPGRADE[9];
  return {
    successRate: bagStyleInfo.successRate,
    stoneCost: getEquipmentUpgradeStoneCost(item?.itemLevel || 1, item?.rarity, currentLevel),
  };
}

function getUpgradeStoneSuccessBonus(rarity = 'common') {
  return UPGRADE_STONE_RARITIES[rarity]?.successBonus || 0;
}

function getEquipmentUpgradeStoneCost(itemLevel = 1, rarity = 'common', upgradeLevel = 0) {
  const safeUpgradeLevel = Math.max(Number(upgradeLevel) || 0, 0);
  const safeLevel = getBossItemLevel(itemLevel);
  const rarityBase = {
    common: 2,
    rare: 3,
    epic: 5,
    legendary: 7,
  };
  const levelStep = safeLevel === 1 ? 1 : Math.max(1, Math.floor(safeLevel / 20));
  return Math.max(1, (rarityBase[rarity] || 2) + levelStep + safeUpgradeLevel);
}

function getEquipmentDismantleStoneReward(item, itemLevel = 1, upgradeLevel = 0) {
  const baseCost = getEquipmentUpgradeStoneCost(itemLevel, item?.rarity, upgradeLevel);
  const bonusFromUpgrade = Math.max(Number(upgradeLevel) || 0, 0);
  return Math.max(1, Math.floor(baseCost * 0.7) + bonusFromUpgrade);
}

function getBossItemSellPrice(item, itemLevel = 1) {
  const rarityBase = {
    common: 350,
    rare: 800,
    epic: 1800,
    legendary: 4000,
  };

  const basePrice = rarityBase[item?.rarity] || 200;
  return basePrice + getBossItemLevel(itemLevel) * 30;
}

function getItemByType(type) {
  return Object.values(ALL_ITEMS).find((item) => item.type === type) || null;
}

function getBossLootByKey(key) {
  return BOSS_LOOT_ITEMS[key] || null;
}

function getBossLootPool(rarity) {
  return (BOSS_LOOT_TABLE[rarity] || []).map((key) => BOSS_LOOT_ITEMS[key]).filter(Boolean);
}

function getInventorySlots(level) {
  const normalizedLevel = Math.max(Number(level) || 1, 1);
  if (normalizedLevel === 1) return 8;
  if (normalizedLevel <= 5) return 8 + (normalizedLevel - 1) * 3;
  return 20 + (normalizedLevel - 5) * 4;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${h}h ${m}m ${s}s`;
}

function getBagUpgradeInfo(currentLevel) {
  return BAG_UPGRADE[currentLevel] || null;
}

function getSetBonusStats(setKey, pieceCount = 0) {
  const config = SET_CONFIGS[setKey];
  if (!config) return {};

  if (pieceCount >= 3) return { ...(config.bonuses[3] || {}) };
  if (pieceCount >= 2) return { ...(config.bonuses[2] || {}) };
  return {};
}

module.exports = {
  BAG_UPGRADE,
  BOSS_LOOT_ITEMS,
  BOSS_LOOT_TABLE,
  EQUIPMENT_SLOTS,
  EQUIPMENT_DOWNGRADE_RATE_ON_FAIL,
  ITEMS,
  LEVEL_TIERS,
  MATERIAL_ITEMS,
  MAX_EQUIPMENT_UPGRADE_LEVEL,
  RARITY_CONFIGS,
  SET_CONFIGS,
  SLOT_CONFIGS,
  UPGRADE_STONE_RARITIES,
  formatDuration,
  getBagUpgradeInfo,
  getBaseStatForLevel,
  getEquipmentDismantleStoneReward,
  getBossItemLevel,
  getBossItemSellPrice,
  getBossItemStatValue,
  getBossItemTotalStatValue,
  getBossLootByKey,
  getBossLootPool,
  getCombatStatLabel,
  getEquipmentSlotLabel,
  getEquipmentUpgradeBonus,
  getEquipmentUpgradeInfo,
  getEquipmentUpgradeStoneCost,
  getInventorySlots,
  getItemByType,
  getRarityLabel,
  getSetBonusStats,
  getSetLabel,
  getUpgradeStoneSuccessBonus,
  getUpgradeStoneType,
  roundStatValue,
};
