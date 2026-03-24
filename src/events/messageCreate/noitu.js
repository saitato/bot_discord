const { Client,
	Message,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder } = require('discord.js');

const setChannelWords = require('../../models/SetChannelWords');
const setWords = require('../../models/Words');
const fetch = require("node-fetch");

function isValidVietnameseTwoWords(str) {
	if (!str) return false;

	const cleaned = str.trim();

	// chỉ cho phép chữ tiếng Việt và khoảng trắng
	const regex = /^[a-zA-ZÀ-ỹ\s]+$/u;
	if (!regex.test(cleaned)) return false;

	// ít nhất 2 từ
	const words = cleaned.split(/\s+/);
	return words.length == 2;
}

function addWordToStart(str, newWord, limit = 50) {
	if (!newWord) return str || "";

	// lowercase nhưng không trim
	const normalizedWord = newWord.toLowerCase();

	// chuyển chuỗi cũ thành mảng
	let arr = str
		? str.split(",").map(item => item.toLowerCase()).filter(Boolean)
		: [];

	// thêm vào đầu
	arr.unshift(normalizedWord);

	// giới hạn số lượng
	if (arr.length > limit) {
		arr = arr.slice(0, limit);
	}

	return arr.join(",");
}

function getFirstWord(str) {
	if (!str) return null;
	const arrWord = str.split(","); 
	const firstWord = arrWord[0];
	const arr = firstWord.split(" "); 
	return arr[arr.length - 1];                
}
function checkWord(str, newWord) {
	if (!str || !newWord) return false;
	const arr = newWord.split(" "); 
	return getFirstWord(str).toLowerCase() === arr[0].toLowerCase();
}



const cooldowns = new Set();

/**
 *
 * @param {Client} client
 * @param {Message} message
 */

module.exports = async (client, message) => {
	if (!message.inGuild() || message.author.bot ) return;
	

	

	try {
		if(message.content == "hello") {
			message.channel.send(`hello`);
			return
		}

		const query = {
			guildId: message.guildId,
		}
		const guildSet = await setChannelWords.findOne(query);

		if(guildSet?.channelId != message.channelId ) return;
		
		if(message.content == "!startNT") {
			if(cooldowns.has(message.guild.id)) return
			message.channel.send(`bạn bắt đầu với 1 từ ( 2 chữ)`);
			cooldowns.add(message.guildId);
		}

		if(message.content == "!endNT") {
			message.channel.send(`Kết thúc nối từ`);
			guildSet.dataWord = ""
			cooldowns.delete(message.guildId);

			await guildSet.save().catch((e) => {
				console.log(`không update được setChannelWord ${e}`);
				return;
			});

		}

		if(!isValidVietnameseTwoWords(message.content)) return

		let arrWortdata=guildSet.dataWord.split(",")

		if(arrWortdata.includes(message.content)){
			await message.react("❌")
			message.channel.send({
				content: 'Từ này đã có trong 50 từ gần đây xin hãy chọn từ khác.',
				ephemeral: true,
			});
			return
		}

		
		

		if(guildSet.dataWord == "" || checkWord(guildSet.dataWord, message.content)) {

			const encodedWord = encodeURIComponent(message.content);
			const url = `https://api.tracau.vn/WBBcwnwQpV89/s/${encodedWord}/vi`;
			const responseWord = await fetch(url);
			const dataApiWord = await responseWord.json();

			if (dataApiWord.tratu.length > 0) {
				guildSet.dataWord = addWordToStart(guildSet.dataWord, message.content) 
				await guildSet.save().catch((e) => {
					console.log(`không update được setChannelWord ${e}`);
					return;
				});

				let queryWord =  { word: message.content.toLowerCase() }
				const queryWords = await setWords.findOne(queryWord);

				if(queryWords) {
					
				}

				await message.react("✅")
				return	
			} else {
				await message.react("❌")
				message.channel.send({
					content: `Chữ này không có trong từ điển`,
					ephemeral: true,
				});
				return
			}
			
			
		} else {
			await message.react("❌")
			message.channel.send({
				content: `Chữ này phải bắt đầu bằng từ "${getFirstWord(guildSet.dataWord)}"`,
				ephemeral: true,
			});
			return
		}
		

		
	} catch (error) {
		console.log(`Error : ${error}`);
	}
};
