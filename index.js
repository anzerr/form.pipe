
const {Transform} = require('stream'),
	Parser = require('./src/parser.js');

class FormPipe extends Transform {

	constructor(o) {
		super({readableObjectMode: true});
		this.parser = new Parser(o);
	}

	_transform(chunk, encoding, callback) {
		try {
			if (chunk) {
				this.parser.push(chunk);
			}
			this.parser.process((o) => {
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
				// console.log('_transform');
				callback(null);
			});
		} catch(err) {
			console.log(err);
			callback(err);
		}
	}

	_flush(callback) {
		this.parser = null;
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
