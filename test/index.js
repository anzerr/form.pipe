console.log('start test', process.cwd(), __dirname);

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
const random = () => Math.random().toString(36).substring(2);
const PORT = 10000 + Math.floor(Math.random() * 3000);

const toHash = () => {
	let format = new Transform({
		objectMode: true
	});
	format._transform = function(file, enc, cb) {
		const h = crypto.createHash('sha256');
		let out = '';
		file.stream.pipe(h).on('data', (res) => {
			out += res.toString('hex');
		}).on('error', (err) => callback(err)).on('close', () => {
			cb(null, out);
		});
	};
	return format;
};

const toString = () => {
	let format = new Transform({
		objectMode: true
	});
	format._transform = function(file, enc, cb) {
		let out = [], done = false;
		file.stream.on('data', (res) => {
			if (done) {
				console.log('what the fuck', out, done);
			}
			out.push(res);
		}).on('error', (err) => callback(err)).on('close', () => {
			out = Buffer.concat(out);
			done = true;
			cb(null, [out.length, out.toString()]);
		});
	};
	return format;
};

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

const run = (stream, type) => {
	return new Promise((resolve, reject) => {
		let out = [];
		stream.pipe(new FormPipe()).pipe(type()).on('data', (res) => {
			process.stdout.write('*');
			out.push(res);
		}).on('error', (err) => reject(err)).on('close', () => {
			process.stdout.write('+');
			resolve(out);
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
		let a = http.request({method: 'POST', hostname: '127.0.0.1', port: PORT}, (res) => {
			const data = [];
			res.on('data', (chunk) => {
				data.push(chunk);
			}).on('end', () => {
				const out = JSON.parse(Buffer.concat(data).toString());
				resolve(out);
			});
		});
		fs.createReadStream(file).pipe(a);
	});
}

const timeout = setTimeout(() => {
	console.log(new Error('test hit timeout'));
	process.exit(1);
}, 1000 * 10);

let totalReqs = 0;
run(fs.createReadStream('./test/dump/out.dump'), toHash).then((hash) => {
	return run(fs.createReadStream('./test/dump/out.dump'), toString).then((str) => {
		//return run(fs.createReadStream('./test/dump/out.dump'), toFile);
	}).then(() => {
		assert.strictEqual(hash[0], '649a105b013e25921fd83083c747141a5324bd6fba3c6297f6edf402527248a3');
		assert.strictEqual(hash[1], 'ea18d16695e8c5a9a1cd63c34a483cadf6bfc27bcd969b1a77e93b12022e60df');
		console.log('-> ./test/dump/out.dump done');
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/double.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/double.dump'), toString).then((str) => {
			assert.strictEqual(str[0][0], 163);
			assert.strictEqual(hash[0], '883f91b7bee0d9a8b8d54fe385f125b1d873d38900ecab236e1dae0b97539dc2');
			console.log('-> ./test/dump/double.dump done');
		});
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/doublecr.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/doublecr.dump'), toString).then((str) => {
			assert.strictEqual(str[0][0], 168);
			assert.strictEqual(hash[0], '1f460f27eff7c534b9330669bbe27ee05c332a866b220df5916c67ac3ec44235');
			console.log('-> ./test/dump/doublecr.dump done');
		});
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/double2.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/double2.dump'), toString).then((str) => {
			assert.strictEqual(str[0][0], 162);
			assert.strictEqual(hash[0], '2c3ea79ec419eddc5e6265c4f1bc40bdbcad19c097807c28cda2de45e641944c');
			console.log('-> ./test/dump/double2.dump done');
		});
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/out2.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/out2.dump'), toString).then((str) => {
			assert.strictEqual(str[0][0], 14);
			assert.strictEqual(hash[0], 'c29762f1f21126b969eaa5dbd9e1b783d8b317b5ca8f1bb70f99092bba1391f5');
			console.log('-> ./test/dump/out2.dump done');
		});
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/empty.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/empty.dump'), toString).then((str) => {
			assert.strictEqual(str[0][0], 0);
			assert.strictEqual(hash[0], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
			console.log('-> ./test/dump/empty.dump done');
		});
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/empty1.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/empty1.dump'), toString).then((str) => {
			assert.strictEqual(hash.length, 0);
			assert.strictEqual(str.length, 0);
			console.log('-> ./test/dump/empty1.dump done');
		});
	});
}).then(() => {
	return run(fs.createReadStream('./test/dump/empty2.dump'), toHash).then((hash) => {
		return run(fs.createReadStream('./test/dump/empty2.dump'), toString).then((str) => {
			assert.strictEqual(str[0][0], 0);
			assert.strictEqual(hash[0], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
			console.log('-> ./test/dump/empty2.dump done');
		});
	});
}).then(() => {
	return testFile(['./index.js']).then(() => {
		return testFile(['./index.js', './index.js']);
	});
}).then(() => {
	console.log('-> testFile "./index.js" done');
	return new Promise((resolve) => {
		const server = http.createServer((req, res) => {
			run(req, toHash).then((d) => {
				totalReqs++;
				console.log('request handled');
				res.end(JSON.stringify(d));
			});
		}).listen(PORT, () => {
			resolve(server);
		});
	});
}).then((server) => {
	console.log('-> server up');
	let wait = [];
	for (let i = 0; i < 10; i++) {
		wait.push(sendFileToServer('./test/dump/out.dump').then((hash) => {
			assert.strictEqual(hash[0], '649a105b013e25921fd83083c747141a5324bd6fba3c6297f6edf402527248a3');
			assert.strictEqual(hash[1], 'ea18d16695e8c5a9a1cd63c34a483cadf6bfc27bcd969b1a77e93b12022e60df');
		}));
		wait.push(sendFileToServer('./test/dump/empty.dump').then((hash) => {
			assert.strictEqual(hash[0], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
		}));
		wait.push(sendFileToServer('./test/dump/empty1.dump').then((hash) => {
			assert.strictEqual(hash.length, 0);
		}));
		wait.push(sendFileToServer('./test/dump/empty2.dump').then((hash) => {
			assert.strictEqual(hash[0], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
		}));
	}
	return Promise.all(wait).then(() => {
		console.log('-> all req sent');
		clearInterval(heartbeat);
		clearTimeout(timeout);
		server.close();
		assert.strictEqual(totalReqs, wait.length);
	});
}).then(() => {
	console.log('-> done test valid');
	process.exit(0);
}).catch((err) => {
	console.log(err);
	console.log('-> invalid tets');
	clearInterval(heartbeat);
	clearTimeout(timeout);
	process.exit(1);
});
