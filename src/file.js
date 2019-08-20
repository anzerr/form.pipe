
const {PassThrough} = require('stream');

class File {

	constructor(header) {
		this.header = header;
		this.stream = new PassThrough();
		this.name = this.header['content-disposition'].match(/name="([-_\.a-zA-Z0-9]+)"/);
		if (this.name) {
			this.name = this.name[1];
		}
		this.filename = this.header['content-disposition'].match(/filename="([-_\.a-zA-Z0-9]+)"/);
		if (this.filename) {
			this.filename = this.filename[1];
		}
	}

	push(...arg) {
		return this.stream.push(...arg);
	}

	pipe(s) {
		return this.stream.pipe(s);
	}

}

module.exports = File;
