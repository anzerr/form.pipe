const http = require('http'),
	fs = require('fs'),
	crypto = require('crypto'),
	assert = require('assert'),
	path = require('path'),
	mime = require('mime.util'),
	hash = require('fs.hash'),
	{FormPipe} = require('../index.js'),
	Form = require('./form.js'),
	{Transform} = require('stream');

const heartbeat = setInterval(() => {}, 100);

const toHash = () => {
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

const random = () => Math.random().toString(36).substring(2);

const toFile = () => {
	return new Transform({
		objectMode: true,
		transform: (file, encoding, callback) => {
			try {
				const name = `./0a${random()}.tmp`;
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

const run = (stream, withFiles) => {
	return new Promise((resolve) => {
		let out = [];
		stream.pipe(new FormPipe()).pipe(toHash()).on('data', (res) => {
			if (withFiles) {
				if (res !== '649a105b013e25921fd83083c747141a5324bd6fba3c6297f6edf402527248a3' && res !== 'ea18d16695e8c5a9a1cd63c34a483cadf6bfc27bcd969b1a77e93b12022e60df') {
					throw Error(`not valid ${res}`);
				}
			}
			out.push(res);
		}).on('finish', () => {
			if (withFiles) {
				assert.equal(out.length, 2);
			}
			resolve();
		});
	});
};

let testFile = (files) => {
	console.log('testFile', files);
	let p = Promise.resolve(), find = {},
		key = `WebKitFormBoundary${random()}`;
	for (const i in files) {
		((file, n) => {
			p = p.then(() => {
				const fileInfo = path.parse(file);
				const start = Buffer.from([
					`${n !== 0 ? '\r\n' : ''}------${key}`,
					`Content-Disposition: form-data; name="bfile"; filename="${fileInfo.base}"`,
					`Content-Type: ${mime.lookup(fileInfo.ext)}`
				].join('\r\n') + '\r\n\r\n');
				const form = new Form({
					start: start,
					end: null
				});
				return new Promise((resolve) => {
					fs.createReadStream(file)
						.pipe(form)
						.pipe(fs.createWriteStream('out.tmp', n !== 0 ? {flags: 'a'} : undefined))
						.on('close', () => {
							resolve();
						});
				});
			}).then(() => {
				return hash(file).then((h) => {
					console.log('input', file, h);
					find[h] = false;
				});
			});
		})(files[i], Number(i));
	}

	return p.then(() => {
		return new Promise((resolve) => {
			const form = new Form({
				start: null,
				end: Buffer.from(`\r\n------${key}--\r\n`)
			});
			fs.createReadStream('out.tmp').pipe(form).pipe(fs.createWriteStream('out1.tmp')).on('finish', () => {
				resolve();
			});
		});
	}).then(() => {
		let wait = [];
		return new Promise((resolve) => {
			fs.createReadStream('out1.tmp').pipe(new FormPipe()).pipe(toFile()).on('data', (f) => {
				wait.push(hash(f).then((h) => {
					console.log('output', f, h);
					for (let i in find) {
						if (!find[i] && i === h) {
							find[i] = true;
						}
					}
				}));
			}).on('finish', () => {
				resolve();
			});
		}).then(() => {
			return Promise.all(wait).then(() => {
				console.log('done', find);
			});
		}).then(() => {
			for (let i in find) {
				assert.equal(find[i], true);
			}
		});
	});
};

const sendFileToServer = (file) => {
	return new Promise((resolve) => {
		let a = http.request({method: 'POST', hostname: '127.0.0.1', port: 1358}, (res) => {
			res.on('data', () => {
				// console.log('data', res.toString());
			}).on('end', () => {
				resolve();
			});
		});
		fs.createReadStream(file).pipe(a);
	});
}

Promise.all([
	run(fs.createReadStream('./test/dump/out.dump'), true),
	run(fs.createReadStream('./test/dump/out.dump'), true),
	run(fs.createReadStream('./test/dump/empty.dump'), false),
	run(fs.createReadStream('./test/dump/empty1.dump'), false),
	run(fs.createReadStream('./test/dump/empty2.dump'), false),
	testFile(['./index.js']).then(() => {
		return testFile(['./index.js', './index.js']);
	})
]).then(() => {
	let reqs = 0;
	const server = http.createServer((req, res) => {
		run(req).then(() => {
			reqs++;
			res.end('cat');
		});
	}).listen(1358, () => {
		let wait = [];
		for (let i = 0; i < 10; i++) {
			wait.push(sendFileToServer('./test/dump/out.dump'));
			wait.push(sendFileToServer('./test/dump/empty.dump'));
			wait.push(sendFileToServer('./test/dump/empty1.dump'));
			wait.push(sendFileToServer('./test/dump/empty2.dump'));
		}
		Promise.all(wait).then(() => {
			clearInterval(heartbeat);
			server.close();
			assert.equal(reqs, 10 * 4);
		});
	});
});
