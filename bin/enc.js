/**
 * 加密字符串
 */
let target = process.argv[2]
const {enc} = require('sugo-encoder')
if (!target) {
  console.error('需要参数 string, node enc.js {string}')
}
console.log(enc(target))
