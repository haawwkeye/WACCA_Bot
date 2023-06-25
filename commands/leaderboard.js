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
                    { name: "Normal", value: 0 },
                    { name: "Hard", value: 1 },
                    { name: "Expert", value: 2 },
                    { name: "INFERNO", value: 3 },
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

        // let rawProfileData = await query(database, `SELECT * FROM wacca_profile WHERE user="${uid}";`);
        // let rawPlaylogData = await query(database, `SELECT * FROM wacca_score_playlog WHERE user="${uid}";`);
        
        // rawPlaylogData.sort((a, b) => b.id - a.id); // Sort from newest to oldest

        // if (rawProfileData.length == 0) return await interaction.reply({ content: `UserId "**${uid}**" not found in artemis database`, ephemeral: true });

        if (subcommand == "global")
        {
            let uid = interaction.options.getNumber('userid');
            let rawProfileData = await query(database, `SELECT * FROM wacca_profile;`);
            let index = 0;
            let lbEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle("Global Ranks")

            rawProfileData.sort((a, b) => b.rating - a.rating);
            
            if (rawProfileData.length == 0) lbEmbed.setDescription(`No users found in the database!`);
            else rawProfileData.forEach(profile => {
                index++;
                if (uid == null || uid && profile.user == uid) lbEmbed.addFields({ name: `#${index} ${profile.username}`, value: `Level: **${Math.floor(profile.xp / 100)}**\nXP: **${profile.xp}**\nRate: **${profile.rating}**` });
            });

            if (uid && lbEmbed.data.fields == null) lbEmbed.setDescription(`UserId "**${uid}**" not found in artemis database`);

            return await interaction.reply({ embeds:[lbEmbed], ephemeral: true });
        }
        else if (subcommand == "song")  
        {
            const songList = client.songList;
            let sid = interaction.options.getNumber('songid');
            let cid = interaction.options.getNumber('chartid');

            let result = songList.find(song => {
                return song.songId === sid;
            });

            if (result)
            {
                let lbEmbed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(`${result.songName} by ${result.songArtist} Leaderboard`)
                
                if (result.songNameTranslated) lbEmbed.setDescription(`Translated Title: **${result.songNameTranslated}**`);
                
                return await interaction.reply({ embeds: [lbEmbed], ephemeral: true });
            }
            
            // TODO: Add Song support!
        }

        await interaction.reply({ content: 'Unhandled leaderboard request.', ephemeral: true });
	},
};
