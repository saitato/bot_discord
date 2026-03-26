const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ApplicationCommandOptionType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');

const User = require('../../models/User');
const { addMissionProgress } = require('../../utils/dailyMissions');

const cooldowns = new Set();

function randomDice() {
	return Math.floor(Math.random() * 6) + 1;
}

const icons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function renderBets(bets) {
	let total = 0;
	const sorted = [...bets.values()].sort((a, b) => b.amount - a.amount);

	let text = '';

	for (const bet of sorted) {
		total += bet.amount;
		text += `- ${bet.username}: ${bet.choice.toUpperCase()} ${bet.amount} Wcoin\n`;
	}

	if (!text) text = 'Chưa có ai cược';

	return { total, text };
}

module.exports = {
	name: 'taixiu',
	description: 'Game tài xỉu + chẵn lẻ 🎲',

	options: [
		{
			name: 'time',
			description: 'Thời gian cược (giây)',
			type: ApplicationCommandOptionType.Integer,
			required: false,
			minValue: 5,
			maxValue: 120,
		},
	],

	callback: async (client, interaction) => {
		if (!interaction.inGuild()) {
			return interaction.reply({
				content: '❌ Chỉ dùng trong server!',
				ephemeral: true,
			});
		}

		if (cooldowns.has(interaction.channel.id)) {
			return interaction.reply('⚠️ Game đang diễn ra!');
		}

		cooldowns.add(interaction.channel.id);
		await interaction.deferReply();

		const duration = Math.min(
			Math.max(interaction.options.getInteger('time') || 30, 5),
			120
		);

		let timeLeft = duration;

		const bets = new Map();
		const userChoices = new Map();

		// 🎯 chọn cửa
		const choiceRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('tai').setLabel('🔥 TÀI').setStyle(ButtonStyle.Danger),
			new ButtonBuilder().setCustomId('xiu').setLabel('❄️ XỈU').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('chan').setLabel('⚖️ CHẴN').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('le').setLabel('🎯 LẺ').setStyle(ButtonStyle.Success)
		);

		const betButton = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('bet_custom')
				.setLabel('💰 Nhập tiền')
				.setStyle(ButtonStyle.Success)
		);

		const { total, text } = renderBets(bets);

		const msg = await interaction.editReply({
			embeds: [
				new EmbedBuilder()
					.setTitle('🎲 TÀI XỈU + CHẴN LẺ')
					.setDescription(
						`⏳ Còn ${timeLeft}s\n\n💰 Tổng cược: ${total} Wcoin\n\n👥 Người chơi:\n${text}`
					)
					.setColor('Blue'),
			],
			components: [choiceRow, betButton],
		});

		// ⏳ countdown
		const countdown = setInterval(async () => {
			timeLeft--;

			if (timeLeft <= 0) {
				clearInterval(countdown);
				return;
			}

			const { total, text } = renderBets(bets);

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('🎲 TÀI XỈU + CHẴN LẺ')
						.setDescription(
							`${timeLeft <= 5 ? '⚠️ Sắp hết giờ!\n' : ''}⏳ Còn ${timeLeft}s\n\n💰 Tổng cược: ${total} Wcoin\n\n👥 Người chơi:\n${text}`
						)
						.setColor(timeLeft <= 5 ? 'Red' : 'Blue'),
				],
			});
		}, 1000);

		const collector = msg.createMessageComponentCollector({
			time: duration * 1000,
		});

		collector.on('collect', async (i) => {
			const userId = i.user.id;

			// chọn cửa
			if (['tai', 'xiu', 'chan', 'le'].includes(i.customId)) {
				userChoices.set(userId, { choice: i.customId });

				return i.reply({
					content: `✅ Bạn chọn: ${i.customId.toUpperCase()}`,
					ephemeral: true,
				});
			}

			// nhập tiền
			if (i.customId === 'bet_custom') {
				const modal = new ModalBuilder()
					.setCustomId(`modal_${userId}`)
					.setTitle('Nhập tiền cược');

				const input = new TextInputBuilder()
					.setCustomId('amount')
					.setLabel('Số tiền (Wcoin)')
					.setStyle(TextInputStyle.Short)
					.setRequired(true);

				modal.addComponents(new ActionRowBuilder().addComponents(input));

				await i.showModal(modal);

				try {
					const modalSubmit = await i.awaitModalSubmit({
						time: 15000,
						filter: m => m.user.id === userId,
					});

					const amount = parseInt(
						modalSubmit.fields.getTextInputValue('amount')
					);

					if (isNaN(amount) || amount <= 0)
						return modalSubmit.reply({ content: '❌ Tiền không hợp lệ!', ephemeral: true });

					const choice = userChoices.get(userId);
					if (!choice?.choice)
						return modalSubmit.reply({ content: '❌ Chưa chọn cửa!', ephemeral: true });

					if (bets.has(userId))
						return modalSubmit.reply({ content: '❌ Đã cược!', ephemeral: true });

					const user = await User.findOne({
						userId,
						guildId: interaction.guild.id,
					});

					if (!user || user.balance < amount)
						return modalSubmit.reply({ content: '❌ Không đủ Wcoin!', ephemeral: true });

					user.balance -= amount;
					await user.save();
					await addMissionProgress(userId, interaction.guild.id, 'play_game', 1);

					bets.set(userId, {
						choice: choice.choice,
						amount,
						username: modalSubmit.user.username,
					});

					const { total, text } = renderBets(bets);

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle('🎲 TÀI XỈU + CHẴN LẺ')
								.setDescription(
									`⏳ Còn ${timeLeft}s\n\n💰 Tổng cược: ${total} Wcoin\n\n👥 Người chơi:\n${text}`
								)
								.setColor(timeLeft <= 5 ? 'Red' : 'Blue'),
						],
					});

					return modalSubmit.reply({
						content: `💰 Đã cược ${choice.choice.toUpperCase()} ${amount} Wcoin`,
						ephemeral: true,
					});
				} catch {
					return;
				}
			}
		});

		collector.on('end', async () => {
			clearInterval(countdown);
			cooldowns.delete(interaction.channel.id);

			if (bets.size === 0) {
				return interaction.editReply({
					content: '❌ Không ai cược!',
					components: [],
				});
			}

			// 🎲 animation
			for (let i = 0; i < 8; i++) {
				const fake = [randomDice(), randomDice(), randomDice()];
				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle('🎲 Đang quay...')
							.setDescription(fake.map(d => icons[d - 1]).join(' | '))
							.setColor('Orange'),
					],
					components: [],
				});
				await new Promise(r => setTimeout(r, 300 + i * 80));
			}

			const dice = [randomDice(), randomDice(), randomDice()];
			const sum = dice.reduce((a, b) => a + b, 0);

			const isTai = sum >= 11;
			const isChan = sum % 2 === 0;

			let resultText = `🎰 ${dice.map(d => icons[d - 1]).join(' | ')}\n`;
			resultText += `👉 Tổng: ${sum}\n\n`;

			for (const [userId, bet] of bets) {
				const user = await User.findOne({
					userId,
					guildId: interaction.guild.id,
				});

				if (!user) continue;

				let win = false;

				if (bet.choice === 'tai' && isTai) win = true;
				if (bet.choice === 'xiu' && !isTai) win = true;
				if (bet.choice === 'chan' && isChan) win = true;
				if (bet.choice === 'le' && !isChan) win = true;

				if (win) {
					const reward = bet.amount * 2;
					user.balance += reward;
					await addMissionProgress(userId, interaction.guild.id, 'win_game', 1);
					resultText += `✅ ${bet.username} +${reward} Wcoin\n`;
				} else {
					resultText += `❌ ${bet.username} -${bet.amount} Wcoin\n`;
				}

				await user.save();
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('🎲 KẾT QUẢ')
						.setDescription(resultText)
						.setColor('Gold'),
				],
				components: [],
			});
		});
	},
};
