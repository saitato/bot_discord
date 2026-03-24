const areCommandsDifferent = require('../../utils/areCommandsDifferent');
const getApplicationCommands = require('../../utils/getApplicationCommands');
const getLocalCommands = require('../../utils/getLocalCommands');

module.exports = async (client) => {
	try {
		const localCommands = getLocalCommands();
		const applicationCommands = await getApplicationCommands(
			client,
			process.env.GUILD_ID
		);

		// ================= DELETE COMMAND KHÔNG CÒN TRONG CODE =================
		for (const existingCommand of applicationCommands.cache.values()) {
			const localCommand = localCommands.find(
				(cmd) => cmd.name === existingCommand.name
			);

			if (!localCommand || localCommand.deleted) {
				await applicationCommands.delete(existingCommand.id);
				console.log(`🗑 Deleted command "${existingCommand.name}"`);
			}
		}

		// ================= ADD / UPDATE COMMAND =================
		for (const localCommand of localCommands) {
			const { name, description, options } = localCommand;

			const existingCommand = applicationCommands.cache.find(
				(cmd) => cmd.name === name
			);

			if (existingCommand) {
				if (areCommandsDifferent(existingCommand, localCommand)) {
					await applicationCommands.edit(existingCommand.id, {
						description,
						options,
					});

					console.log(`🔁 Edited command "${name}"`);
				}
			} else {
				if (localCommand.deleted) continue;

				await applicationCommands.create({
					name,
					description,
					options,
				});

				console.log(`👍 Registered command "${name}"`);
			}
		}
	} catch (error) {
		console.log(`❌ Command handler error: ${error}`);
	}
};