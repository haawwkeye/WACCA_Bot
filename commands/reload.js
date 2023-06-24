// eslint-disable-next-line no-unused-vars
const { SlashCommandBuilder, ChatInputCommandInteraction } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reload')
		.setDescription('Attempts to reload loaded commands')
		.addBooleanOption(option => option.setName('full_update').setDescription('Should the bot attempt to reload ALL commands instead of loaded only').setRequired(false)),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		const user = (interaction.user ?? interaction.member.user);
		const client = interaction.client;
		const options = interaction.options ?? null;
		if (!client.isOwner(user.id)) { return await interaction.reply({ content: `Invalid permissions for '${interaction.commandName}'`, ephemeral: true }); }
		const full = (options != null && interaction.options.getBoolean('full_update')) ?? false;
		await interaction.reply({ content: 'Attempting to reload commands!', ephemeral: true });
		client.loadCommands(full);
		await interaction.followUp({ content: 'Successfully updated!', ephemeral: true });
	},
};
