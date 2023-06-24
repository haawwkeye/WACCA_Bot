require('dotenv').config();

const logger = require('./logger');

const { REST, Routes } = require('discord.js');

const clientId = process.env.clientId;
const token = process.env.token;

const fs = require('fs');

const commands = [];
// const guild_commands = [];

// Grab all the command files from the commands directory you created earlier
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
/*
const guild_commandFiles = fs.readdirSync('./guild_commands');

guild_commandFiles.forEach(folder => {
	if (fs.statSync(`./guild_commands/${folder}`).isDirectory()) {
		const guildCommand = fs.readdirSync(`./guild_commands/${folder}`).filter(file => file.endsWith('.js'));
		const guildData = {
			guildId: folder,
			commands: [],
		};

		for (const file of guildCommand) {
			const command = require(`./guild_commands/${folder}/${file}`);
			guildData.commands.push(command.data.toJSON());
		}

		guild_commands.push(guildData);
	}
});
*/

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// applicationGuildCommands

// TODO: Make it so guild commands can be reloaded only if a hash has changed
// should help atleast with any limits that may happen
// Maybe also do this with global commands aswell the only problem is idk how to get the hash for files
// If possible maybe generate a hash for the whole folder? (for each guild/global command folders)

// and deploy your commands!
(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const dataGlobal = await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands },
		);

		/*
		if (guild_commands.length > 0) {
			guild_commands.forEach(async data => {
				try {
					logger.info(`Started refreshing for ${data.guildId} ${data.commands.length} application (/) commands.`);

					const dataGuild = await rest.put(
						Routes.applicationGuildCommands(clientId, data.guildId),
						{ body: data.commands },
					);

					logger.info(`Successfully reloaded for ${data.guildId} ${dataGuild.length} application (/) commands.`);
				} catch (error) {
					logger.error(error);
				}
			})
		}
		*/

		logger.info(`Successfully reloaded ${dataGlobal.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		logger.error(error);
	}
})();
