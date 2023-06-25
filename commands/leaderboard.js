// eslint-disable-next-line no-unused-vars
const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } = require('discord.js');

function dateToString(date)
{
    let str = date;
    try {
        str = `<t:${(date.getTime() - date.getTimezoneOffset()*60*1000)/1000}:f>`;
    } catch { /* empty block */ }
    
    return str;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Replies with a song leaderboard!')
        .addNumberOption(option => option
            .setName('userid')
            .setDescription('The userId you want to get the leaderboard for')
            .setRequired(false))
        .addNumberOption(option => option
            .setName('songid')
            .setDescription('The songId you want to get the leaderboard for')
            .setRequired(false)),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
        const client = interaction.client;
        const query = client.queryDatabase;
        let uid = interaction.options.getNumber('userid');
        let sid = interaction.options.getNumber('songid');
		let database = client.database;
        
        if (!database) return await interaction.reply({ content: 'Failed to connect to artemis database', ephemeral: true });

        // let rawProfileData = await query(database, `SELECT * FROM wacca_profile WHERE user="${uid}";`);
        // let rawPlaylogData = await query(database, `SELECT * FROM wacca_score_playlog WHERE user="${uid}";`);
        
        // rawPlaylogData.sort((a, b) => b.id - a.id); // Sort from newest to oldest

        // if (rawProfileData.length == 0) return await interaction.reply({ content: `UserId "**${uid}**" not found in artemis database`, ephemeral: true });

        await interaction.reply({ content: 'Leaderboard disabled.', ephemeral: true });
	},
};
