const {
	Client,
	Interaction,
	ApplicationCommandOptionType,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');

const User = require('../../models/User');

const cooldowns = new Set();

function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
	name: 'robmoney',
	description: 'Cướp tiền người khác',
	options: [
		{
			name: 'target-user',
			description: 'Bạn muốn cướp của ai?',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
	],

	/**
	 * @param {Client} client
	 * @param {Interaction} interaction
	 */
	callback: async (client, interaction) => {
		if (!interaction.inGuild()) {
			return interaction.reply({
				content: 'Chỉ dùng trong server!',
				ephemeral: true,
			});
		}

		const target = interaction.options.getUser('target-user');

		// ❌ không được tự cướp
		if (target.id === interaction.user.id) {
			return interaction.reply({
				content: 'Bạn không thể tự cướp chính mình!',
				ephemeral: true,
			});
		}

		// ⏳ cooldown theo user
		if (cooldowns.has(interaction.user.id)) {
			return interaction.reply({
				content: 'Bạn vừa cướp xong, đợi 1h nữa!',
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		const queryUser = {
			userId: interaction.user.id,
			guildId: interaction.guild.id,
		};

		const queryTarget = {
			userId: target.id,
			guildId: interaction.guild.id,
		};

		const userRob = await User.findOne(queryUser);
		const userTarget = await User.findOne(queryTarget);

		// ❌ chưa có tài khoản
		if (!userRob) {
			return interaction.editReply('Bạn chưa có tiền để đi cướp!');
		}

		if (!userTarget) {
			return interaction.editReply('Người này không có tiền để cướp!');
		}

		// 💸 random tiền
		let moneyRob = getRandom(100, 500);

		if (userTarget.balance <= 0) {
			return interaction.editReply('Người này nghèo quá rồi!');
		}

		if (moneyRob > userTarget.balance) {
			moneyRob = userTarget.balance;
		}

		// 🎯 % bị bắt (30%)
		const failChance = Math.random();

		const msg = await interaction.editReply({
			content: `🚨 ${interaction.user.username} đang cướp ${target.username}!\n⏳ Bạn có 60s để phản ứng!`,
			components: [
				new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId('catch')
						.setLabel('Bắt cướp')
						.setStyle(ButtonStyle.Danger),
					new ButtonBuilder()
						.setCustomId('cancel')
						.setLabel('Huỷ')
						.setStyle(ButtonStyle.Secondary)
				),
			],
		});

		const collector = msg.createMessageComponentCollector({
			time: 60000,
		});

		let caught = false;
		let cancelled = false;

		collector.on('collect', async (btn) => {
			await btn.deferUpdate();

			// 👮 bị bắt
			if (btn.customId === 'catch') {
				if (btn.user.id === target.id) {
					caught = true;

					userRob.balance -= 100;
					await userRob.save();

					return interaction.editReply({
						content: `🚔 ${interaction.user.username} bị ${target.username} bắt!\n💸 Mất 100K tiền phạt`,
						components: [],
					});
				} else {
					return interaction.followUp({
						content: 'Bạn không phải người bị cướp!',
						ephemeral: true,
					});
				}
			}

			// ❌ huỷ
			if (btn.customId === 'cancel') {
				if (btn.user.id === interaction.user.id) {
					cancelled = true;
					collector.stop();

					return interaction.editReply({
						content: '❌ Bạn đã huỷ cướp',
						components: [],
					});
				} else {
					return interaction.followUp({
						content: 'Bạn không phải người cướp!',
						ephemeral: true,
					});
				}
			}
		});

		collector.on('end', async () => {
			// nếu bị bắt hoặc huỷ thì dừng
			if (caught || cancelled) return;

			// 💥 random fail
			if (failChance < 0.3) {
				userRob.balance -= 50;
				await userRob.save();

				return interaction.editReply({
					content: `❌ Cướp thất bại! Bạn mất 50K`,
					components: [],
				});
			}

			// ✅ thành công
			userTarget.balance -= moneyRob;
			userRob.balance += moneyRob;

			await userTarget.save();
			await userRob.save();

			interaction.editReply({
				content: `💰 Cướp thành công! Bạn lấy được ${moneyRob}K`,
				components: [],
			});
		});

		// ⏳ set cooldown
		cooldowns.add(interaction.user.id);
		setTimeout(() => {
			cooldowns.delete(interaction.user.id);
		}, 3600000);
	},
};