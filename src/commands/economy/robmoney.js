const {
	ApplicationCommandOptionType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');

const User = require('../../models/User');
const Item = require('../../models/Item');

const directions = ['up', 'down', 'left', 'right'];

const arrows = {
	up: '⬆️',
	down: '⬇️',
	left: '⬅️',
	right: '➡️',
};

const reverse = {
	up: 'down',
	down: 'up',
	left: 'right',
	right: 'left',
};

function randDir() {
	return directions[Math.floor(Math.random() * directions.length)];
}

function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

module.exports = {
	name: 'robmoney',
	description: 'Cướp tiền bằng cạy khóa 😈',

	options: [
		{
			name: 'target',
			description: 'Người bạn muốn cướp',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'amount',
			description: 'Số tiền muốn cướp',
			type: ApplicationCommandOptionType.Integer,
			required: true,
			minValue: 50,
		},
	],

	callback: async (client, interaction) => {
		if (!interaction.inGuild()) return;

		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		const target = interaction.options.getUser('target');
		let money = interaction.options.getInteger('amount');

		if (target.id === userId) {
			return interaction.reply({ content: '❌ Không thể tự cướp!', ephemeral: true });
		}

		await interaction.deferReply();

		const user = await User.findOne({ userId, guildId });
		const targetUser = await User.findOne({ userId: target.id, guildId });

		if (!user || !targetUser || targetUser.balance <= 0) {
			return interaction.editReply('❌ Không thể cướp!');
		}

		if (money > targetUser.balance) money = targetUser.balance;

		const now = Date.now();

		// ================= ITEM TARGET =================
		const hasCamera = await Item.findOne({
			userId: target.id,
			guildId,
			type: 'guard',
			$or: [{ expiresAt: 0 }, { expiresAt: { $gt: now } }],
		});

		const hasLockBasic = await Item.findOne({
			userId: target.id,
			guildId,
			type: 'lock_basic',
			$or: [{ expiresAt: 0 }, { expiresAt: { $gt: now } }],
		});

		const hasLockSmart = await Item.findOne({
			userId: target.id,
			guildId,
			type: 'lock_smart',
			$or: [{ expiresAt: 0 }, { expiresAt: { $gt: now } }],
		});

		// ================= CAMERA =================
		if (hasCamera) {
			const penalty = Math.floor(money * 0.5);

			user.balance -= penalty;
			targetUser.balance += penalty;

			await user.save();
			await targetUser.save();

			return interaction.editReply(
				`📹 Camera phát hiện!\n🚔 Bạn bị bắt!\n💸 Mất ${penalty} Wcoin`
			);
		}

		// ================= LOCKPICK =================
		const lockpick = await Item.findOne({
			userId,
			guildId,
			type: 'lockpick',
		});

		if (!lockpick || lockpick.quantity <= 0) {
			return interaction.editReply('❌ Bạn cần **Lockpick**!');
		}

		// 🔥 TRỪ 1 LOCKPICK
		lockpick.quantity -= 1;

		if (lockpick.quantity <= 0) {
			await lockpick.deleteOne();
		} else {
			await lockpick.save();
		}

		await interaction.followUp({
			content: '🛠️ Đã dùng 1 Lockpick',
			ephemeral: true,
		});

		// ================= ĐỘ KHÓ =================
		let length = Math.min(Math.max(Math.floor(money / 200), 3), 10);

		if (hasLockBasic) length *= 2;

		// 🎲 tạo mã
		let code = [];
		for (let i = 0; i < length; i++) {
			code.push(randDir());
		}

		// 🧠 đảo chiều
		if (hasLockSmart) {
			code = code.map(d => reverse[d]);
		}

		// ================= UI =================
		let info = `🔐 Đang cạy khóa...\n`;

		if (hasLockBasic) info += `🔒 Khóa chống trộm (x2 độ dài)\n`;
		if (hasLockSmart) info += `🧠 Khóa thông minh (đảo chiều)\n`;
		if (!hasLockBasic && !hasLockSmart) info += `❌ Không có khóa`;

		await interaction.editReply(info);

		await sleep(1000);

		await interaction.editReply(code.map(d => arrows[d]).join(' '));

		await sleep(1000);

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('up').setLabel('⬆️').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('down').setLabel('⬇️').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('left').setLabel('⬅️').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('right').setLabel('➡️').setStyle(ButtonStyle.Secondary),
		);

		await interaction.editReply({
			content: `🔁 Nhập lại mã (${length} bước)`,
			components: [row],
		});

		const msg = await interaction.fetchReply();

		let input = [];

		const collector = msg.createMessageComponentCollector({ time: 20000 });

		collector.on('collect', async (i) => {
			if (i.user.id !== userId)
				return i.reply({ content: '❌ Không phải bạn!', ephemeral: true });

			input.push(i.customId);
			await i.deferUpdate();

			// ❌ sai
			if (input[input.length - 1] !== code[input.length - 1]) {
				collector.stop();

				const lost = Math.floor(money * 0.2);
				user.balance -= lost;
				await user.save();

				return interaction.editReply({
					content: `💥 Sai! Mất ${lost} Wcoin`,
					components: [],
				});
			}

			// ✅ đúng hết
			if (input.length === code.length) {
				collector.stop();

				targetUser.balance -= money;
				user.balance += money;

				await targetUser.save();
				await user.save();

				return interaction.editReply({
					content: `💰 Thành công! +${money} Wcoin`,
					components: [],
				});
			}
		});

		collector.on('end', async () => {
			if (input.length !== code.length) {
				await interaction.editReply({
					content: `⏳ Hết giờ! Thất bại`,
					components: [],
				});
			}
		});
	},
};