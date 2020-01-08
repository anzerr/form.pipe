
const File = require('./file.js');

class Parser {

	constructor() {
		this._stack = {
			data: Buffer.alloc(0),
			start: null
		};
		this.max = Math.pow(2, 18);
		this.last = null;
	}

	start(x) {
		let i = 0;
		for (i = 0; i < 6; i++) {
			if (this._stack.data[x + i] !== 45) {
				return false;
			}
		}
		while (i < 0xff && this._stack.data[x + i] !== 10) {
			i++;
		}
		return this._stack.data.slice(x, x + (i - 1));
	}

	isBreak(x) {
		if (this._stack.data[x] === 13 && this._stack.data[x + 1] === 10) {
			return 2;
		}
		if (this._stack.data[x + 1] === 10) {
			return 1;
		}
		return 0;
	}

	getHead(x) {
		let i = 0, offset = 0;
		while (i < 0xff) {
			let f = this.isBreak(x + i);
			if (f && this.isBreak(x + i + f)) {
				offset = f + this.isBreak(x + i + f);
				break;
			}
			i++;
		}

		let out = {}, a = this._stack.data.slice(x, x + i)
			.toString()
			.split(/\r*\n/);
		for (let v in a) {
			let c = a[v].split(':');
			if (c.length === 2) {
				out[c[0].toLowerCase()] = c[1].trim();
			}
		}
		return [i + offset, out];
	}

	isKey(part, size = 0) {
		if (this.last && this.last[2] && part.length <= (this.last[2].length + size)) {
			let i = 0;
			for (i = 0; i < this.last[2].length; i++) {
				if (part[i] !== this.last[2][i]) {
					return 0;
				}
			}
			return i;
		}
		return !this.last ? 1 : 0;
	}

	isEnd(part) {
		let i = this.isKey(part, 2);
		if (this.last && i) {
			if (part[i + 1] === 45 && part[i + 1] === 45) {
				return true;
			}
		}
		return false;
	}

	process() {
		let i = 0, out = [];
		while (i < this._stack.data.length) {
			let part = this.start(i);
			if (part && this.last && this.isEnd(part)) {
				this.last[1].push(this._stack.data.slice(this.last[0], i - this.isBreak(i - 2)));
				this.last[1].push(null);
				this.last = null;
				i += part.length;
				break;
			}
			if (part && this.isKey(part)) {
				let head = this.getHead(i + part.length);
				if (this.last) {
					this.last[1].push(this._stack.data.slice(this.last[0], i - this.isBreak(i - 2)));
					this.last[1].push(null);
				}
				i += head[0] + part.length;
				this.last = [i, new File(part, head[1]), part];
				out.push(this.last[1]);
			}
			i++;
		}
		if (this.last) {
			this.last[1].push(this._stack.data.slice(this.last[0], i));
			this.last[0] = this._stack.data.length - i;
		}
		this._stack.data = this._stack.data.slice(i, this._stack.data.length);
		return out;
	}

	push(chunk) {
		if (this._stack.data.length === 0) {
			this._stack.data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		} else {
			this._stack.data = Buffer.concat([this._stack.data, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
		}
		let data = this._stack.data;
		this._stack.data = data.slice(Math.max(0, data.length - this.max), data.length);
		return this;
	}

}

module.exports = Parser;
