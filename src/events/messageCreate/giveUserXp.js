const { Client, Message, EmbedBuilder } = require('discord.js');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const Level = require('../../models/Level');
const User = require('../../models/User');

const cooldowns = new Set();

function getRandomXp(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 🎨 thanh XP
function createXpBar(current, required, size = 20) {
	const progress = Math.round((current / required) * size);
	const empty = size - progress;

	return `🟩`.repeat(progress) + `⬜`.repeat(empty);
}

/**
 * @param {Client} client
 * @param {Message} message
 */
module.exports = async (client, message) => {
	if (!message.inGuild() || message.author.bot) return;

	// ⛔ cooldown 30s / user
	if (cooldowns.has(message.author.id)) return;

	const xpToGive = getRandomXp(5, 15);
	const query = { userId: message.author.id, guildId: message.guild.id };

	try {
		let level = await Level.findOne(query);
		let user = await User.findOne(query);

		// 🆕 tạo mới user
		if (!level) {
			level = new Level({ ...query, xp: xpToGive, level: 1 });
			await level.save();

			if (!user) {
				user = new User({ ...query, balance: 0 });
				await user.save();
			}

			cooldowns.add(message.author.id);
			setTimeout(() => cooldowns.delete(message.author.id), 30000);
			return;
		}

		// ➕ cộng XP
		level.xp += xpToGive;

		let requiredXp = calculateLevelXp(level.level);

		// 🎉 LEVEL UP
		if (level.xp >= requiredXp) {
			const overflowXp = level.xp - requiredXp;

			level.level += 1;
			level.xp = overflowXp;

			const reward = level.level * 100;

			if (!user) {
				user = new User({ ...query, balance: 0 });
			}

			user.balance += reward;

			await level.save();
			await user.save();

			// 🎨 XP BAR mới
			requiredXp = calculateLevelXp(level.level);
			const xpBar = createXpBar(level.xp, requiredXp);

			const embed = new EmbedBuilder()
				.setTitle('🎉 LEVEL UP!')
				.setColor('Gold')
				.setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
				.setDescription(
					`🔥 Bạn đã lên **Level ${level.level}**!\n\n` +
					`📊 **XP:** ${level.xp}/${requiredXp}\n` +
					`${xpBar}`
				)
				.addFields({
					name: '🎁 Thưởng',
					value: `+${reward} Wcoin`,
					inline: true
				})
				.setFooter({ text: `Tiếp tục chat để lên level!` })
				.setTimestamp();

			// 📩 gửi DM riêng
			try {
				await message.author.send({ embeds: [embed] });
			} catch {
				console.log('User tắt DM');
			}
		} else {
			await level.save();
		}

		// ⛔ cooldown
		cooldowns.add(message.author.id);
		setTimeout(() => cooldowns.delete(message.author.id), 30000);

	} catch (error) {
		console.log(`Error giving xp: ${error}`);
	}
};