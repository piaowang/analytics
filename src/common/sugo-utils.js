import LZString from 'lz-string'
import _ from 'lodash'
import moment from 'moment'
import DruidColumnType, { DIMENSION_TYPES_MINI_MAP, DRUID_DIMENSION_MAP } from './druid-column-type'

/** get querystring 参数压缩加密 */
export const compressUrlQuery = (str, logTag) => {
  if (_.isObject(str)) {
    str = JSON.stringify(str)
  }
  let env
  try {
    env = process.env.NODE_ENV || (window && window.sugo && window.sugo.env)
  } catch (e) {
    env = 'production'
  }
  if (env === 'development') {
    if (logTag) {
      debug(str, 'before compress', logTag)
    } else {
      debug(str, 'before compress')
    }
  }
  return LZString.compressToEncodedURIComponent(str)
}

/** get querystring 参数解密 */
export const decompressUrlQuery = (str) => LZString.decompressFromEncodedURIComponent(str)

/**
 * 将对象转换成 url 的 query 参数
 * 参考了：http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object/1714899#1714899
 * @example toQueryParams({a: 1, b: 2}) -> a=1&b=2
 * @param obj
 * @param prefix
 * @returns {string}
 */
export const toQueryParams = function (obj, prefix = undefined) {
  let str = []
  for (let p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? prefix + `[${p}]` : p,
        v = obj[p]
      str.push(typeof v === 'object' ?
        toQueryParams(v, k) :
        encodeURIComponent(k) + '=' + encodeURIComponent(v))
    }
  }
  return str.join('&')
}

/** lucene 查询值中特殊字符处理函数 */
export function escape(str) {
  if (str === null || str === undefined) {
    return ''
  }
  if (str === '') {
    return '//'
  }
  return [].map.call(str, function escapeSpecialCharacter(char) {
    if (char === '+' ||
      char === '-' ||
      char === '&' ||
      char === '|' ||
      char === '!' ||
      char === '(' ||
      char === ')' ||
      char === '{' ||
      char === '}' ||
      char === '[' ||
      char === ']' ||
      char === '^' ||
      char === '"' ||
      char === '~' ||
      char === '*' ||
      char === '?' ||
      char === ':' ||
      char === '\\' ||
      char === '/' ||
      char === ' '
    ) return '\\' + char
    else return char
  }).join('')
}

/** 转换json对象异常处理 */
export function tryJsonParse(data, defaultVal = data) {
  if (_.isObject(data)) {
    return data
  }
  try {
    return JSON.parse(data)
  } catch (e) {
    return defaultVal
  }
}

/**
 * 导出文件，参考了：http://stackoverflow.com/a/24922761/1745885
 * @param filename
 * @param rows
 */
