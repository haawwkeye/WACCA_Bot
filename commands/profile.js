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
        const query = client.queryDatabase;
        let uid = interaction.options.getNumber('userid');
		let database = client.database;
        
        if (!database) return await interaction.reply({ content: 'Failed to connect to artemis database', ephemeral: true });

        let rawProfileData = await query(database, `SELECT * FROM wacca_profile WHERE user="${uid}";`);
        let rawPlaylogData = await query(database, `SELECT * FROM wacca_score_playlog WHERE user="${uid}";`);
        
        rawPlaylogData.sort((a, b) => b.id - a.id); // Sort from newest to oldest

        if (rawProfileData.length == 0) return await interaction.reply({ content: `UserId "**${uid}**" not found in artemis database`, ephemeral: true });
        
        let user = rawProfileData[0];
        // So far from what I can tell level is just 1 every 100 xp?
        let userLevel = Math.floor(user.xp / 100);

        let userEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle(`${user.username}'s Profile`)
			.addFields(
                { name: "Level", value: `${userLevel}` },
                { name: "XP", value: `${user.xp}` },
                { name: "Rate", value: `${user.rating}` },
                { name: "Total Songs Played", value: `${rawPlaylogData.length}` },
                { name: "Last login", value: `${dateToString(user.last_login_date)}` }
			);

        let userSongEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`${user.username}'s Last Played songs`);
        
        if (rawPlaylogData.length > 0)
        {
            // Have 1-3 songs listed only
            for (let i = 0; i <= Math.min(rawPlaylogData.length, 2); i++) {
                const playlog = rawPlaylogData[i];
                const bestPlay = await query(database, `SELECT * FROM wacca_score_best WHERE user="${uid}" AND song_id="${playlog.song_id}" AND chart_id="${playlog.chart_id}"`);
                
                let result = songList.find(song => {
                    return song.songId === playlog.song_id;
                });

                let bestScore = "";
                let bestCombo = "";
                let translated = "";
                let songName = playlog.song_id;

                if (bestPlay.length != 0)
                {
                    bestScore = `\nBest Score: **${bestPlay[0].score}**`;
                    bestCombo = `\nBest Max Combo: **${bestPlay[0].best_combo}**`;
                }
                if (result)
                {
                    if (result.songNameTranslated) translated = `Translated Title: **${result.songNameTranslated}**\n`;
                    songName = `${result.songName} by ${result.songArtist}`;
                }
                
                // TODO: Add grade stuff to this (Grade and Best Grade)
                userSongEmbed.addFields({ name: songName, value: `${translated}Score: **${playlog.score}**${bestScore}\nMax Combo: **${playlog.max_combo}**${bestCombo}\nDate Scored: **${dateToString(playlog.date_scored)}**` });
            }
        } else userSongEmbed.setDescription(`This user hasn't played any songs yet!`);
        

        await interaction.reply({ embeds: [userEmbed, userSongEmbed], ephemeral: true });
	},
};
