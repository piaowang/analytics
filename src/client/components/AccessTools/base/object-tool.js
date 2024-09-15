/**
 * Created by asd on 17-7-18.
 */

import _ from 'lodash'

/**
 * <p>对象操作工具类，包含`get`,`set`方法。</p>
 * <p>比如有一个对象结构如下：</p>
 * @example
 * ```js
 * const o = {
 *   a: {
 *     b: {
 *       c: {k1: 1, k2: 2}
 *     }
 *   }
 * }
 * const ot = new Ot(o)
 * ot.set('a.b.c.k1', 3) // return ot
 * ot.get('a.b.c.k1')    // return 3
 * ot.valueOf() // return o
 * ```
 * @class
 */
class Ot {
  /**
   * @param {Object} object
   */
  constructor (object) {
    this.object = _.cloneDeep(object)
  }

  /**
   * 查找父级对象
   * @param {string} path
   * @return {*}
   */
  getParent (path) {
    let key, start = 0, end = path.length - 1, tmp = this.object
    while (start < end) {
      key = path[start]
      if (!_.isObject(tmp[key])) break
      tmp = tmp[key]
      start++
    }
    return tmp
  }

  /**
   * 获取path所指向的值
   * @param {string} path
   * @return {*}
   */
  get (path) {
    const arr = Ot.parsePath(path)
    const parent = this.getParent(arr)
    return _.isObject(parent) ? parent[_.last(arr)] : void 0
  }

  /**
   * 设置path值
   * @param {string} path
   * @param {*} value
   * @return {Ot}
   */
  set (path, value) {
    path = _.isArray(path) ? path : Ot.parsePath(path)
    let len = path.length - 1, start = 0, tmp = this.object, key

    while (start < len) {
      key = path[start]
      if (!_.isObject(tmp[key])) tmp[key] = {}
      tmp = tmp[key]
      start++
    }

    tmp[_.last(path)] = value
    return this
  }

  replace (object) {
    this.object = object
    return this
  }

  /**
   * 返回结果
   * @return {Object}
   */
  valueOf () {
    return this.object
  }

  static PATH_SEPARATOR = '@_@'

  /**
   * 解析路径，路径以`.`分隔
   * @param {string} path - 'a.b.c'
   * @static
   */
  static parsePath (path) {
    return path.split(Ot.PATH_SEPARATOR)
  }

  static createPath (arr) {
    return arr.join(Ot.PATH_SEPARATOR)
  }
}

export default Ot
