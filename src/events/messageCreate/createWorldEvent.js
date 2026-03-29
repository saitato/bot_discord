const { EmbedBuilder } = require('discord.js');
const { createGuildEvent, EVENT_DEFINITIONS } = require('../../utils/eventMissions');

function parseIdList(value) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) || [];
}

module.exports = async (client, message) => {
  if (!message.inGuild() || message.author.bot) return;

  const match = message.content.trim().toLowerCase().match(/^\.eventw(\d+)$/);
  if (!match) return;

  const devIds = parseIdList(process.env.DEVS);
  if (!devIds.includes(message.author.id)) {
    return message.reply('Chỉ DEVS mới được tạo event bằng lệnh này.');
  }

  const eventIndex = Number(match[1]);
  if (!EVENT_DEFINITIONS[eventIndex]) {
    return message.reply(`Chưa có cấu hình cho event ${eventIndex}.`);
  }

  try {
    const guildEvent = await createGuildEvent(message.guild.id, eventIndex, message.author.id);

    const embed = new EmbedBuilder()
      .setColor('#F59E0B')
      .setTitle(`Đã mở ${guildEvent.title}`)
      .setDescription(
        [
          guildEvent.description,
          '',
          `**Kết thúc:** <t:${Math.floor(new Date(guildEvent.expiresAt).getTime() / 1000)}:F>`,
          `**Lệnh xem:** \`/event\``,
          '',
          guildEvent.missions.map((mission, index) => `${index + 1}. ${mission.label} (${mission.target})`).join('\n'),
        ].join('\n')
      )
      .setFooter({ text: `Event ${guildEvent.eventIndex} chỉ tồn tại trong hôm nay` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.log(error);
    return message.reply('Không tạo được event mới.');
  }
};
