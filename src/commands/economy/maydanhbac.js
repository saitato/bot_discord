const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');

const User = require('../../models/User');

const cooldowns = new Set();

// 🎰 tỉ lệ (càng nhiều càng dễ ra)
const pool = [
	'🍒','🍒','🍒','🍒',
	'🍋','🍋','🍋',
	'🍉','🍉',
	'💎',
	'7️⃣'
];

function randomSlot() {
	return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
	name: 'maydanhbac',
	description: 'Máy đánh bạc 🎰',

	callback: async (client, interaction) => {
		if (!interaction.inGuild()) {
			return interaction.reply({
				content: '❌ Chỉ dùng trong server!',
				ephemeral: true,
			});
		}

		if (cooldowns.has(interaction.user.id)) {
			return interaction.reply('⚠️ Bạn đang quay rồi!');
		}

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId('spin')
				.setLabel('🎰 Quay')
				.setStyle(ButtonStyle.Success)
		);

		await interaction.reply({
			embeds: [
				new EmbedBuilder()
					.setTitle('🎰 MÁY ĐÁNH BẠC')
					.setDescription('Bấm 🎰 để thử vận may!')
					.setColor('Purple'),
			],
			components: [row],
		});

		const msg = await interaction.fetchReply();

		const collector = msg.createMessageComponentCollector({
			time: 60000,
		});

		collector.on('collect', async (i) => {
			if (i.user.id !== interaction.user.id) {
				return i.reply({
					content: '❌ Không phải lượt của bạn!',
					ephemeral: true,
				});
			}

			if (i.customId === 'spin') {
				const modal = new ModalBuilder()
					.setCustomId('modal_slot')
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
						filter: m => m.user.id === i.user.id,
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

					const user = await User.findOne({
						userId: i.user.id,
						guildId: interaction.guild.id,
					});

					if (!user || user.balance < amount) {
						return modalSubmit.reply({
							content: '❌ Không đủ Wcoin!',
							ephemeral: true,
						});
					}

					cooldowns.add(i.user.id);

					// trừ tiền
					user.balance -= amount;
					await user.save();

					await modalSubmit.reply({
						content: `🎰 Đang quay ${amount} Wcoin...`,
						ephemeral: true,
					});

					// 🎲 animation
					for (let j = 0; j < 8; j++) {
						const fake = [randomSlot(), randomSlot(), randomSlot()];

						await interaction.editReply({
							embeds: [
								new EmbedBuilder()
									.setTitle('🎰 MÁY ĐÁNH BẠC')
									.setDescription(`🎲 ${fake.join(' | ')}`)
									.setColor('Yellow'),
							],
						});

						await new Promise(r => setTimeout(r, 200 + j * 50));
					}

					// 🎯 kết quả thật
					const result = [randomSlot(), randomSlot(), randomSlot()];

					let reward = 0;

					// 🏆 3 giống nhau
					if (result[0] === result[1] && result[1] === result[2]) {
						if (result[0] === '7️⃣') reward = amount * 12; // jackpot
						else if (result[0] === '💎') reward = amount * 6;
						else reward = amount * 3;
					}
					// 🎯 2 giống nhau (giảm payout)
					else if (
						result[0] === result[1] ||
						result[1] === result[2] ||
						result[0] === result[2]
					) {
						reward = Math.floor(amount * 1.5);
					}

					let text = `🎰 ${result.join(' | ')}\n\n`;

					if (reward > 0) {
						user.balance += reward;
						text += `🎉 Thắng +${reward} Wcoin`;
					} else {
						text += `💀 Thua -${amount} Wcoin`;
					}

					await user.save();

					await interaction.editReply({
						embeds: [
							new EmbedBuilder()
								.setTitle('🎰 KẾT QUẢ MÁY ĐÁNH BẠC')
								.setDescription(text)
								.setColor(reward > 0 ? 'Green' : 'Red'),
						],
						components: [row],
					});

					cooldowns.delete(i.user.id);
				} catch {
					cooldowns.delete(i.user.id);
				}
			}
		});
	},
};