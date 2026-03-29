const { resetGuildEvent } = require('../../utils/eventMissions');

function parseIdList(value) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;
  if (message.content.trim().toLowerCase() !== '.eventrs') return;

  const devIds = parseIdList(process.env.DEVS);
  if (!devIds.includes(message.author.id)) {
    return message.reply('Chỉ DEVS mới được xóa event bằng lệnh này.');
  }

  try {
    await resetGuildEvent(message.guild.id);
    return message.reply('Đã xóa event hiện tại của hôm nay.');
  } catch (error) {
    console.log(error);
    return message.reply('Không xóa được event hiện tại.');
  }
};
