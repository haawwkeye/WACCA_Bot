// eslint-disable-next-line no-unused-vars
const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } = require('discord.js');

const diffList = [
    "Normal",
    "Hard",
    "Expert",
    "INFERNO"
]

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Replies with a leaderboard you want!')
        .addSubcommand(command => command
            .setName("global")
            .setDescription("Get global ranks based on the players Rate")
            .addNumberOption(option => option
                .setName('userid')
                .setDescription('The userId you want to get the leaderboard for')
                .setRequired(false))
        )
        .addSubcommand(command => command
            .setName("song")
            .setDescription("Get a certain songs leaderboard based on songId")
            .addNumberOption(option => option
                .setName('songid')
                .setDescription('The songId you want to get the leaderboard for')
                .setRequired(true))
            .addNumberOption(option => option
                .setName('chartid')
                .setDescription('The chartId you want to get the leaderboard for')
                .setChoices(
                    { name: "Normal", value: 1 },
                    { name: "Hard", value: 2 },
                    { name: "Expert", value: 3 },
                    { name: "INFERNO", value: 4 },
                )
                .setRequired(true))
        ),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
        const client = interaction.client;
        const options = interaction.options ?? null;

        const database = client.database;
        const query = client.queryDatabase;
        
        const subcommand = options?.getSubcommand();

        if (!database) return await interaction.reply({ content: 'Failed to connect to artemis database', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        // let rawProfileData = await query(database, `SELECT * FROM wacca_profile WHERE user="${uid}";`);
        // let rawPlaylogData = await query(database, `SELECT * FROM wacca_score_playlog WHERE user="${uid}";`);
        
        // rawPlaylogData.sort((a, b) => b.id - a.id); // Sort from newest to oldest

        // if (rawProfileData.length == 0) return await interaction.reply({ content: `UserId "**${uid}**" not found in artemis database`, ephemeral: true });

        if (subcommand === "global")
        {
            let uid = options.getNumber('userid');
            let rawProfileData = await query(database, `SELECT * FROM wacca_profile;`);
            let index = 0;
            let lbEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle("Global Ranks")

            rawProfileData.sort((a, b) => b.rating - a.rating);
            
            if (rawProfileData.length == 0) lbEmbed.setDescription(`No users found in the database!`);
            else rawProfileData.forEach(profile => {
                if (index > 5) return;
                index++;
                if (uid == null || uid && profile.user == uid) lbEmbed.addFields({ name: `#${index} ${profile.username}`, value: `Level: **${Math.floor(profile.xp / 100)}**\nXP: **${profile.xp}**\nRate: **${profile.rating}**` });
            });

            if (uid && lbEmbed.data.fields == null) lbEmbed.setDescription(`UserId "**${uid}**" not found in artemis database`);

            return await interaction.editReply({ embeds:[lbEmbed], ephemeral: true });
        }
        else if (subcommand === "song")  
        {
            const songList = client.songList;
            let index = 0;
            let sid = options.getNumber('songid');
            let cid = options.getNumber('chartid');

            let result = songList.find(song => {
                return song.songId === sid;
            });

            if (result)
            {
                let chartResult = result.difficulties.find(diff => {
                    return diff.chartId === cid && diff.noteDesigner !== "-";
                });

                if (!chartResult) return await interaction.editReply({ content: `ChartId ${cid} not found in difficulty list`, ephemeral: true });

                let desc = ""
                if (result.songNameTranslated) desc = `Translated Title: **${result.songNameTranslated}**\n`;
                desc += `Difficulty: ${diffList[cid-1]} (${chartResult.level})\nNote Designer: ${chartResult.noteDesigner}`;

                let rawBestScoreData = await query(database, `SELECT * FROM wacca_score_best WHERE song_id="${sid}" AND chart_id="${cid}";`);

                // console.log(cid);
                // console.log(rawBestScoreData);

                let lbEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`${result.songName} by ${result.songArtist} Leaderboard`);
                
                // TODO: Replace this with an more complex thing
                // Reason being is that even if the score is the same doesn't mean one is better than the other
                rawBestScoreData.sort((a, b) => b.score - a.score);

                if (rawBestScoreData.length == 0) desc += "\n**No one has played this map on this difficulty yet!**"
                else {
                    for (let i = 0; i < rawBestScoreData.length; i++) {
                        const data = rawBestScoreData[i];
                        if (index > 5) return res(); // Finished loading!
                        index++;

                        let profile = await query(database, `SELECT * FROM wacca_profile WHERE user="${data.user}";`)
                        if (!profile) profile = { username: `FAILED TO GET USER ${data.user}` };
                        else profile = profile[0];

                        lbEmbed.addFields({ name: `#${index} ${profile.username}`, value: `Score: **${data.score}**\nMax Combo: **${data.best_combo}**\nGrade: **TODO**` });
                    }
                }

                lbEmbed.setDescription(desc)

                return await interaction.editReply({ embeds: [lbEmbed], ephemeral: true });
            } else return await interaction.editReply({ content: `SongId ${sid} not found in song list`, ephemeral: true });
            
            // TODO: Add Song support!
        }

        await interaction.editReply({ content: 'Unhandled leaderboard request.', ephemeral: true });
	},
};
