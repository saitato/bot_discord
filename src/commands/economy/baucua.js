const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
	ApplicationCommandOptionType,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');

const User = require('../../models/User');
const { addMissionProgress } = require('../../utils/dailyMissions');

const items = ['bau', 'cua', 'ca', 'tom', 'ga', 'nai'];

const icons = {
	bau: '🍐',
	cua: '🦀',
	ca: '🐟',
	tom: '🦐',
	ga: '🐓',
	nai: '🦌',
};

const cooldowns = new Set();

function randomItem() {
	return items[Math.floor(Math.random() * items.length)];
}

// 🔥 render danh sách cược
function renderBets(bets) {
	let total = 0;

	const sorted = [...bets.values()].sort((a, b) => b.amount - a.amount);

	let text = '';

	for (const bet of sorted) {
		total += bet.amount;
		text += `- ${bet.username}: ${icons[bet.choice]} ${bet.amount} Wcoin\n`;
	}

	if (!text) text = 'Chưa có ai cược';

	return { total, text };
}

module.exports = {
	name: 'baucua',
	description: 'Game bầu cua 🎲',

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

		// 🎯 chọn con
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId('select_item')
			.setPlaceholder('Chọn con cược')
			.addOptions(
				items.map(i => ({
					label: i,
					value: i,
					emoji: icons[i],
				}))
			);

		// 💰 nút nhập tiền
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
					.setTitle('🎲 BẦU CUA')
					.setDescription(
						`⏳ Còn ${timeLeft}s\n\n💰 Tổng cược: ${total} Wcoin\n\n👥 Người chơi:\n${text}`
					)
					.setColor('Blue'),
			],
			components: [
				new ActionRowBuilder().addComponents(selectMenu),
				betButton,
			],
		});

		// ⏳ countdown realtime
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
						.setTitle('🎲 BẦU CUA')
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

			// 🎯 chọn con
			if (i.isStringSelectMenu()) {
				userChoices.set(userId, { item: i.values[0] });

				return i.reply({
					content: `✅ ${icons[i.values[0]]} ${i.values[0]}`,
					ephemeral: true,
				});
			}

			// 💰 nhập tiền
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

					if (isNaN(amount) || amount <= 0) {
						return modalSubmit.reply({
							content: '❌ Tiền không hợp lệ!',
							ephemeral: true,
						});
					}

					const choice = userChoices.get(userId);
					if (!choice?.item)
						return modalSubmit.reply({
							content: '❌ Chưa chọn con!',
							ephemeral: true,
						});

					if (bets.has(userId))
						return modalSubmit.reply({
							content: '❌ Bạn đã cược!',
							ephemeral: true,
						});

					const user = await User.findOne({
						userId,
						guildId: interaction.guild.id,
					});

					if (!user || user.balance < amount)
						return modalSubmit.reply({
							content: '❌ Không đủ Wcoin!',
							ephemeral: true,
						});

					// trừ tiền
					user.balance -= amount;
					await user.save();
					await addMissionProgress(userId, interaction.guild.id, 'play_game', 1);

					bets.set(userId, {
						choice: choice.item,
						amount,
						username: modalSubmit.user.username,
					});

					// 🔥 update realtime
					const { total, text } = renderBets(bets);

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle('🎲 BẦU CUA')
								.setDescription(
									`⏳ Còn ${timeLeft}s\n\n💰 Tổng cược: ${total} Wcoin\n\n👥 Người chơi:\n${text}`
								)
								.setColor(timeLeft <= 5 ? 'Red' : 'Blue'),
						],
					});

					return modalSubmit.reply({
						content: `💰 Đã cược ${icons[choice.item]} ${amount} Wcoin`,
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
				const fake = [randomItem(), randomItem(), randomItem()];

				await interaction.editReply({
					embeds: [
						new EmbedBuilder()
							.setTitle('🎲 Đang quay...')
							.setDescription(fake.map(i => icons[i]).join(' | '))
							.setColor('Orange'),
					],
					components: [],
				});

				await new Promise(r => setTimeout(r, 300 + i * 80));
			}

			const dice = [randomItem(), randomItem(), randomItem()];
			let result = `🎰 ${dice.map(i => icons[i]).join(' | ')}\n\n`;

			for (const [userId, bet] of bets) {
				const user = await User.findOne({
					userId,
					guildId: interaction.guild.id,
				});

				if (!user) continue;

				const match = dice.filter(d => d === bet.choice).length;

				if (match > 0) {
					const win = match * bet.amount * 2;
					user.balance += win;
					await addMissionProgress(userId, interaction.guild.id, 'win_game', 1);
					result += `✅ ${bet.username} +${win} Wcoin\n`;
				} else {
					result += `❌ ${bet.username} -${bet.amount} Wcoin\n`;
				}

				await user.save();
			}

			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle('🎲 KẾT QUẢ')
						.setDescription(result)
						.setColor('Gold'),
				],
				components: [],
			});
		});
	},
};
