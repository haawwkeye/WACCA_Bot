const fs = require("fs");
let list = require("./__Song_List.json");

list.sort((a, b) => b.songId - a.songId);

fs.writeFileSync("SongList.json", JSON.stringify(list, null, "\t"));