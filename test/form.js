
const {Transform} = require('stream');

class Pad extends Transform {

	constructor(config) {
		super();
		this.config = config;
	}

	_transform(res, encoding, callback) {
		callback(null, this.config.start ? Buffer.concat([this.config.start, res]) : res);
		this.config.start = null;
	}

	_flush(callback) {
		this.push(this.config.end);
		callback();
	}

}

module.exports = Pad;
