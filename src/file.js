
const {PassThrough} = require('stream');

class File {

	constructor(key, header) {
		this.key = key;
		this.header = header;
		this.stream = new PassThrough();
		if (this.header['content-disposition']) {
			const content = this.header['content-disposition'].slice(0, 255).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
			this.name = content.match(/name="([\s-_\.a-zA-Z0-9]+)"/);
			if (this.name) {
				this.name = this.name[1];
			}
			this.filename = content.match(/filename="([\s-_\.a-zA-Z0-9]+)"/);
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
