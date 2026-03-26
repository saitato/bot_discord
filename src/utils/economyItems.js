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

const getItemByType = (type) =>
  Object.values(ITEMS).find((item) => item.type === type) || null;

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
  ITEMS,
  getBagUpgradeInfo,
  getItemByType,
  getInventorySlots,
  formatDuration,
};
