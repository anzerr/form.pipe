
const {Transform} = require('stream');

const split = (data, push) => {
	const len = data.length,
		size = Math.floor(len / 2);
	push(data.slice(0, size));
	push(data.slice(size, len));
}

class Pad extends Transform {

	constructor(config) {
		super();
		this.config = config;
	}

	_transform(res, encoding, callback) {
		if (this.config.start) {
			split(this.config.start, (d) => this.push(d));
			this.push(res);
			this.config.start = null;
			callback(null, null);
		} else {
			callback(null, res);
		}
	}

	_flush(callback) {
		if (this.config.start) {
			split(this.config.start, (d) => this.push(d));
			this.config.start = null;
		}
		if (this.config.end) {
			split(this.config.end, (d) => this.push(d));
		} else {
			this.push(null);
		}
		callback();
	}

}

module.exports = Pad;
