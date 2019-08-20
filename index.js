
const {Transform} = require('stream'),
	Parser = require('./src/parser.js');

class FormPipe extends Transform {

	constructor() {
		super({objectMode: true});
		this.parser = new Parser();
	}

	_transform(chunk, encoding, callback) {
		let o = this.parser.push(chunk).process();

		for (let i in o) {
			((file) => {
				this.push({
					name: file.name,
					filename: file.filename,
					header: file.header,
					stream: file.stream
				});
			})(o[i]);
		}
		callback();
	}

}

module.exports = {
	FormPipe: FormPipe,
	Parser: Parser,
	parse: (data) => {
		let p = new Parser();
		return p.push(data).process();
	}
};
