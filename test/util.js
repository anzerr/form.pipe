
const key = require('unique.util');

const ALPHA_NUM = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
module.exports = {
    random: (length) => {
        return key.random({char: ALPHA_NUM, length});
    },
    randomBlock: (length) => {
        return key.random({char: ALPHA_NUM + '\n\r\t ', length});
    }
}