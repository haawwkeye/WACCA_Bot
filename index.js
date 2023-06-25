require('dotenv').config();

// Require the necessary discord.js classes
const { Client, Collection, Events, GatewayIntentBits, ApplicationCommandType, PermissionsBitField } = require('discord.js');

// This will stop warning for when testing on none bot stuff aka when I don't need the bot logged in
// eslint-disable-next-line no-unused-vars
const token = process.env.token;
const owners = [process.env.ownerId];
const scoresChannelId = process.env.scoresChannelId;
const scoresUpdateMS = process.env.scoresUpdateMS;

const mysql = require("mysql");
let database = null;
let scoresUpdateInt;

const fs = require("fs");
const path = require("path");

const backup_logger = {
	debug: console.debug,
	error: console.error,
	fatal: console.error,
	trace: console.trace,
	info: console.info,
	warn: console.warn,
}

let logger = require(`${__dirname}/logger`);
if (logger && !logger.info) logger = backup_logger;
// Create a new client instance
const client = new Client({
	ws: {
		// Makes the bot popup as using phone
		properties: {
			$os: process ? process.platform : 'discord.js',
			$browser: 'Discord iOS',
			$device: 'discord.js',
		},
	},
	intents: [
		GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
});

// #region Death
const DEATH = require('like-process');
let hasDied = false;
let hasFileWrite = false;

const tempDir = `${__dirname}/temp`;

function createTempDir()
{
	// Backup for if cleanup didn't work
	if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
	fs.mkdirSync(tempDir);
}

createTempDir();
client.createTempDir = createTempDir;
client.tempDir = tempDir;

DEATH.on('cleanup', () => {
	if (hasFileWrite) return;
	hasFileWrite = true;

	if (database) database.destroy();

	if (client.botData) fs.writeFileSync(path.join(__dirname, "botdata.json"), JSON.stringify(client.botData, null, "\t"));

	try {
		// client.user.setStatus('invisible');
		process.exit(-1);
	} catch (_) { process.exit(); }
});

DEATH.handle(['unhandledRejection', 'uncaughtException', 'exit', 'SIGHUP', 'SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGUSR1', 'SIGUSR2'], (evt, err) => {
	if (hasDied) return;
	hasDied = true;

	try {
		logger.info(`[DEATH] Event: ${evt} Error: ${err}`);
	} catch (_) {
		console.log(`[DEATH] Event: ${evt} Error: ${err}`);
	}
});
// #endregion

async function queryDatabase(database, command)
{
    if (!database || !command) return;
    return await new Promise((res, rej) => {
        database.query(command, (error, results, fields) => {
            if (error) return rej(error);
            res(results);
        });
    })
}

async function connectToDatabase()
{
    if (database != null) { client.database = database; return database; }

    let connection = mysql.createConnection({
        host     : process.env.db_host,
        user     : process.env.db_username,
        password : process.env.db_password,
        database : process.env.db_name,
        port     : process.env.db_port
    });
    
    await new Promise((resolve, reject) => {
        connection.connect(function(err) {
            if (err) {
            logger.error('error connecting: ' + err.stack);
            reject(err);
            return;
            }

            database = connection;
            
            logger.info('connected as id ' + database.threadId);
            resolve(database);
        });
    });

    client.database = database;
    return database;
}

connectToDatabase();

client.connectToDatabase = connectToDatabase;
client.database = database;
client.queryDatabase = queryDatabase;


client.logger = logger;
client.songList = require(`${__dirname}/SongList.json`);

let updating = false;

function dateToString(date)
{
    let str = date;
    try {
        str = `<t:${(date.getTime() - date.getTimezoneOffset()*60*1000)/1000}:f>`;
    } catch { /* empty block */ }
    
    return str;
}
client.dateToString = dateToString;

async function sendLogMsg(guildId, opts) {
	const data = database.data[guildId];
	const logChannel = data.Logging.Channel;
	if (logChannel) {
		const real = await (await client.guilds.fetch(guildId)).channels.fetch(logChannel.id);
		if (real) real.send(opts);
	}
}

client.sendLogMsg = sendLogMsg;

function getUser(interaction) {
	return (interaction.user ?? interaction.member.user);
}

function isOwner(userId) {
	return owners.includes(userId);
}

client.isOwner = isOwner;

client.getUser = getUser;

function loadCommands(full = true)
{
	if (updating) return;
	updating = true;
	logger.info('Attempting to load commands');
	if (full) {
		client.contextmenu = {
			user: new Collection(),
			message: new Collection(),
		};

		client.commands = new Collection();
	}
	client.lastReload = new Date().getTime();
	const commandsPath = path.join(__dirname, 'commands');
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);

		if (require.cache[filePath]) delete require.cache[filePath]; // Remove cache so we can require again
		try {
			const command = require(filePath);
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			if ('data' in command && 'execute' in command) {
				const name = command.data.name;
				const type = command.data.toJSON().type ?? ApplicationCommandType.ChatInput;
				const menu = client.contextmenu;

				if (!full && ((type === ApplicationCommandType.ChatInput && !client.commands.get(name)) || (type === ApplicationCommandType.User && !menu.user.get(name)) || (type === ApplicationCommandType.Message && menu.message.get(name)))) continue;

				if (type === ApplicationCommandType.ChatInput) client.commands.set(name, command);
				else if (type === ApplicationCommandType.User) menu.user.set(name, command);
				else if (type === ApplicationCommandType.Message) menu.message.set(name, command);
			} else {
				logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		} catch (error) {
			logger.error(`The command at ${filePath} failed to load\n${error}`);
		}
	}

	const size = (client.commands.size + client.contextmenu.user.size + client.contextmenu.message.size);

	logger.info(`Loaded ${size}/${commandFiles.length} commands`);

	updating = false;
}

