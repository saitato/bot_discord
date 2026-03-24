const {
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder
} = require('discord.js');

const User = require('../../models/User');

const cooldowns = new Set();

function getRandom(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const createEmbed = (text) =>
	new EmbedBuilder().setColor('Gold').setDescription(text);

// 🎭 STORY SYSTEM (viết lại cho hay)
const stories = [
	{
		text: (m) => `👴 Một ông lão run rẩy làm rơi **${m} Wcoin** xuống đất...\nÔng không hề hay biết.`,
		
		take: (m, u) => ({
			msg: `💸 ${u} nhanh tay nhặt lấy số tiền trước khi ai đó thấy...`,
			reward: () => {
				const r = Math.random();
				if (r < 0.5) return m;
				if (r < 0.8) return m * 2;
				return -m;
			}
		}),

		return: (m, u) => ({
			msg: `🙏 ${u} gọi ông lão lại và trao trả số tiền`,
			reward: () => {
				const r = Math.random();
				if (r < 0.4) return Math.floor(m * 1.5);
				if (r < 0.7) return m * 2;
				if (r < 0.9) return 0;
				return -Math.floor(m * 0.5);
			}
		})
	},

	{
		text: (m) => `💼 Một chiếc ví rơi bên đường...\nBên trong có **${m} Wcoin**.`,

		take: (m, u) => ({
			msg: `😏 ${u} liếc nhìn xung quanh rồi bỏ ví vào túi...`,
			reward: () => {
				const r = Math.random();
				if (r < 0.5) return m;
				if (r < 0.8) return m * 2;
				return -m;
			}
		}),

		return: (m, u) => ({
			msg: `❤️ ${u} quyết định tìm chủ nhân chiếc ví`,
			reward: () => {
				const r = Math.random();
				if (r < 0.4) return m * 2;
				if (r < 0.7) return Math.floor(m * 1.5);
				return 0;
			}
		})
	},

	{
		text: (m) => `💰 Một túi tiền bí ẩn nằm giữa đường...\nKhông ai xung quanh.`,

		take: (m, u) => ({
			msg: `🔥 ${u} mở túi tiền với ánh mắt tò mò...`,
			reward: () => {
				const r = Math.random();
				if (r < 0.3) return m * 3;
				if (r < 0.6) return m;
				return -m;
			}
		}),

		return: (m, u) => ({
			msg: `🤔 ${u} cảm thấy không ổn và bỏ đi...`,
			reward: () => {
				const r = Math.random();
				if (r < 0.3) return m;
				if (r < 0.6) return 0;
				return -Math.floor(m * 0.3);
			}
		})
	},

	{
		text: (m) => `🎒 Một học sinh làm rơi **${m} Wcoin** và đang hoảng loạn tìm kiếm...`,

		take: (m, u) => ({
			msg: `😈 ${u} lặng lẽ nhặt tiền...`,
			reward: () => {
				const r = Math.random();
				if (r < 0.6) return m;
				return -m;
			}
		}),

		return: (m, u) => ({
			msg: `🥺 ${u} gọi lại và trả tiền cho học sinh`,
			reward: () => {
				const r = Math.random();
				if (r < 0.5) return m * 2;
				if (r < 0.8) return m;
				return 0;
			}
		})
	},

	{
		text: (m) => `🕵️ Một túi tiền đáng ngờ (${m} Wcoin) nằm giữa ngõ tối...`,

		take: (m, u) => ({
			msg: `🚓 ${u} vừa chạm vào thì cảnh sát ập đến!`,
			reward: () => -m * 2
		}),

		return: (m, u) => ({
			msg: `😇 ${u} quyết định không dính vào rắc rối`,
			reward: () => {
				const r = Math.random();
				if (r < 0.5) return 0;
				return Math.floor(m * 0.5);
			}
		})
	}
];

module.exports = async (client, message) => {
	if (!message.inGuild() || message.author.bot) return;

	// 🎯 tỉ lệ xuất hiện
	if (getRandom(1, 100) > 5) return;

	// ⛔ cooldown
	if (cooldowns.has(message.guild.id)) return;
	cooldowns.add(message.guild.id);
	setTimeout(() => cooldowns.delete(message.guild.id), 20000);

	const money = getRandom(100, 500);
	const story = stories[getRandom(0, stories.length - 1)];

	const msg = await message.channel.send({
		embeds: [createEmbed(story.text(money))],
		components: [
			new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId('take')
					.setLabel('💸 Lấy ngay')
					.setStyle(ButtonStyle.Danger),

				new ButtonBuilder()
					.setCustomId('return')
					.setLabel('🙏 Trả lại')
					.setStyle(ButtonStyle.Success)
			)
		]
	});

	const collector = msg.createMessageComponentCollector({
		time: 15000,
		max: 1
	});

	collector.on('collect', async (i) => {
		let user = await User.findOne({
			userId: i.user.id,
			guildId: message.guild.id
		});

		if (!user) {
			user = new User({
				userId: i.user.id,
				guildId: message.guild.id,
				balance: 0
			});
		}

		const data =
			i.customId === 'take'
				? story.take(money, i.user.username)
				: story.return(money, i.user.username);

		const reward = Math.floor(data.reward());

		user.balance += reward;
		await user.save();

		await i.update({
			embeds: [
				createEmbed(
					`${data.msg}\n\n${
						reward > 0
							? `🎉 Bạn nhận được **+${reward} Wcoin**`
							: reward < 0
							? `💀 Bạn mất **${reward} Wcoin**`
							: `😐 Không có gì xảy ra`
					}`
				)
			],
			components: []
		});
	});

	collector.on('end', (collected) => {
		if (collected.size === 0) {
			msg.edit({
				embeds: [createEmbed('😢 Không ai phản ứng... người kia đã quay lại và rời đi')],
				components: []
			});
		}
	});
};