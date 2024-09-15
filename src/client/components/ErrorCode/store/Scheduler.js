/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2018/01/10
 * @description 多任务调度器，避免多个任务并发时撑爆内存
 */

/**
 * @typedef {object} SchedulerStruct
 * @property {number} id
 * @property {*} data
 * @property {number} used
 */

/**
 * @export
 * @class Scheduler
 */
export class Scheduler {

  /**
   * @param {Number} max - 并发最大任务数
   */
  constructor(max) {
    this._max = max || 5
    /** @type {Map<SchedulerStruct>} */
    this._cache = new Map()
    /** @type {Map<SchedulerStruct>} */
    this._doing = new Map()
    this._subscribe = null
    this._id = 0
  }

  /**
   * 注册函数
   * @param {function} subscribe 
   * @returns {Scheduler}
   */
  subscribe(subscribe) {
    this._subscribe = subscribe
    return this
  }

  /**
   * 存入数据，如果已缓存的数据数量超过了设置的最大值，则不再写入
   * 写入成功，返回true，否则返回false
   * @param {*} data
   * @param {boolean} [force=fase] 是否强制写入
   * @returns {boolean}
   */
  entry(data, force = false) {
    if (!force && this._cache.size === this._max) {
      return false
    }
    const id = this._id++
    this._cache.set(id, { id, data, used: 0 })
    this.dispose()
    return true
  }

  /**
   * 调用注册函数，调用成功，返回true，否则返回false
   * @returns {boolean}
   */
  dispose() {
    if (this._doing.size >= this._max) {
      return false
    }
    const iterator = this._cache.keys()
    let next = void 0
    while (!(next = iterator.next()).done) {
      const key = next.value
      if (key !== void 0 && this._subscribe !== null && this._doing.get(key) === void 0) {
        const record = this._cache.get(key)
        record.used = record.used + 1
        this._doing.set(record.id, record)
        this._subscribe(record)
        return true
      }
    }
    return false
  }

  /**
   * 释放记录
   * @param {SchedulerStruct} record 
   * @returns {boolean}
   */
  release(record) {
    // 未使用
    if (record.used === 0) {
      return false
    }
    this._cache.delete(record.id)
    this._doing.delete(record.id)
    this.dispose()
    return true
  }

  /**
   * 是否可以继续写入
   * @returns {boolean}
   */
  overflowed() {
    return this._cache.size >= this._max
  }

  /**
   * 任务是否排满
   * @returns {boolean}
   */
  tight() {
    return this._doing.size >= this._max
  }

  /**
   * 任务是否全部完成
   * @returns {boolean}
   */
  drain() {
    return this._doing.size === 0
  }
}
