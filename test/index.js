
const fs = require('fs'),
	assert = require('assert'),
	crypto = require('crypto'),
	FormPipe = require('../index.js');

let wait = [];

wait.push(new Promise((resolve) => {
	fs.createReadStream('./test/out.dump').pipe(new FormPipe()).on('data', (file) => {
		wait.push(new Promise((resolve) => {
			const hash = crypto.createHash('sha256');
			file.stream.pipe(hash).on('data', (res) => {
				if (file.name === 'afile') {
					assert.equal(res.toString('hex'), 'cb8ab9d48f171af83541e5351dcbde7b287e415fcfe9bbf2a31ac04d163c41ab');
				}
				if (file.name === 'bfile') {
					assert.equal(res.toString('hex'), '2804e84f2df208a6b9f70603149d87623ed5ac2125d3ef1267db807927f08345');
				}
			}).on('finish', resolve);
		}));
	}).on('finish', resolve);
}));

Promise.all(wait).then(() => {
	console.log('done');
}).catch(console.log);
