const areCommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
	try {
		const rawCommands = getLocalCommands();

		// ✅ LỌC COMMAND HỢP LỆ
		const localCommands = rawCommands.filter(cmd => {
			if (!cmd || typeof cmd !== 'object') {
				console.log('❌ Command không hợp lệ:', cmd);
				return false;
			}

			if (!cmd.name || typeof cmd.name !== 'string') {
				console.log('❌ Command thiếu name:', cmd);
				return false;
			}

			return true;
		});

		const USE_GLOBAL = process.env.USE_GLOBAL_COMMANDS === 'true';

		const guildCommands = await getApplicationCommands(
			client,
			process.env.GUILD_ID
		);

		const globalCommands = USE_GLOBAL
			? await getApplicationCommands(client)
			: null;

		// ===== SYNC FUNCTION =====
		const sync = async (applicationCommands, type) => {
			if (!applicationCommands) return;

			// DELETE
			for (const existingCommand of applicationCommands.cache.values()) {
				const localCommand = localCommands.find(
					(cmd) => cmd.name === existingCommand.name
				);

				if (!localCommand || localCommand.deleted) {
					await applicationCommands.delete(existingCommand.id);
					console.log(`🗑 [${type}] Deleted "${existingCommand.name}"`);
				}
			}

			// CREATE / UPDATE
			for (const localCommand of localCommands) {
				const {
					name,
					description = 'No description',
					options = [],
				} = localCommand;

				// ❗ CHECK LẦN CUỐI
				if (!name) continue;

				const existingCommand = applicationCommands.cache.find(
					(cmd) => cmd.name === name
				);

				try {
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
				} catch (err) {
					console.log(`❌ Lỗi command "${name}":`, err.message);
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

		console.log('✅ Command sync hoàn tất');

	} catch (error) {
		console.log('❌ Command handler error:', error);
	}
};