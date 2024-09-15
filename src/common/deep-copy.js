/**
 * 简易版lodash.deepClone, 在复杂object性能大约有15倍+优势
 * @see benchmarks/deepcopy-vs-lodash-deep-clone.js
 * (JSON.parse(JSON.stringify(src)) 也要比lodash.deepClone快)
 * 仅仅支持json支持的属性, number, srting, array, boolean, object
 * from http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript
 * @param {object | array} src
 * @return {object | array}
 */

module.exports = exports.default = function deepCopy(src) {
  if(src === null || typeof(src) !== 'object'){
    return src
  }
  if (Array.isArray(src)) {
    let ret = src.slice()
    let i = ret.length
    while (i--) {
      ret[i] = deepCopy(ret[i])
    }
    return ret
  }
  let dest = {}
  for (let key in src) {
    dest[key] = deepCopy(src[key])
  }
  return dest
}
