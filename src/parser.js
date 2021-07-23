
const File = require('./file.js');

class Parser {

	constructor() {
		this._stack = {
			data: Buffer.alloc(0),
			start: null
		};
		this.highWaterMark = Math.pow(2, 14);
		this.max = Math.pow(2, 18);
		this.last = null;
		this.finished = false;
	}

	start(x) {
		let i = 0;
		for (i = 0; i < 6; i++) {
			if (this._stack.data[x + i] !== 45) {
				return null;
			}
		}
		while (i < 0xff && x + i < this._stack.data.length && !this.isBreak(x + i - 1)) {
			i++;
		}
		if (i === 0xff) {
			return null;
		}
		return this._stack.data.slice(x, x + i);
	}

	isBreak(x) {
		if (this._stack.data[x + 1] === 10) {
			return 1;
		}
		if (this._stack.data[x + 1] === 13 && this._stack.data[x + 2] === 10) {
			return 2;
		}
		return 0;
	}

	getHead(x) {
		let i = 0, offset = 0, breakPad = 0;
		while (i < 0xfff) {
			let f = this.isBreak(x + i), g = 0;
			if (f) {
				g = this.isBreak(x + i + f);
			}
			if (f && g) {
				breakPad = f;
				offset = f + g + 1;
				break;
			}
			i++;
		}

		let out = {}, a = this._stack.data.slice(x, x + i + breakPad)
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

	findLastBreak(i) {
		return Math.max(
			this.isBreak(i - 3),
			this.isBreak(i - 2)
		);
	}

	process(cd, force) {
		if (this.finished || (this._stack.data.length < this.highWaterMark && !force)) {
			return cd([]);
		}
		let i = 0, out = [], back = [];
		while (i < this._stack.data.length) {
			let part = this.start(i);
			if (part && this.last && this.isEnd(part)) {
				const write = this._stack.data.slice(this.last[0], i - this.findLastBreak(i));
				back.push(this.last[1].write(write));
				back.push(this.last[1].end(null));
				this.last = null;
				i += part.length;
				this.finished = true;
				break;
			}
			if (part && this.isKey(part)) {
				if (this.last) {
					const write = this._stack.data.slice(this.last[0], i - this.findLastBreak(i));
					back.push(this.last[1].write(write));
					back.push(this.last[1].end(null));
				}
				let head = this.getHead(i + part.length);
				i += head[0] + part.length;
				this.last = [i, new File(part, head[1]), part];
				back = [];
				out.push(this.last[1]);
			} else {
				i++;
			}
		}
		const maxI = force ? i : Math.min(this._stack.data.length - 0xff, i);
		if (this.last) {
			const write = this._stack.data.slice(this.last[0], maxI);
			back.push(this.last[1].write(write));
			this.last[0] = 0;
		}
		if (maxI === this._stack.data.length) {
			this._stack.data = Buffer.alloc(0);
		} else {
			this._stack.data = this._stack.data.slice(maxI, this._stack.data.length);
		}
		back = back.reduce((a, b) => a && b, true);
		if (!back && !out.length && this.last) {
			this.last[1].once('drain', () => {
				cd(out);
			});
		} else {
			cd(out);
		}
	}

	push(chunk) {
		if (this._stack.data.length === 0) {
			this._stack.data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		} else {
			this._stack.data = Buffer.concat([this._stack.data, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
		}
		let data = this._stack.data;
		if (data.length > this.max) {
			this._stack.data = data.slice(Math.max(0, data.length - this.max), data.length);
		}
		return this;
	}

	destroy() {
		this.last = null;
		this._stack = null;
		this.finished = true;
	}

}

module.exports = Parser;
