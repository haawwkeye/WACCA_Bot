// eslint-disable-next-line no-unused-vars
const { SlashCommandBuilder, ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ChatInputCommandInteraction, ButtonInteraction, ButtonStyle } = require('discord.js');

const fs = require('fs');
const path = require('path');

/*
function requireCache(id) {
	let cached = null;
	if (require.cache[id]) {
		cached = require.cache[id];
		delete require.cache[id];
	}

	const required = require(id);

	if (cached) require.cache[id] = cached;

	return required;
}

function find(client, command)
{
	const data = command.data;

	const contextmenu = client.contextmenu;
	const commands = client.commands;

	const message = contextmenu.message;
	const user = contextmenu.user;

	const type = command.data.toJSON().type ?? ApplicationCommandType.ChatInput;

	if (type === ApplicationCommandType.User) {
		return user.get(data.name);
	} else if (type === ApplicationCommandType.Message) {
		return message.get(data.name);
	} else {
		return commands.get(data.name);
	}
}
*/

module.exports = {
	data: new SlashCommandBuilder()
		.setName('status')
		.setDescription('Replies with the bots status!'),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		const user = (interaction.user ?? interaction.member.user);
		const client = interaction.client;

		const currentCommands = (client.commands.size + client.contextmenu.user.size + client.contextmenu.message.size);
		const newCommands = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js'));

		const status = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Bot Status')
			.addFields(
				{ name: 'Uptime', value: (client.uptime / 1000).toFixed() },
				{ name: 'Ping', value: `${client.ws.ping.toFixed()}ms` },
				{ name: 'Commands', value: `${currentCommands}/${newCommands.length}` },
			);

		let comp = null;

		const deploy = newCommands.length != currentCommands && client.isOwner(user.id);
		let display = false;

		// TODO: move this to a differnt command?? also this might have some performance issues later on
		// That is if the bot was public and anyone could use it Lol

		newCommands.forEach(cmd => {
			if (display || deploy) return;
			const cmdPath = path.join(__dirname, cmd);
			const mtime = fs.statSync(cmdPath).mtime.getTime();

			// TODO: Find out how to detect for redeployment

			// const oldCommand = find(client, require(cmdPath));
			// const newCommand = find(client, requireCache(cmdPath));

			// const oldData = { name: oldCommand.data.name, options: oldCommand.data.options };
			// const newData = { name: newCommand.data.name, options: newCommand.data.options };

			// if (oldData != newData) deploy = true;
			if (mtime > client.lastReload) display = true;
		});

		if (deploy) {
			const row = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('deploy')
						.setLabel('Deploy commands')
						.setStyle(ButtonStyle.Primary),
				);
			comp = [row];
		} else if (display) {
			const row = new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setCustomId('reload')
						.setLabel('Reload commands')
						.setStyle(ButtonStyle.Primary),
				);
			comp = [row];
		}

		await interaction.reply({ embeds: [status], components: comp, ephemeral: true });
	},
	/**
	 * @param {ButtonInteraction} interaction
	 */
	async button(interaction) {
		const client = interaction.client;

		await interaction.deferUpdate();
		await interaction.editReply({ content: 'Running command!', components: [] });

		const i = interaction;
		i.reply = i.followUp;

		if (interaction.customId == 'deploy') {
			const cmd = client.commands.get('deploy');
			if (cmd && cmd.execute) await cmd.execute(i);
		} else if (interaction.customId == 'reload') {
			const cmd = client.commands.get('reload');
			if (cmd && cmd.execute) await cmd.execute(i);
		}
	},
};
