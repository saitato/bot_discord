const {
	EmbedBuilder,
	ActionRowBuilder,
	StringSelectMenuBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');

const mongoose = require('mongoose');
const User = require('../../models/User');
const Item = require('../../models/Item');

// ================= ITEM =================
const ITEMS = {
	camera: {
		name: '🛡️ Camera',
		type: 'guard',
		price: 500,
		desc: 'Auto bắt cướp (24h)',
		stack: false,
	},
	lock_basic: {
		name: '🔒 Khóa chống trộm',
		type: 'lock_basic',
		price: 200,
		desc: 'x2 độ dài mã (24h)',
		stack: false,
	},
	lock_smart: {
		name: '🧠 Khóa thông minh',
		type: 'lock_smart',
		price: 300,
		desc: 'Đảo chiều input (24h)',
		stack: false,
	},
	lockpick: {
		name: '🛠️ Lockpick',
		type: 'lockpick',
		price: 200,
		desc: 'Dùng để cướp',
		stack: true,
	},
};

// ================= TIME =================
function formatTime(ms) {
	const h = Math.floor(ms / 3600000);
	const m = Math.floor((ms % 3600000) / 60000);
	const s = Math.floor((ms % 60000) / 1000);
	return `${h}h ${m}m ${s}s`;
}

// ================= ITEM INFO (cho ephemeral) =================
async function getItemInfo(userId, guildId, type) {
	const item = await Item.findOne({ userId, guildId, type });

	let quantity = item?.quantity || 0;
	let text = `📦 Số lượng: ${quantity}`;

	if (item?.expiresAt) {
		if (item.expiresAt > Date.now()) {
			text += `\n⏳ ${formatTime(item.expiresAt - Date.now())}`;
		} else {
			text += `\n⏳ Đã hết hạn`;
		}
	}

	return text;
}

// ================= BUILD EMBED CHÍNH =================
async function buildShopEmbed(userId, guildId) {
	const user = await User.findOne({ userId, guildId });

	let desc = `💰 Số dư: **${user.balance} Wcoin**\n\n`;

	for (const i of Object.values(ITEMS)) {
		desc += `${i.name} - ${i.price} Wcoin\n${i.desc}\n\n`;
	}

	return new EmbedBuilder()
		.setColor('Blue')
		.setTitle('🛒 SHOP')
		.setDescription(desc);
}

// ================= COOLDOWN =================
const clickCooldown = new Map();

function checkCooldown(userId) {
	const now = Date.now();
	const last = clickCooldown.get(userId) || 0;

	if (now - last < 1500) return false;

	clickCooldown.set(userId, now);
	return true;
}

// ================= COMMAND =================
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

		// ================= UI =================
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

		const embed = await buildShopEmbed(userId, guildId);

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

			if (!checkCooldown(userId))
				return i.reply({ content: '⏳ Đợi 1.5s!', ephemeral: true });

			// ❌ CANCEL
			if (i.customId === 'cancel') {
				collector.stop();
				return i.update({
					content: '❌ Đã đóng shop',
					embeds: [],
					components: [],
				});
			}

			// 🎯 CHỌN ITEM
			if (i.isStringSelectMenu()) {
				selected = i.values[0];
				const item = ITEMS[selected];

				const info = await getItemInfo(userId, guildId, item.type);

				return i.reply({
					content: `✅ ${item.name}\n${item.desc}\n\n${info}`,
					ephemeral: true,
				});
			}

			if (!selected)
				return i.reply({ content: '❌ Chưa chọn item!', ephemeral: true });

			const item = ITEMS[selected];

			// ================= TRANSACTION =================
			const session = await mongoose.startSession();
			session.startTransaction();

			try {
				let userDoc = await User.findOne({ userId, guildId }).session(session);
				let exist = await Item.findOne({ userId, guildId, type: item.type }).session(session);

				// ================= BUY =================
				if (i.customId === 'buy') {
					if (userDoc.balance < item.price)
						throw new Error('NOT_ENOUGH');

					if (item.stack) {
						if (exist) {
							exist.quantity += 1;
							await exist.save({ session });
						} else {
							await Item.create([{
								userId,
								guildId,
								type: item.type,
								quantity: 1,
							}], { session });
						}
					} else {
						if (exist && exist.expiresAt > Date.now())
							throw new Error('ALREADY_HAVE');

						if (exist) {
							exist.expiresAt = Date.now() + 86400000;
							exist.quantity = 1;
							await exist.save({ session });
						} else {
							await Item.create([{
								userId,
								guildId,
								type: item.type,
								quantity: 1,
								expiresAt: Date.now() + 86400000,
							}], { session });
						}
					}

					userDoc.balance -= item.price;
					await userDoc.save({ session });

					await session.commitTransaction();

					// 🔄 UPDATE EMBED
					const newEmbed = await buildShopEmbed(userId, guildId);

					await i.update({
						embeds: [newEmbed],
						components: [
							new ActionRowBuilder().addComponents(select),
							buttons,
						],
					});

					return i.followUp({
						content: `✅ Mua ${item.name} thành công`,
						ephemeral: true,
					});
				}

				// ================= SELL =================
				if (i.customId === 'sell') {
					if (!exist || exist.quantity <= 0)
						throw new Error('NO_ITEM');

					const refund = Math.floor(item.price * 0.75);

					if (item.stack) {
						exist.quantity -= 1;

						if (exist.quantity <= 0) {
							await exist.deleteOne({ session });
						} else {
							await exist.save({ session });
						}
					} else {
						await exist.deleteOne({ session });
					}

					userDoc.balance += refund;
					await userDoc.save({ session });

					await session.commitTransaction();

					// 🔄 UPDATE EMBED
					const newEmbed = await buildShopEmbed(userId, guildId);

					await i.update({
						embeds: [newEmbed],
						components: [
							new ActionRowBuilder().addComponents(select),
							buttons,
						],
					});

					return i.followUp({
						content: `💰 +${refund} Wcoin`,
						ephemeral: true,
					});
				}

			} catch (err) {
				await session.abortTransaction();

				if (err.message === 'NOT_ENOUGH')
					return i.reply({ content: '❌ Không đủ tiền!', ephemeral: true });

				if (err.message === 'ALREADY_HAVE')
					return i.reply({ content: '❌ Đang còn hiệu lực!', ephemeral: true });

				if (err.message === 'NO_ITEM')
					return i.reply({ content: '❌ Số lượng đang có là 0', ephemeral: true });

				console.log(err);
				return i.reply({ content: '❌ Lỗi hệ thống!', ephemeral: true });

			} finally {
				session.endSession();
			}
		});

		collector.on('end', async () => {
			await interaction.editReply({ components: [] });
		});
	},
};