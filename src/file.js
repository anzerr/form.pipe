
const {PassThrough} = require('stream');

class File {

	constructor(part, header) {
		this.part = part.toString();
		this.header = header;
		this.header.part = this.part;
		this.stream = new PassThrough();
		if (this.header['content-disposition']) {
			const content = this.header['content-disposition'].slice(0, 0xfff).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
			this.name = content.match(/name="(.+)"/);
			if (this.name) {
				this.name = this.name[1];
			}
			this.filename = content.match(/filename="(.+)"/);
			if (this.filename) {
				this.filename = this.filename[1];
			}
		}
	}

	isPaused() {
		return this.stream.isPaused();
	}

	once(key, cd) {
		return this.stream.once(key, cd);
	}

	write(...arg) {
		return this.stream.write(...arg);
	}

	end(...arg) {
		return this.stream.end(...arg);
	}

	pipe(s) {
		return this.stream.pipe(s);
	}

}

module.exports = File;
