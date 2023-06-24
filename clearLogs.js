require('./logger');

const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'logs');

fs.readdir(logPath, (err, files) => {
    if (err) {
        return console.error(`Unable to scan directory: ${err}`);
    }

    files.forEach((file) => {
        fs.rmSync(path.join(logPath, file));
    });

    setTimeout(() => fs.rmSync(`${__dirname}/latestLog.json`), 1000);
});
