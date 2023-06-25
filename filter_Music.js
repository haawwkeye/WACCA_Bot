const fs = require("fs");
let songlist = require("./SongList.json");
let musiclist = require("./__MusicList.json");

musiclist.forEach(music => {
    var result = songlist.find(song => {
        return song.songId === music.songId
    });

    music.songNameTranslated = result?.songNameTranslated;
});

musiclist.sort((a, b) => b.songId - a.songId);

fs.writeFileSync("MusicList.json", JSON.stringify(musiclist, null, "\t"));