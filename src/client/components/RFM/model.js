/**
 * Created on 11/04/2017.
 */

import { UTF8Parser, Base64Parser } from 'next-reader'
import _ from 'lodash'

/**
 * 生成二维数据所有组合，返回值为所有组合的二维数组
 * 每一个数组表示一个组合
 * 其`index`为原二维数组的`index`
 * 其值为原二维数组子数组的`index`
 * @param matrix
 * @return {Array<Array>}
 */
function combination (matrix) {
  matrix = matrix.filter(r => r.length > 0)
  const max = matrix.map(r => r.length - 1)
  const count = matrix.reduce((p, c) => p * c.length, 1)
  const base = max.map(() => 0)
  const end = base.length - 1
  const result = []

  let v = 0, i = end
  let total = 0

  while (total < count) {
    total++
    if (v > max[end]) {
      // 左边进位
      for (let j = i - 1; j >= 0; j--) {
        // 没超过最大值，当前位 + 1
        if (base[j] < max[j]) {
          base[j] = base[j] + 1
          break
        } else {
          // 超过了，继续比较左边下一位
          i = j
        }
      }

      // 右边清零
      for (let k = i; k <= end; k++) {
        base[k] = 0
      }

      i = end
      v = 1
    } else {
      base[end] = v++
    }

    result.push(base.slice())
  }

  return result
}

/**
 * @example
 * ```js
 * const matrix = [
 *   ['1', '2', '3'],
 *   ['a', 'b']
 * ]
 * const result = getCombinationFromMatrix(matrix)
 * // =>
 * // [["1","a"],["1","b"],["2","a"],["2","b"],["3","a"],["3","b"]]
 * ```
 * @param matrix
 * @return {Array}
 */
function getCombinationFromMatrix (matrix) {
  return combination(matrix).map(r => r.map((v, i) => matrix[i][v]))
}

/**
 * 生成RFM userGroup标题
 * @param {{R:Array<number>,F:Array<number>,M:Array<number>}} record
 * @return {string}
 */
function getRFMUserGroupsTitle (record) {
  return ['R', 'F', 'M'].map(key => getRFMName(record[key], key)).join(', ')
}

/**
 * 生成RFM标题
 * @example
 * getRFMName([0,1], 'R') // 0<=R<=1
 * @param arr
 * @param key
 * @return {string}
 */
function getRFMName (arr, key) {
  return arr.length === 1
    ? `${key}>${arr[0]}`
    : `${arr[0]}<=${key}<=${arr[1]}`
}

function getBaseQueryParams ({ R, F, M }) {
  return { R, F, M }
}

function getCustomQueryParams ({ R, F, M }) {
  return {
    R: _.uniq(R.slice(0, -1).map(r => r[0])),
    F: _.uniq(F.slice(0, -1).map(r => r[0])),
    M: _.uniq(M.slice(0, -1).map(r => r[0]))
  }
}

function stringToBase64 (str) {
  const buf = UTF8Parser.stringToUTF8Uint8(str)
  return new Base64Parser().encode(buf)
}

const RFMNameReg = /^(?:.){2,32}$/
function checkName (name) {
  return RFMNameReg.test(name)
}

function checkNumberArrayOrdered (arr) {
  if (arr.length === 1) return true
  let ret = true
  let p = arr[0]
  let v
  for (let i = 1; i < arr.length; i++) {
    v = arr[i]
    if (p > v) {
      ret = false
      break
    }
    p = v
  }
  return ret
}

function checkCustomParams (obj) {
  return ['R', 'F', 'M'].every(k => checkNumberArrayOrdered(obj[k]))
}
export {
  stringToBase64,
  checkNumberArrayOrdered,
  checkName,
  checkCustomParams,
  getRFMName,
  getRFMUserGroupsTitle,
  getBaseQueryParams,
  getCustomQueryParams,
  getCombinationFromMatrix
}
