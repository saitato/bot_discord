const Equipment = require('../../models/Equipment');
const Item = require('../../models/Item');
const { BOSS_LOOT_ITEMS } = require('../../utils/economyItems');

function parseIdList(value) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;
  if (message.content.trim().toLowerCase() !== '.resettb') return;

  const devIds = parseIdList(process.env.DEVS);
  if (!devIds.includes(message.author.id)) {
    return message.reply('Chỉ DEVS mới được dùng lệnh này.');
  }

  try {
    const bossEquipmentTypes = Object.keys(BOSS_LOOT_ITEMS);
    const [deletedItems, deletedEquipment] = await Promise.all([
      Item.deleteMany({ type: { $in: bossEquipmentTypes } }),
      Equipment.deleteMany({}),
    ]);

    return message.reply(
      [
        'Đã xóa toàn bộ dữ liệu trang bị boss.',
        `- Item trang bị đã xóa: ${deletedItems.deletedCount || 0}`,
        `- Hồ sơ trang bị đã reset: ${deletedEquipment.deletedCount || 0}`,
      ].join('\n')
    );
  } catch (error) {
    console.log(error);
    return message.reply('Không thể xóa dữ liệu trang bị lúc này.');
  }
};
