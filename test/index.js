const http = require('http'),
	fs = require('fs'),
	crypto = require('crypto'),
	assert = require('assert'),
	{FormPipe} = require('../index.js'),
	{Transform} = require('stream');

let hash = () => {
	let format = new Transform({
		objectMode: true
	});
	format._transform = function(file, enc, cb) {
		const h = crypto.createHash('sha256');
		let out = '';
		file.stream.pipe(h).on('data', (res) => {
			out += res.toString('hex');
		}).on('finish', () => {
			cb(null, out);
		});
	};
	return format;
};

let run = (stream) => {
	return new Promise((resolve) => {
		let out = [];
		stream.pipe(new FormPipe()).pipe(hash()).on('data', (res) => {
			if (res !== 'cb8ab9d48f171af83541e5351dcbde7b287e415fcfe9bbf2a31ac04d163c41ab' && res !== '2804e84f2df208a6b9f70603149d87623ed5ac2125d3ef1267db807927f08345') {
				throw Error(`not valid ${res}`);
			}
			out.push(res);
		}).on('finish', () => {
			assert.equal(out.length, 2);
			resolve();
		});
	});
};

Promise.all([
	run(fs.createReadStream('./test/out.dump')),
	run(fs.createReadStream('./test/out.dump'))
]).then(() => {
	const server = http.createServer((req, res) => {
		run(req).then(() => {
			res.end('cat');
		});
	}).listen(1358, () => {
		let wait = [];
		for (let i = 0; i < 10; i++) {
			wait.push(new Promise((resolve) => {
				let a = http.request({method: 'POST', hostname: '127.0.0.1', port: 1358}, (res) => {
					res.on('data', (res) => {
						// console.log('data', res.toString());
					}).on('end', () => {
						resolve();
					});
				});
				fs.createReadStream('./test/out.dump').pipe(a);
			}));
		}
		Promise.all(wait).then(() => {
			console.log('done');
			server.close();
		});
	});
});