export function exportFile(filename, textContent, type = 'text/csv;charset=utf-8;') {
  if (!_.startsWith(textContent, '\uFEFF')) {
    textContent = '\uFEFF' + textContent
  }
  let blob = new Blob([textContent], { type: type })
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename)
  } else {
    let link = document.createElement('a')
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      let url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

/**
 * 无副作用的 remove
 * @example
 * let a = ['a', 'b', 'c']
 * remove(a, 1) -> ['a', 'c']
 * a 保持不变
 * @param array
 * @param index
 */
export function remove(array, index) {
  return array.filter((x, i) => i !== index)
}

/**
 * 无副作用的 insert
 * @example
 * let a = ['a', 'b', 'c']
 * insert(a, 1, 'z') -> ['a', 'z', 'b', 'c']
 * a 保持不变
 * @param array
 * @param index
 * @param element
 */
export function insert(array, index, element) {
  return _.take(array, index).concat([element]).concat(_.drop(array, index))
}

/**
 * 无副作用的 move
 * @example
 * let arr = ['a', 'b', 'c']
 * move(arr, 1, 2) -> ['a', 'c', 'b']
 * arr 保持不变
 * @param arr
 * @param from
 * @param to
 * @returns {*}
 */
export function move(arr, from, to) {
  let elFrom = arr[from]
  if (from < to) {
    let removed = arr.filter((e, i) => i !== from)
    return insert(removed, to, elFrom)
  } else if (to < from) {
    let removed = arr.filter((e, i) => i !== from)
    return insert(removed, to, elFrom)
  } else {
    return arr
  }
}

/**
 * 用法和 isEqual 一样。不过对于函数值，会对比函数的 toString 结果
 * @type {*}
 */
export const isEqualWithFunc = _.partialRight(_.isEqualWith, (val1, val2) => {
  if (_.isFunction(val1) && _.isFunction(val2)) {
    return val1.toString() === val2.toString()
  }
})

export const isEqualWithReactObj = _.partialRight(_.isEqualWith, (val1, val2) => {
  if (_.isObject(val1) && _.isObject(val2) && '_owner' in val1 && '_owner' in val2) {
    return isEqualWithReactObj(_.omit(val1, '_owner'), _.omit(val2, '_owner'))
  }
  if (_.isFunction(val1) && _.isFunction(val2)) {
    return val1.toString() === val2.toString()
  }
})

/**
 * 用法类似 _.take，不过能改重复读取元素
 * @example
 * let arr = [42, 9527]
 * takeRepeat(arr, 5) -> [42, 9527, 42, 9527, 42]
 * @param arr
 * @param count
 * @returns {*}
 */
export function takeRepeat(arr, count) {
  if (_.isEmpty(arr)) {
    return arr
  }
  return count <= arr.length
    ? _.take(arr, count)
    : arr.concat(takeRepeat(arr, count - arr.length))
}

/**
 * 删除es6字符串模板换行空白字符
 * @dedent
 * @param {any} strings
 * @param {any} values
 * @returns
 */
export function dedent(strings, ...values) {
  let raw
  if (typeof strings === 'string') {
    // dedent can be used as a plain function
    raw = [strings]
  } else {
    raw = strings.raw
  }

  // first, perform interpolation
  let result = ''
  for (let i = 0; i < raw.length; i++) {
    result += raw[i].
      // join lines when there is a suppressed newline
      replace(/\\\n[ \t]*/g, '').

      // handle escaped backticks
      replace(/\\`/g, '`')

    if (i < values.length) {
      result += values[i]
    }
  }

  // dedent eats leading and trailing whitespace too
  result = result.trim()

  // now strip indentation
  const lines = result.split('\n')
  let mindent = null
  lines.forEach(l => {
    let m = l.match(/^ +/)
    if (m) {
      let indent = m[0].length
      if (!mindent) {
        // this is the first indented line
        mindent = indent
      } else {
        mindent = Math.min(mindent, indent)
      }
    }
  })

  if (mindent !== null) {
    result = lines.map(l => l[0] === ' ' ? l.slice(mindent) : l).join('\n')
  }

  // handle escaped newlines at the end to ensure they don't get stripped too
  return result.replace(/\\n/g, '\n')
}

/**
 * 用法类似 _.reduce，不过会返回每次 reduce 的结果
 * @example
 * _.reduce([1, 2, 3, 4], (sum, curr) => sum + curr, 0) -> 10
 * reductions([1, 2, 3, 4], (sum, curr) => sum + curr, 0) -> [0, 1, 3, 6, 10]
 * @param coll
 * @param reducer
 * @param init
 * @returns {*}
 */
export function reductions(coll, reducer, init) {
  if (!coll.length) {
    return [init]
  }
  if (init === undefined) {
    return reductions(_.drop(coll, 1), reducer, _.first(coll))
  }
  return [init].concat(reductions(_.drop(coll, 1), reducer, reducer(init, _.first(coll))))
}

/**
 * 类似 _.keyBy。不过能够多传一个参数，以便修改 key 对应的 val
 * @param arr
 * @param keySelector
 * @param valSelector
 */
export function dictBy(arr, keySelector, valSelector = _.identity) {
  return (arr || []).reduce((prev, curr) => {
    prev[keySelector(curr)] = valSelector(curr)
    return prev
  }, {})
}

/**
 * 类似 _.groupBy。不过能够多传一个参数，以便修改 groupBy 后的数组
 * @param arr
 * @param keySelector
 * @param valSelector
 * @returns {Object|*}
 */
export function groupBy(arr, keySelector, valSelector = _.identity) {
  return _.mapValues(_.groupBy(arr, keySelector), valSelector)
}

/**
 * 类似 _.update。不过没有副作用
 * @param objOrArr
 * @param path
 * @param updater 传入的这个函数不能直接修改原对象，应该返回一个新的对象
 * @returns {*}
 */
export function immutateUpdate(objOrArr, path, updater) {
  if (_.isArray(path) && !path.length) {
    return updater(objOrArr)
  }
  if (_.isString(path) || _.isNumber(path)) {
    let pathArr = _.toPath(path)
    return immutateUpdate(objOrArr, pathArr, updater)
  }
  let [headKey, ...restKeys] = path
  let prevVal = objOrArr && objOrArr[headKey]
  let newVal = immutateUpdate(prevVal, restKeys, updater)

  // 如果值没有变，则直接返回
  if (prevVal === newVal) {
    return objOrArr
  }

  if (_.isArray(objOrArr) || (!objOrArr && isFinite(headKey) && _.isInteger(+headKey) && 0 <= headKey)) {
    let newArr = _.clone(objOrArr || [])
    newArr[headKey] = newVal
    return newArr
  }

  //  {...objOrArr, [headKey]: newVal} can not clone type
  let newObj = _.clone(objOrArr) || {}
  newObj[headKey] = newVal
  return newObj
}

/**
 * 对一个对象进行批量修改，返回一个新对象
 * @example immutateUpdates(obj, 'a.b', () => 1, 'c.d', v => v + 1)
 * @param objOrArr
 * @param pathAndUpdaters
 */
export function immutateUpdates(objOrArr, ...pathAndUpdaters) {
  if (_.isEmpty(pathAndUpdaters)) {
    return objOrArr
  }
  let [path, updater, ...rest] = pathAndUpdaters
  return immutateUpdates(immutateUpdate(objOrArr, path, updater), ...rest)
}

/**
 * 提取出路径中的文件名
 * @example
 * extractFileNameFromPath('/f/abcd.jpg') -> "abcd.jpg"
 * @param path
 */
export function extractFileNameFromPath(path) {
  let index = path.lastIndexOf('/')
  return path.substr(index + 1)
}

/**
 * 转义正则字符，以便将搜索条件插入正则
 * 参考于：https://stackoverflow.com/questions/2593637/how-to-escape-regular-expression-in-javascript
 * @example
 * escapeForRegex('a[0]') -> "a\[0\]"
 * @param str
 */
export function escapeForRegex(str) {
  return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}

/**
 * 在数组中插入元素
 * @example
 * interpose('a', [1, 2, 3]) => [1, "a", 2, "a", 3]
 * @param sep
 * @param arr
 */
export function interpose(sep, arr) {
  let zipped = _.zip(arr, arr.map(_.isFunction(sep) ? sep : () => sep))
  let butlast = _.flatten(zipped)
  return _.take(butlast, butlast.length - 1)
}

/**
 * 猜测数据类型，例如 ['1', '2', '3'] => Integer
 * @param valSamples 字符串数组
 * @param typeOfAllNullVal 全是 null 的话返回什么类型
 * @returns {*} 猜测出的类型，分别是 Long, Integer, Float, DateTime, Char
 */
export function guessStrArrayType(valSamples, typeOfAllNullVal = undefined) {
  let notNullVals = valSamples.filter(_.identity)
  if (notNullVals.length === 0) {
    return typeOfAllNullVal
  }
  let toNums = notNullVals.map(val => +val)
  if (_.every(toNums, isFinite)) {
    if (_.every(toNums, num => Number.isInteger(num))) {
      return _.some(toNums, n => 2e10 < n) ? 'Long' : 'Integer'
    } else {
      return 'Float'
    }
  }

  if (_.every(notNullVals, str => moment(str).isValid())) {
    return 'DateTime'
  }

  return 'Char'
}

/**
 * 前度数据库维度类型转换为druid维度类型
 * @export 0 => `long`, 1 => `float`, 3 => `string` ...
 * @param {*} type 前端数据库维度类型：0=Long; 1=Float; 2=String; 3=DateString; 4=Date; 5=Int;
 */
export function convertTypeToDruid(type) {
  const invertType = _.invert(DruidColumnType)
  return DRUID_DIMENSION_MAP[invertType[type].toLowerCase()]
}

/**
 * 前度数据库维度类型转换为druid数据接入维度类型
 * @export 0 => `l`, 1 => `f`, 3 => `s`...
 * @param {any} type 前端数据库维度类型：0=Long; 1=Float; 2=String; 3=DateString; 4=Date; 5=Int;
 */
export function convertTypeToDruidMini(type) {
  return DIMENSION_TYPES_MINI_MAP[convertTypeToDruid(type)]
}

/**
 * 等待一段时间，例子 await delayPromised(1000)
 * @param wait 等待的毫秒数
 */
export function delayPromised(wait) {
  return new Promise((resolve) => _.delay(resolve, wait))
}

export function promiseWithTimeout(promise, timeoutInMs, defaultVal) {
  return Promise.race([promise, delayPromised(timeoutInMs).then(() => defaultVal)])
}

/**
 * 结合了 map 和 Promise.all 的便捷 map
 * @param arr
 * @param mapper
 */
export function mapAwaitAll(arr, mapper) {
  return Promise.all(arr.map(mapper))
}

/**
 * 结合了 for 和 await 的工具函数
 * @param arr
 * @param mapper
 */
export async function forAwaitAll(arr, mapper) {
  let res = []
  let i = 0
  for (let v of arr) {
    let r = await mapper(v, i++, arr)
    res.push(r)
  }
  return res
}

/**
 * 对比根据路径取得的目标值，不同返回 true
 * @param a
 * @param b
 * @param path
 * @returns {boolean}
 */
export function isDiffByPath(a, b, path, isEqual = _.isEqual) {
  return !isEqual(_.get(a, path), _.get(b, path))
}

/**
 * 对比多个路径所取得的目标值，有一个不同则返回 true
 * @param a
 * @param b
 * @param paths
 */
export function isDiffBySomePath(a, b, ...paths) {
  if (paths.length === 1 && _.isArray(paths[0])) {
    paths = paths[0]
  }
  return _.some(paths, path => isDiffByPath(a, b, path))
}

/**
 * 对比多个路径所取得的目标值，全都不同则返回 true
 * @param a
 * @param b
 * @param paths
 */
export function isDiffByEveryPath(a, b, ...paths) {
  if (paths.length === 1 && _.isArray(paths[0])) {
    paths = paths[0]
  }
  return _.every(paths, path => isDiffByPath(a, b, path))
}

export function eventFire(el, etype) {
  if (el.fireEvent) {
    el.fireEvent('on' + etype)
  } else {
    let evObj = document.createEvent('Events')
    evObj.initEvent(etype, true, false)
    el.dispatchEvent(evObj)
  }
}

/**
 * 字符串匹配 + 转换工具
 * @param str
 * @param matchDict 转换映射，支持尝试匹配函数或正则，例子： {'(Null)': _.isNil, '空字符串': /^$/, '$1': /(\d+)/}
 */
export function stringMapper(str, matchDict) {
  let key = _.findKey(matchDict, fnOrRegex => _.isFunction(fnOrRegex) ? fnOrRegex(str) : fnOrRegex.test(str))
  if (!key) {
    return str
  }
  return _.isFunction(matchDict[key]) ? key : str.replace(matchDict[key], key)
}

function checker(v) {
  if (_.isObject(v)) {
    return !_.isEmpty(v)
  }
  if (_.isString(v)) {
    return v !== ''
  }
  return v !== null && v !== undefined
}

export function removeAllEmptyValues(obj) {
  if (_.isArray(obj)) {
    return obj.map(removeAllEmptyValues).filter(checker)
  }
  if (_.isObject(obj)) {
    return _(obj).mapValues(v => removeAllEmptyValues(v)).pickBy(checker).value()
  }
  return obj
}

/**
 * 递归查找，返回第一层的匹配对象
 * @param arr  数组
 * @param getChild 如何取得 children 数组
 * @param predicate 判断函数
 * @returns {*}
 */
export const recurFind = (arr, getChild, predicate) => {
  return _.find(arr, ch => predicate(ch) || recurFind(getChild(ch), getChild, predicate))
}

/**
 * 递归查找，返回目标对象
 * @param arr  数组
 * @param getChild 如何取得 children 数组
 * @param predicate 判断函数
 * @returns {*}
 */
export const recurFindDeep = (arr, getChild, predicate) => {
  let thisLayerCh = _.find(arr, ch => predicate(ch) || recurFindDeep(getChild(ch), getChild, predicate))
  return thisLayerCh && (predicate(thisLayerCh) ? thisLayerCh : recurFindDeep(getChild(thisLayerCh), getChild, predicate))
}

/**
 * 递归转换树
 * @param arr
 * @param getChildKey
 * @param mapper
 * @returns {*}
 */
export function recurMap(arr, getChildKey, mapper, parentInfos = []) {
  return arr.map(o => {
    const next = mapper(o, parentInfos)
    let childKey = getChildKey(next)
    return childKey
      ? {
        ...next,
        [childKey]: recurMap(next[childKey], getChildKey, mapper, [...parentInfos, next])
      }
      : next
  })
}

export function recurFlatten(tree, childKey = 'children') {
  if (_.isEmpty(tree)) {
    return []
  }
  return _.flatMap(tree, n => n && [n, ...recurFlatten(n[childKey])] || [])
}

export const isClass = (clazz) => {
  return typeof clazz === 'function' && /^class\s|^function\s+[A-Z]/.test(clazz.toString())
}

// https://stackoverflow.com/a/13419367/1745885
export function parseQuery(queryString = window.location.search.substring(1)) {
  let query = {}
  let pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&')
  for (let i = 0; i < pairs.length; i++) {
    let pair = pairs[i].split('=')
    query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '')
  }
  return query
}

/**
 * 用于将数组转换成数状结构的方法
 * @param data 数组
 * @param groupByFns 归类函数（多个）
 * @param keyValMappers 转换函数（多个）
 * @returns {Array|*[]}
 */
export function groupToArrayDeep(data, groupByFns, keyValMappers) {
  let [groupByFn, ...rest] = groupByFns
  let [mapper, ...rest1] = keyValMappers
  if (!groupByFn) {
    return mapper ? _.map(data, mapper) : data
  }
  let dict = groupBy(data, groupByFn, arr => groupToArrayDeep(arr, rest, rest1))
  // 使用 flatMap 是为了支持没有分组的情况，即 key 是 null 或空字符串时，允许下一层的内容往上排
  return _.flatMap(_.keys(dict), k => mapper(dict[k], k))
}

/**
 * 计算字符串 hash code
 * @param str
 * @returns {*}
 */
export function hashCode(str) {
  return str.split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0)
}
