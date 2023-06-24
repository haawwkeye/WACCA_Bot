// eslint-disable-next-line no-unused-vars
const { SlashCommandBuilder, ChatInputCommandInteraction } = require('discord.js');

const path = require('path');

function deployCommands() {
	const deployPath = path.join(__dirname, '..', 'deploy.js');
	if (require.cache[deployPath]) delete require.cache[deployPath];
	return require('../deploy');
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('deploy')
		.setDescription('Attempts to deploy commands'),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		const user = (interaction.user ?? interaction.member.user);
		const client = interaction.client;
		if (!client.isOwner(user.id)) { return await interaction.reply({ content: `Invalid permissions for '${interaction.commandName}'`, ephemeral: true }); }
		await interaction.reply({ content: 'Attempting to deploy commands!', ephemeral: true });
		deployCommands();
		await interaction.followUp({ content: 'Deployed commands\nAttempting to reload commands!', ephemeral: true });
		client.loadCommands();
		await interaction.followUp({ content: 'Successfully updated!', ephemeral: true });
	},
};
