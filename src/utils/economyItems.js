const ITEMS = {
  camera: {
    key: 'camera',
    name: '🛡️ Camera',
    type: 'guard',
    price: 500,
    desc: 'Tự động bắt cướp trong 24 giờ',
    stack: false,
  },
  lock_basic: {
    key: 'lock_basic',
    name: '🔒 Khóa chống trộm',
    type: 'lock_basic',
    price: 200,
    desc: 'Tăng độ khó khi bị cướp trong 24 giờ',
    stack: false,
  },
  lock_smart: {
    key: 'lock_smart',
    name: '🧠 Khóa thông minh',
    type: 'lock_smart',
    price: 300,
    desc: 'Khóa đảo chiều input trong 24 giờ',
    stack: false,
  },
  lockpick: {
    key: 'lockpick',
    name: '🛠️ Lockpick',
    type: 'lockpick',
    price: 200,
    desc: 'Dụng cụ dùng để đi cướp',
    stack: true,
  },
};

const BOSS_LOOT_ITEMS = {
  iron_blade: {
    key: 'iron_blade',
    name: '⚔️ Kiếm Sắt',
    type: 'iron_blade',
    slot: 'weapon',
    rarity: 'common',
    stat: 'atk',
    statValue: 12,
    desc: 'Vũ khí thường tăng tấn công.',
    stack: true,
  },
  hunter_gloves: {
    key: 'hunter_gloves',
    name: '🧤 Găng Thợ Săn',
    type: 'hunter_gloves',
    slot: 'gloves',
    rarity: 'common',
    stat: 'crit',
    statValue: 4,
    desc: 'Trang bị thường tăng tỉ lệ chí mạng.',
    stack: true,
  },
  rusty_breaker: {
    key: 'rusty_breaker',
    name: '⛑️ Nón Sắt Cũ',
    type: 'rusty_breaker',
    slot: 'helmet',
    rarity: 'common',
    stat: 'armor_pen',
    statValue: 6,
    desc: 'Mũ thường tăng thêm sát thương gây lên boss.',
    stack: true,
  },
  leather_armor: {
    key: 'leather_armor',
    name: '🧥 Áo Da Thợ Săn',
    type: 'leather_armor',
    slot: 'armor',
    rarity: 'common',
    stat: 'atk',
    statValue: 10,
    desc: 'Áo thường giúp tăng tấn công ổn định.',
    stack: true,
  },
  swift_boots: {
    key: 'swift_boots',
    name: '🥾 Giày Lướt Gió',
    type: 'swift_boots',
    slot: 'boots',
    rarity: 'common',
    stat: 'armor_pen',
    statValue: 5,
    desc: 'Giày thường giúp tăng sát thương lên boss.',
    stack: true,
  },
  crimson_spear: {
    key: 'crimson_spear',
    name: '🗡️ Thương Huyết',
    type: 'crimson_spear',
    slot: 'weapon',
    rarity: 'rare',
    stat: 'atk',
    statValue: 24,
    desc: 'Vũ khí hiếm tăng mạnh tấn công.',
    stack: true,
  },
  eagle_scope: {
    key: 'eagle_scope',
    name: '🪖 Mũ Ưng Nhãn',
    type: 'eagle_scope',
    slot: 'helmet',
    rarity: 'rare',
    stat: 'crit',
    statValue: 8,
    desc: 'Mũ hiếm tăng tỉ lệ chí mạng.',
    stack: true,
  },
  drill_edge: {
    key: 'drill_edge',
    name: '🔩 Lưỡi Khoan Xuyên',
    type: 'drill_edge',
    slot: 'boots',
    rarity: 'rare',
    stat: 'armor_pen',
    statValue: 12,
    desc: 'Trang bị hiếm tăng xuyên giáp.',
    stack: true,
  },
  storm_armor: {
    key: 'storm_armor',
    name: '🦺 Giáp Phong Bạo',
    type: 'storm_armor',
    slot: 'armor',
    rarity: 'rare',
    stat: 'atk',
    statValue: 18,
    desc: 'Áo hiếm tăng thêm sức tấn công.',
    stack: true,
  },
  hawk_gloves: {
    key: 'hawk_gloves',
    name: '🧤 Găng Ưng Kích',
    type: 'hawk_gloves',
    slot: 'gloves',
    rarity: 'rare',
    stat: 'crit',
    statValue: 9,
    desc: 'Găng tay hiếm tăng tỉ lệ chí mạng.',
    stack: true,
  },
  titan_greatsword: {
    key: 'titan_greatsword',
    name: '🗡️ Đại Kiếm Titan',
    type: 'titan_greatsword',
    slot: 'weapon',
    rarity: 'epic',
    stat: 'atk',
    statValue: 40,
    desc: 'Vũ khí sử thi tăng sát thương vượt trội.',
    stack: true,
  },
  phantom_mask: {
    key: 'phantom_mask',
    name: '👑 Mũ Ảnh Ma',
    type: 'phantom_mask',
    slot: 'helmet',
    rarity: 'epic',
    stat: 'crit',
    statValue: 14,
    desc: 'Mũ sử thi tăng chí mạng đáng kể.',
    stack: true,
  },
  void_splitter: {
    key: 'void_splitter',
    name: '🌌 Đao Rách Không Gian',
    type: 'void_splitter',
    slot: 'armor',
    rarity: 'epic',
    stat: 'armor_pen',
    statValue: 20,
    desc: 'Trang bị sử thi tăng xuyên giáp mạnh.',
    stack: true,
  },
  warlord_gauntlets: {
    key: 'warlord_gauntlets',
    name: '🥊 Găng Chiến Vương',
    type: 'warlord_gauntlets',
    slot: 'gloves',
    rarity: 'epic',
    stat: 'crit',
    statValue: 15,
    desc: 'Găng tay sử thi tăng mạnh chí mạng.',
    stack: true,
  },
  abyss_boots: {
    key: 'abyss_boots',
    name: '👢 Giày Vực Thẳm',
    type: 'abyss_boots',
    slot: 'boots',
    rarity: 'epic',
    stat: 'armor_pen',
    statValue: 18,
    desc: 'Giày sử thi tăng sát thương gây lên boss.',
    stack: true,
  },
  dragon_king_blade: {
    key: 'dragon_king_blade',
    name: '🐉 Kiếm Vương Long',
    type: 'dragon_king_blade',
    slot: 'weapon',
    rarity: 'legendary',
    stat: 'atk',
    statValue: 65,
    desc: 'Vũ khí huyền thoại tăng tấn công cực lớn.',
    stack: true,
  },
  celestial_eye: {
    key: 'celestial_eye',
    name: '🧤 Găng Thiên Giới',
    type: 'celestial_eye',
    slot: 'gloves',
    rarity: 'legendary',
    stat: 'crit',
    statValue: 22,
    desc: 'Găng tay huyền thoại tăng chí mạng áp đảo.',
    stack: true,
  },
  godslayer_fang: {
    key: 'godslayer_fang',
    name: '🥾 Giày Diệt Thần',
    type: 'godslayer_fang',
    slot: 'boots',
    rarity: 'legendary',
    stat: 'armor_pen',
    statValue: 30,
    desc: 'Giày huyền thoại tăng mạnh sát thương gây lên boss.',
    stack: true,
  },
  celestial_armor: {
    key: 'celestial_armor',
    name: '🛡️ Giáp Thiên Tinh',
    type: 'celestial_armor',
    slot: 'armor',
    rarity: 'legendary',
    stat: 'atk',
    statValue: 52,
    desc: 'Áo huyền thoại tăng lượng lớn tấn công.',
    stack: true,
  },
  crown_of_ruin: {
    key: 'crown_of_ruin',
    name: '👑 Vương Miện Tàn Diệt',
    type: 'crown_of_ruin',
    slot: 'helmet',
    rarity: 'legendary',
    stat: 'crit',
    statValue: 20,
    desc: 'Mũ huyền thoại tăng mạnh tỉ lệ chí mạng.',
    stack: true,
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

const MAX_EQUIPMENT_UPGRADE_LEVEL = 10;
const EQUIPMENT_DOWNGRADE_RATE_ON_FAIL = 50;

const ALL_ITEMS = {
  ...ITEMS,
  ...BOSS_LOOT_ITEMS,
};

const BOSS_LOOT_TABLE = {
  common: ['iron_blade', 'hunter_gloves', 'rusty_breaker', 'leather_armor', 'swift_boots'],
  rare: ['crimson_spear', 'eagle_scope', 'drill_edge', 'storm_armor', 'hawk_gloves'],
  epic: ['titan_greatsword', 'phantom_mask', 'void_splitter', 'warlord_gauntlets', 'abyss_boots'],
  legendary: ['dragon_king_blade', 'celestial_eye', 'godslayer_fang', 'celestial_armor', 'crown_of_ruin'],
};

const EQUIPMENT_SLOTS = ['weapon', 'armor', 'gloves', 'helmet', 'boots'];

const getEquipmentSlotLabel = (slot) => {
  if (slot === 'weapon') return 'Vũ khí';
  if (slot === 'armor') return 'Áo';
  if (slot === 'gloves') return 'Găng tay';
  if (slot === 'helmet') return 'Mũ';
  if (slot === 'boots') return 'Giày';
  return 'Trang bị';
};

const getBossItemLevel = (playerLevel) => {
  const normalizedLevel = Math.max(Number(playerLevel) || 0, 0);
  return Math.max(10, Math.floor(normalizedLevel / 10) * 10 || 10);
};

const getBossItemStatValue = (item, itemLevel = 10) => {
  const safeLevel = Math.max(Number(itemLevel) || 10, 10);
  const tier = Math.max(Math.floor(safeLevel / 10), 1);
  return (item?.statValue || 0) + (tier - 1) * 5;
};

const getEquipmentUpgradeBonus = (item, upgradeLevel = 0) => {
  const safeUpgradeLevel = Math.max(Number(upgradeLevel) || 0, 0);
  const perLevelBonus = Math.max(Math.ceil((item?.statValue || 0) / 6), 1);
  return safeUpgradeLevel * perLevelBonus;
};

const getBossItemTotalStatValue = (item, itemLevel = 10, upgradeLevel = 0) =>
  getBossItemStatValue(item, itemLevel) + getEquipmentUpgradeBonus(item, upgradeLevel);

const getEquipmentUpgradeInfo = (upgradeLevel = 0, item = null) => {
  const currentLevel = Math.max(Number(upgradeLevel) || 0, 0);
  if (currentLevel >= MAX_EQUIPMENT_UPGRADE_LEVEL) return null;

  const bagStyleInfo = BAG_UPGRADE[Math.min(currentLevel + 1, 9)] || BAG_UPGRADE[9];
  const rarityMultiplier = {
    common: 1,
    rare: 1.5,
    epic: 2.2,
    legendary: 3.2,
  };
  const itemLevelValue = Math.max(item?.itemLevel || 10, 10);
  const basePrice = bagStyleInfo.price;
  const rarityScale = rarityMultiplier[item?.rarity] || 1;
  const price = Math.round(basePrice * rarityScale + itemLevelValue * 20 + currentLevel * 150);

  return {
    successRate: bagStyleInfo.successRate,
    price,
  };
};

const getBossItemSellPrice = (item, itemLevel = 10) => {
  const rarityBase = {
    common: 350,
    rare: 800,
    epic: 1800,
    legendary: 4000,
  };

  const basePrice = rarityBase[item?.rarity] || 200;
  return basePrice + Math.max(Number(itemLevel) || 10, 10) * 25;
};

const getItemByType = (type) =>
  Object.values(ALL_ITEMS).find((item) => item.type === type) || null;

const getBossLootByKey = (key) => BOSS_LOOT_ITEMS[key] || null;

const getBossLootPool = (rarity) =>
  (BOSS_LOOT_TABLE[rarity] || []).map((key) => BOSS_LOOT_ITEMS[key]).filter(Boolean);

const getInventorySlots = (level) => {
  const normalizedLevel = Math.max(Number(level) || 1, 1);

  if (normalizedLevel === 1) return 4;
  if (normalizedLevel <= 4) return 4 + (normalizedLevel - 1);
  if (normalizedLevel <= 8) return 7 + (normalizedLevel - 4) * 2;
  return 15 + (normalizedLevel - 8) * 3;
};

const formatDuration = (ms) => {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return `${h}h ${m}m ${s}s`;
};

const getBagUpgradeInfo = (currentLevel) => BAG_UPGRADE[currentLevel] || null;

module.exports = {
  BAG_UPGRADE,
  BOSS_LOOT_ITEMS,
  BOSS_LOOT_TABLE,
  EQUIPMENT_SLOTS,
  EQUIPMENT_DOWNGRADE_RATE_ON_FAIL,
  ITEMS,
  MAX_EQUIPMENT_UPGRADE_LEVEL,
  getBossItemTotalStatValue,
  getEquipmentSlotLabel,
  getEquipmentUpgradeBonus,
  getEquipmentUpgradeInfo,
  getBossItemLevel,
  getBossItemSellPrice,
  getBossItemStatValue,
  getBagUpgradeInfo,
  getBossLootByKey,
  getBossLootPool,
  getItemByType,
  getInventorySlots,
  formatDuration,
};
