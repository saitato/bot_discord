const { Client, Interaction, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
	name: 'daily',
	description: 'Nhận tiền hàng ngày',

	/**
	 * @param {Client} client
	 * @param {Interaction} interaction
	 */
	callback: async (client, interaction) => {
		if (!interaction.inGuild()) {
			return interaction.reply({
				content: '❌ Chỉ dùng trong server!',
				ephemeral: true,
			});
		}

		await interaction.deferReply();

		try {
			const query = {
				userId: interaction.user.id,
				guildId: interaction.guild.id,
			};

			let user = await User.findOne(query);

			const now = new Date();
			let dailyAmount = getRandom(100, 200);

			// 🆕 user mới
			if (!user) {
				user = new User({
					...query,
					balance: dailyAmount,
					lastDaily: now,
					streak: 1,
				});

				await user.save();

				const embed = new EmbedBuilder()
					.setColor('#00ff99')
					.setTitle('🎁 Daily Reward')
					.setThumbnail(interaction.user.displayAvatarURL())
					.setDescription(`💰 Bạn nhận **${dailyAmount}K**`)
					.addFields(
						{ name: '💼 Số dư', value: `${user.balance}K`, inline: true },
						{ name: '🔥 Streak', value: `1 ngày`, inline: true }
					)
					.setFooter({ text: 'Quay lại mỗi ngày để nhận thưởng!' })
					.setTimestamp();

				return interaction.editReply({ embeds: [embed] });
			}

			// ⏳ cooldown 24h
			const diff = now - user.lastDaily;
			const hours = diff / (1000 * 60 * 60);

			if (hours < 24) {
				const timeLeft = 24 - hours;
				const h = Math.floor(timeLeft);
				const m = Math.floor((timeLeft - h) * 60);

				const embed = new EmbedBuilder()
					.setColor('#ff5555')
					.setTitle('⏳ Chưa thể nhận')
					.setDescription(
						`Bạn đã nhận daily rồi!\n⏱️ Quay lại sau **${h}h ${m}m**`
					)
					.setThumbnail(interaction.user.displayAvatarURL());

				return interaction.editReply({ embeds: [embed] });
			}

			// 🔥 streak logic
			const days = diff / (1000 * 60 * 60 * 24);

			if (days < 2) {
				user.streak = (user.streak || 1) + 1;
			} else {
				user.streak = 1;
			}

			// 🎁 bonus streak
			const bonus = user.streak * 10;
			dailyAmount += bonus;

			// 🎲 may mắn
			let lucky = false;
			if (Math.random() < 0.05) {
				dailyAmount *= 3;
				lucky = true;
			}

			user.balance += dailyAmount;
			user.lastDaily = now;

			await user.save();

			const embed = new EmbedBuilder()
				.setColor('#00ff99')
				.setTitle('🎁 Daily Reward')
				.setThumbnail(interaction.user.displayAvatarURL())
				.setDescription(`💰 Bạn nhận **${dailyAmount}K**`)
				.addFields(
					{ name: '💼 Số dư', value: `${user.balance}K`, inline: true },
					{ name: '🔥 Streak', value: `${user.streak} ngày`, inline: true }
				)
				.setFooter({ text: 'Giữ streak để nhận thêm bonus!' })
				.setTimestamp();

			if (lucky) {
				embed.addFields({
					name: '🍀 Lucky Bonus',
					value: 'Bạn trúng thưởng x3!',
				});
			}

			return interaction.editReply({ embeds: [embed] });

		} catch (error) {
			console.log(error);
			return interaction.editReply('❌ Có lỗi xảy ra!');
		}
	},
};