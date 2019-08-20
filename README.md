
### `Intro`
Parse stream of multipart into sub streams per part

#### `Install`
``` bash
npm install --save git+https://git@github.com/anzerr/form.pipe.git
```

### `Example`
``` javascript
const fs = require('fs'),
	path = require('path'),
	FormPipe = require('form.pipe');

fs.createReadStream('./test/out.dump').pipe(new FormPipe()).on('data', (file) => {
	file.stream.pipe(fs.createWriteStream(path.join(__dirname, file.filename))).on('close', () => {
		console.log(file.name, 'done');
	});
});
```