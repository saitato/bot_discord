const { Client, Interaction, ApplicationCommandOptionType, Component, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const setChannelWords = require('../../models/SetChannelWords');
const cooldowns = new Set();

function getRandom(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
	name: 'setnoitu',
		description: "Đặt kênh để nối từ",
		options: [
				{
				name: 'channel',
				description: 'Bạn chọn kênh để setup',
				type: ApplicationCommandOptionType.Channel,
				},
		],

	/**
	 *
	 * @param {Client} client
	 * @param {Interaction} interaction
	 */
	callback: async (client, interaction) => {
		if (!interaction.inGuild()) {
			interaction.reply({
				content: 'Bạn chỉ có thể chạy lệnh này bên trong máy chủ.',
				ephemeral: true,
			});
			return;
		}	
		
		try {
			const setChannel = interaction.options.get('channel');
			if (!setChannel) {
				interaction.reply({
					content: 'Bạn chưa chọn kênh',
					ephemeral: true,
				});
				return;
			} 
			
			const query = {
				guildId: setChannel.channel.guildId,
			}
			const guildSet = await setChannelWords.findOne(query);
			// check guild
			if (!guildSet) {
				const newGuildSet = new setChannelWords({
					channelId: setChannel.value,
					guildId: setChannel.channel.guild.id
				});
				await newGuildSet.save();
				interaction.reply({
					content: 'Đã set thành công',
					ephemeral: true,
				});
				return;
			}

			if(guildSet.channelId == setChannel.value) {
				interaction.reply({
					content: 'Bạn đã set kênh này rồi',
					ephemeral: false,
				});
				return;
			}

			guildSet.channelId = setChannel.value

			await guildSet.save().catch((e) => {
				console.log(`không update được setChannelWord ${e}`);
				return;
			});

			interaction.reply({
				content: 'Đã set thành công',
				ephemeral: false,
			});

		} catch (error) {
			console.log(`Error /setnoitu: ${error}`);
		}
		return;
	},
};