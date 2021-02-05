
const {Transform} = require('stream');

class Pad extends Transform {

	constructor(config) {
		super();
		this.config = config;
	}

	_transform(res, encoding, callback) {
		if (this.config.start) {
			const len = this.config.start.length,
				size = Math.floor(len / 2);
			this.push(this.config.start.slice(0, size)); // simulate the stream getting sliced at the start
			this.push(this.config.start.slice(size, len));
			this.push(res);
			this.config.start = null;
			callback(null, null);
		} else {
			callback(null, res);
		}
		/*callback(null, this.config.start ? Buffer.concat([this.config.start, res]) : res);
		this.config.start = null;*/
	}

	_flush(callback) {
		if (this.config.end) {
			const len = this.config.end.length,
				size = Math.floor(len / 2);
			this.push(this.config.end.slice(0, size)); // simulate the stream getting sliced at the end
			this.push(this.config.end.slice(size, len));
		} else {
			this.push(null);
		}
		callback();
	}

}

module.exports = Pad;
