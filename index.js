
const {Transform} = require('stream'),
	Parser = require('./src/parser.js');

class FormPipe extends Transform {

	constructor(o) {
		super({readableObjectMode: true});
		this.parser = new Parser(o);
	}

	runProcess(callback, force) {
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
			callback(null);
		}, force);
	}

	_transform(chunk, encoding, callback) {
		try {
			if (chunk) {
				this.parser.push(chunk);
			}
			this.runProcess(callback, false);
		} catch(err) {
			callback(err);
		}
	}

	_flush(callback) {
		this.runProcess(() => {
			if (this.parser.last) {
				this.parser.last[1].end(null);
			}
			if (this.parser) {
				this.parser.destroy();
				this.parser = null;
			}
			callback();
		}, true);
	}

	_destroy(err, callback) {
		if (this.parser) {
			this.parser.destroy();
			this.parser = null;
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
