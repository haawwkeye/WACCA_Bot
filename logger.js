if (require.cache[`${__dirname}/logger.js`]) return require.cache[`${__dirname}/logger.js`];

const fs = require('fs');

const pino = require('pino');
const pinoms = pino.multistream;
// require('pino-multi-stream');

const logFile = `${__dirname}/latestLog.json`;

if (fs.existsSync(logFile)) {
	// read contents of the file
	const data = fs.readFileSync(logFile, 'UTF-8');
	const split = data.split(/\r?\n/);

	// split the data into lines and get the first line
	const OP = split[0];
	const shouldMove = split.length > 1 && split[1] != '';

	const mtime = fs.statSync(logFile).mtime.getTime();
	const fileName = `${__dirname}/logs/${OP}-${mtime}.json`;

	if (shouldMove) {
		if (!fs.existsSync(fileName)) fs.writeFileSync(fileName, data);
		else fs.writeFileSync(`${fileName}_${new Date().getTime()}`, data);
	}

	fs.rmSync(logFile);
}

fs.writeFileSync(logFile, `${process.argv[2] ?? 'NULL'}\n`);

const streams = [
	{ level: 'debug', stream: process.stdout },
	{ stream: fs.createWriteStream(logFile, { flags: 'a' }) },
];

const logger = pino({
	level: 'debug',
}, pinoms(streams));

// const logger = {
// 	debug: console.debug,
// 	error: console.error,
// 	info: console.info,
// 	warn: console.warn,
// }

module.exports = logger;