loadCommands();
client.loadCommands = loadCommands;

client.on(Events.ShardError, error => {
	logger.error('A websocket connection encountered an error:', error);
});

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.on(Events.ClientReady, c => {
	// c.user.setPresence({ status: 'online' });
	logger.info(`Ready! Logged in as ${c.user.tag}`);
});
client.on(Events.Debug, m => logger.debug(m));
client.on(Events.Warn, m => logger.warn(m));
client.on(Events.Error, m => logger.error(m));

// TODO: Fix isOwner check

client.on(Events.InteractionCreate, async interaction => {
	const user = (interaction.user ?? interaction.member.user);
	if (!isOwner(user.id))
	{
		if (process.env.DevOnly == 'true' && interaction.guildId !== (process.env.guildId ?? '0')) {
			if (interaction.isChatInputCommand()) interaction.reply({ content: 'There was an error with running this command', ephemeral: true });
			return;
		}
	}
	if (updating && interaction.isChatInputCommand()) { interaction.reply({ content: 'Please wait while we update commands functions!', ephemeral: true }); }
	if (updating) return;

	// function tryreply(opts) {
	// 	const i = interaction;
	// 	let send = i.reply;
	// 	if (i.replied) send = i.followUp;
	// 	if (i.isRepliable()) return send(opts);
	// }

	const tryreply = async (opts) => {
		if (!interaction.isRepliable()) return;
		// deferred means I have to use followUp???
		if (interaction.replied || interaction.deferred) await interaction.followUp(opts);
		else await interaction.reply(opts);
	};

	interaction.tryreply = tryreply; // Custom reply function that should always work

	// To explain why ContextMenu and ChatInput is the basically the same function
	// This is because I learnt that it is built like a slash command so instead of using .contextmenu
	// I wanted to use .execute since it made more sense at the time

	if (interaction.isChatInputCommand()) {
		const command = client.commands.get(interaction.commandName);
		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found.`);

			try {
				await interaction.reply({ content: `No command matching ${interaction.commandName} was found.`, ephemeral: true });
			} catch (error) { /* empty */ }

			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			logger.error(error);
			await tryreply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	} else if (interaction.isAutocomplete()) {
		const command = client.commands.get(interaction.commandName);

		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			logger.error(error);
		}
	} else if (interaction.isContextMenuCommand()) {
		const menu = client.contextmenu;
		let command = null;

		if (interaction.isUserContextMenuCommand()) command = menu.user.get(interaction.commandName);
		else if (interaction.isMessageContextMenuCommand()) command = menu.message.get(interaction.commandName);

		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found.`);

			try {
				await tryreply({ content: `No command matching ${interaction.commandName} was found.`, ephemeral: true });
			} catch (error) { /* empty */ }

			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			logger.error(error);
			await tryreply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	} else if (interaction.isAnySelectMenu()) {
		const commandName = interaction.customId.split('|')[0];
		const newInteraction = interaction.message.interaction;
		const command = client.commands.get(newInteraction?.commandName ?? commandName);

		if (!command) {
			logger.error(`No command matching ${newInteraction?.commandName ?? commandName} was found.`);
			return;
		}

		try {
			await command.selectmenu(interaction);
		} catch (error) {
			logger.error(error);
		}
	} else if (interaction.isButton()) {
		const commandName = interaction.customId.split('|')[0];
		const newInteraction = interaction.message.interaction;
		const command = client.commands.get(newInteraction?.commandName ?? commandName);

		if (!command) {
			logger.error(`No command matching ${newInteraction?.commandName ?? commandName} was found.`);
			return;
		}

		try {
			await command.button(interaction);
		} catch (error) {
			logger.error(error);
		}
	} else if (interaction.isModalSubmit()) {
		const commandName = interaction.customId.split('|')[0];
		const command = client.commands.get(commandName);

		if (!command) {
			logger.error(`No command matching ${commandName} was found.`);
			return;
		}

		try {
			await command.modalsubmit(interaction);
		} catch (error) {
			logger.error(error);
		}
	} else {
		logger.warn(`interaction attempted to use an handler that doesn't exist\n${interaction.toJSON()}`);
	}
});

// Log in to Discord with your client's token
client.login(token);

if (!fs.existsSync(path.join(__dirname, "botdata.json"))) fs.writeFileSync(path.join(__dirname, "botdata.json"), "{}");
let botData = JSON.parse(fs.readFileSync(path.join(__dirname, "botdata.json")));
let lastId = botData.lastScoreId ?? 0;

client.botData = botData;

scoresUpdateInt = setInterval(async () => {
	if (!scoresChannelId) return clearInterval(scoresUpdateInt);
	if (!client.scoresChannel) client.scoresChannel = await client.channels.fetch(scoresChannelId);
	// let scoresChannel = client.scoresChannel;
	// console.log(client.scoresChannel);

	// Set lastId after doing everything!
	client.botData.lastScoreId = lastId;
}, scoresUpdateMS)

module.exports = client;
