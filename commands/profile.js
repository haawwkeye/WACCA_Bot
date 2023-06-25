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
		.setName('profile')
		.setDescription('Replies with profile!')
        .addNumberOption(option => option
            .setName('userid')
            .setDescription('The userId you want to get the info for')
            .setRequired(true)),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
        const client = interaction.client;
		let database = client.database;
        if (!database) return await interaction.reply({ content: 'Failed to connect to artemis database', ephemeral: true });
        let result = await new Promise((res, rej) => {
            database.query("SELECT * FROM wacca_profile", (error, results, fields) => {
                if (error) return rej(error);
                res(results);
            });
        })

        let uid = interaction.options.getNumber('userid');
        let filter = result.filter(user => user.user == uid);

        if (filter.length == 0) return await interaction.reply({ content: `UserId "**${uid}**" not found in artemis database`, ephemeral: true });
        let user = filter[0];

        let userLevel = Math.floor(user.xp / 100);

        let userEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle(`${user.username}'s Profile`)
			.addFields(
                { name: "Level", value: `${userLevel}` },
                { name: "XP", value: `${user.xp}` },
                { name: "Rate", value: `${user.rating}` },
                { name: "Total Playcount", value: `${user.playcount_single + user.playcount_multi_vs + user.playcount_multi_coop + user.playcount_time_free + user.playcount_stageup}` },
                { name: "Last login", value: `${dateToString(user.last_login_date)}`  }
			);

        await interaction.reply({ embeds: [userEmbed], ephemeral: true });
	},
};
