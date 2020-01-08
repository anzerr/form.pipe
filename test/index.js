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
	return  new Transform({
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
}

const run = (stream) => {
	return new Promise((resolve) => {
		let out = [];
		stream.pipe(new FormPipe()).pipe(toHash()).on('data', (res) => {
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

let testFile = (files) => {
	let p = Promise.resolve(), find = {},
		key = `WebKitFormBoundary${random()}`;
	for (const i in files) {
		((file, n) => {
			p = p.then(() => {
				const fileInfo = path.parse(file);
				const form = new Form({
					start: Buffer.from([
						`${n !== 0 ? '\n' : ''}------${key}`,
						`Content-Disposition: form-data; name="bfile"; filename="${fileInfo.base}"`,
						`Content-Type: ${mime.lookup(fileInfo.ext)}`
					].join('\n') + '\n'),
					end: null
				});
				return new Promise((resolve) => {
					fs.createReadStream(file)
						.pipe(form)
						.pipe(fs.createWriteStream('out.tmp', n !== 0 ? {flags: 'a'} : undefined))
						.on('close', () => {
							resolve();
						});
				})
			}).then(() => {
				return hash(file).then((h) => {
					console.log('input', file, h);
					find[h] = false;
				})
			})
		})(files[i], Number(i));
	}
	return p.then(() => {

	}).then(() => {
		return new Promise((resolve) => {
			const form = new Form({
				start: null,
				end: Buffer.from(`------${key}--\n`)
			});
			fs.createReadStream('out.tmp').pipe(form).pipe(fs.createWriteStream('out1.tmp')).on('finish', () => {
				resolve();
			})
		})
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
		})
	});
}

testFile(['./index.js', './index.js'])
/*
Promise.all([
	run(fs.createReadStream('./test/out.dump')),
	run(fs.createReadStream('./test/out.dump')),
	testFile(['./index.js', './index.js'])
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
});*/
