const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');

const User = require('../../models/User');
const Item = require('../../models/Item');

const ITEMS = {
	camera: {
		name: '🛡️ Camera',
		type: 'guard',
		price: 500,
		desc: 'Auto bắt cướp (24h)',
	},
	lock_basic: {
		name: '🔒 Khóa chống trộm',
		type: 'lock_basic',
		price: 200,
		desc: 'x2 độ dài mã (24h)',
	},
	lock_smart: {
		name: '🧠 Khóa thông minh',
		type: 'lock_smart',
		price: 300,
		desc: 'Đảo chiều input (24h)',
	},
	lockpick: {
		name: '🛠️ Lockpick',
		type: 'lockpick',
		price: 200,
		desc: 'Dùng để cướp',
	},
};

module.exports = {
	name: 'shop',
	description: 'Mua bán item 🛒',

	callback: async (client, interaction) => {
		if (!interaction.inGuild()) return;

		const userId = interaction.user.id;
		const guildId = interaction.guild.id;

		let user = await User.findOne({ userId, guildId });
		if (!user) user = await User.create({ userId, guildId, balance: 0 });

		let selected = null;

		// 🎨 UI
		const embed = new EmbedBuilder()
			.setColor('Blue')
			.setTitle('🛒 SHOP')
			.setDescription(
				Object.values(ITEMS)
					.map(i => `${i.name} - ${i.price} Wcoin\n${i.desc}`)
					.join('\n\n')
			)
			.setFooter({ text: 'Chọn item → bấm Mua / Bán' });

		const select = new StringSelectMenuBuilder()
			.setCustomId('select_item')
			.setPlaceholder('Chọn item')
			.addOptions(
				Object.entries(ITEMS).map(([key, i]) => ({
					label: i.name,
					description: `${i.price} Wcoin`,
					value: key,
				}))
			);

		const buttons = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('buy').setLabel('🛒 Mua').setStyle(ButtonStyle.Success),
			new ButtonBuilder().setCustomId('sell').setLabel('💰 Bán').setStyle(ButtonStyle.Primary),
			new ButtonBuilder().setCustomId('cancel').setLabel('❌ Hủy').setStyle(ButtonStyle.Danger)
		);

		const msg = await interaction.reply({
			embeds: [embed],
			components: [
				new ActionRowBuilder().addComponents(select),
				buttons,
			],
			fetchReply: true,
		});

		const collector = msg.createMessageComponentCollector({ time: 60000 });

		collector.on('collect', async (i) => {
			if (i.user.id !== userId)
				return i.reply({ content: '❌ Không phải của bạn!', ephemeral: true });

			// 🎯 chọn item
			if (i.isStringSelectMenu()) {
				selected = i.values[0];

				return i.reply({
					content: `✅ Đã chọn: ${ITEMS[selected].name}`,
					ephemeral: true,
				});
			}

			if (!selected) {
				return i.reply({
					content: '❌ Chưa chọn item!',
					ephemeral: true,
				});
			}

			const item = ITEMS[selected];

			// ================= 🛒 MUA =================
			if (i.customId === 'buy') {
				const exists = await Item.findOne({
					userId,
					guildId,
					type: item.type,
					expiresAt: { $gt: Date.now() },
				});

				if (exists)
					return i.reply({
						content: '❌ Bạn đã có item này!',
						ephemeral: true,
					});

				if (user.balance < item.price)
					return i.reply({
						content: '❌ Không đủ Wcoin!',
						ephemeral: true,
					});

				user.balance -= item.price;
				await user.save();

				await Item.create({
					userId,
					guildId,
					type: item.type,
					expiresAt: Date.now() + 86400000, // 24h
				});

				return i.reply({
					content: `✅ Mua ${item.name} thành công!`,
					ephemeral: true,
				});
			}

			// ================= 💰 BÁN =================
			if (i.customId === 'sell') {
				const owned = await Item.findOne({
					userId,
					guildId,
					type: item.type,
				});

				if (!owned)
					return i.reply({
						content: '❌ Bạn không có item này!',
						ephemeral: true,
					});

				const refund = Math.floor(item.price * 0.75);

				user.balance += refund;
				await user.save();

				await owned.deleteOne();

				return i.reply({
					content: `💰 Đã bán ${item.name} +${refund} Wcoin`,
					ephemeral: true,
				});
			}

			// ================= ❌ HỦY =================
			if (i.customId === 'cancel') {
				collector.stop();

				return i.update({
					content: '❌ Đã đóng shop',
					embeds: [],
					components: [],
				});
			}
		});

		collector.on('end', async () => {
			await interaction.editReply({ components: [] });
		});
	},
};