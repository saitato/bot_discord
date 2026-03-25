const areCommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
	try {
		const localCommands = getLocalCommands();

		// 🔥 bật/tắt global ở đây
		const USE_GLOBAL = process.env.USE_GLOBAL_COMMANDS === 'true';

		const guildCommands = await getApplicationCommands(
			client,
			process.env.GUILD_ID
		);

		const globalCommands = USE_GLOBAL
			? await getApplicationCommands(client)
			: null;

		// ===== FUNCTION SYNC =====
		const sync = async (applicationCommands, type) => {
			for (const existingCommand of applicationCommands.cache.values()) {
				const localCommand = localCommands.find(
					(cmd) => cmd.name === existingCommand.name
				);

				if (!localCommand || localCommand.deleted) {
					await applicationCommands.delete(existingCommand.id);
					console.log(`🗑 [${type}] Deleted "${existingCommand.name}"`);
				}
			}

			for (const localCommand of localCommands) {
				const {
					name,
					description = 'No description',
					options = [],
				} = localCommand;

				const existingCommand = applicationCommands.cache.find(
					(cmd) => cmd.name === name
				);

				if (existingCommand) {
					if (areCommandsDifferent(existingCommand, localCommand)) {
						await applicationCommands.edit(existingCommand.id, {
							description,
							options,
						});

						console.log(`🔁 [${type}] Updated "${name}"`);
					}
				} else {
					if (localCommand.deleted) continue;

					await applicationCommands.create({
						name,
						description,
						options,
					});

					console.log(`👍 [${type}] Created "${name}"`);
				}
			}
		};

		// ===== RUN =====
		if (USE_GLOBAL) {
			await sync(globalCommands, 'GLOBAL');
			console.log('🌍 Đang dùng GLOBAL commands');
		} else {
			await sync(guildCommands, 'GUILD');
			console.log('🏠 Đang dùng GUILD commands');
		}

	} catch (error) {
		console.log(`❌ Command handler error:`, error);
	}
};