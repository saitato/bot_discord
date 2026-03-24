const { Client, Interaction } = require('discord.js');

function getRandom(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


let arrMon = ["Bánh mì",
	"Bánh bao",
	"Há cảo",
	"Phở" ,
	"Bún bò",
	"Hủ tiếu",
	"Bún mắm",
	"Mì tôm",
	"Lẩu",
	"Đồ nướng",
	"Ức gà luột và trứng",
	"Cơm nắm",
	"Bánh xèo",
	"Gạo luộc",
	"Gỏi cuốn",
	"Bánh canh cá lóc",
	"Cháo",
	"Cơm thố",
	"Ngô luộc",
	"Cơm sườn",
	"Phá lấu",
	"Bò né",
	"Bún chả Hà lội",
	"Bún riêu cua",
	"Súp cua",
	"Xiên bẩn",
	"Bánh tráng trộn",
	]

module.exports = {
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
			let monKey = getRandom(0, arrMon.length - 1)
			console.log(monKey)
			interaction.reply("bạn nên ăn " + arrMon[monKey])
			//console.log(interaction)

		} catch (error) {
			// console.log(`Error with /daily: ${error}`);
		}
	},
	name: 'test3',
	description: 'muốn ăn gì',
	};