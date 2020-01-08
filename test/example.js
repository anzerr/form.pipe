
const http = require('http'),
	fs = require('fs'),
	path = require('path'),
	{FormPipe} = require('../index.js'),
	{Transform} = require('stream');

const random = () => Math.random().toString(36).substring(2);

const toFile = () => {
	return new Transform({
		objectMode: true,
		transform: (file, encoding, callback) => {
			try {
				const fileInfo = path.parse(file.filename), name = `./0a${random()}${fileInfo.ext}`;
				console.log('write file', file.filename, name);
				file.stream.pipe(fs.createWriteStream(name))
					.on('error', (err) => callback(err))
					.on('close', () => {
						callback(null, name);
					});
			} catch (err) {
				callback(err);
			}
		}
	});
};

http.createServer((req, res) => {
	console.log('req');

	/* req.pipe(fs.createWriteStream('test.dump')).on('finish', () => {
		res.end('cat');
	});*/
	req.pipe(new FormPipe()).pipe(toFile()).on('finish', () => {
		console.log('done');
		res.end('cat');
	});
}).listen(1358, () => {
	console.log('up');
});
