/**
 * Created on 27/03/2017.
 * @file 提供redis的基本服务
 */

import RedisService from 'ioredis'
import _ from 'lodash'
import config from '../config'
import { getSM4Result } from '../utils/db-utils'

/**
 * @typedef {object} Host
 * @property {string} host
 * @property {number} port
 */

/**
 * @param host
 * @return {null|Host}
 */
export function parseRedisHost(host) {
  host = '' + host
  const arr = host.split(':')
  if (arr.length === 0) return null
  return { host: arr[0], port: parseInt(arr[1]) || 6379 }
}

export const getHosts = hostStr => {
  let delimiter = ';',
    res = []
  if (hostStr.indexOf(',') > -1) {
    hostStr = hostStr.replace(';', ',')
    delimiter = ','
  }
  const hostArr = hostStr.split(delimiter)
  res = hostArr
    .map(str => {
      const [host, port] = str.split(':')
      return { host, port: _.toNumber(port) }
    })
    .filter(o => o.host && o.port)
  return res
}

/* ------------------------- Options ------------------------- */

// const retryStrategy = times => Math.min(times * 50, 2000)
// const reconnectOnError = err => err.message.indexOf('READONLY') === 0

// const RedisClientOptions = {
//   parser: 'javascript',
//   dropBufferSupport: false,
//   enableReadyCheck: true,
//   enableOfflineQueue: true,
//   connectTimeout: 10000,
//   autoResubscribe: true,
//   autoResendUnfulfilledCommands: true,
//   lazyConnect: true,
//   keyPrefix: '',
//   stringNumbers: false,
//   readOnly: false
// }

const DefaultRedisOptions = {
  // port: 6379,
  // host: 'localhost',
  // family: 4,
  // path: null,
  // keepAlive: 0,
  // noDelay: true,
  // connectionName: null,
  // db: 0,
  // password: null,
  // retryStrategy: retryStrategy,
  // reconnectOnError: reconnectOnError,
  // ...RedisClientOptions,
  ...config.redis // 默认使用config.default配置
}

// const DefaultRedisClusterOptions = {
//   clusterRetryStrategy: reconnectOnError,
//   enableOfflineQueue: true,
//   enableReadyCheck: true,
//   scaleReads: 'master',
//   maxRedirections: 16,
//   retryDelayOnFailover: 1000,
//   retryDelayOnClusterDown: 1000,
//   retryDelayOnTryAgain: 1000,
//   redisOptions: { ...RedisClientOptions }
// }

/* ------------------------- Options End ------------------------- */

const STATUS = {
  error: 'error',
  close: 'close',
  ready: 'ready',
  end: 'end',
  uninit: 'uninit'
}

/**
 * Redis 基本服务类
 * @class
 */
class Redis {
  /**
   *
   * @param {Host} host
   * @param {boolean} clusterMode
   * @param {object} [options={}]
   * @constructor
   */
  constructor(host, clusterMode, options = {}) {
    const size = 1 << 20

    this.options = options
    this.host = host
    this.clusterMode = clusterMode
    this._redis = null
    this._BATCH_SIZE = size
  }

  get _status() {
    return this._redis && this._redis.status
  }

  /**
   * @description 创建Redis实例
   * @returns
   * @memberOf Redis
   */
  createServer() {
    const {
      redis: { password }
    } = config
    const pwd = getSM4Result(password) // 默认配置密码

    let redis = null
    if (this.clusterMode) {
      // 集群模式
      this.host = getHosts(this.host)
      redis = new RedisService.Cluster(this.host, { ..._.omit(this.options, 'host'), showFriendlyErrorStack: true, password: pwd })
    } else if (this.options.sentinels) {
      // 哨兵模式
      let { sentinels } = this.options
      sentinels = getHosts(sentinels)
      redis = new RedisService({ ...DefaultRedisOptions, ...this.options, sentinels, password: pwd })
    } else {
      // 普通模式
      redis = new RedisService({ ...DefaultRedisOptions, ...this.host, ...this.options, password: pwd })
    }
    return redis
  }

  /**
   * 获取服务，如果配置不正确或链接错误，将会返回null
   * @return {Promise.<null|RedisService>}
   */
  getService() {
    const status = this._status
    if (this._redis === null || status === STATUS.close || status === STATUS.end || status === STATUS.uninit) {
      this._redis = this.createServer()
    }
    return this._redis
  }

  /**
   * 断开redis连接。
   * 该方法将会立即断开redis服务，这可能丢失一些正在运行或等待运行的任务。
   * 如果你想安全的关闭redis服务，请使用`Redis#quit`代替该方法。
   * @return {Redis}
   */
  async disconnect() {
    return new Promise((resolve, reject) => {
      const redis = this._redis
      const status = this._status

      if (redis === null || status === STATUS.close || status === STATUS.end) {
        return resolve(this)
      }

      redis.once('close', () => resolve(this))
      redis.once('error', e => reject(e))
      redis.disconnect()
    })
  }

  /**
   * 退出redis服务并断开连接。
   * @return {Redis}
   */
  quit() {
    if (this._redis) {
      try {
        this._redis.quit()
      } catch (e) {
        console.error(e.message)
        console.error(e.stack)
      }
    }
    return this
  }

  /**
   * 写入一组值到redis
   * @param {string} key
   * @param {*} value
   * @return {Promise.<Redis>}
   */
  async set(key, value) {
    const redis = await this.getService()
    await redis.set(key, value)
    return this
  }

  /**
   * 获取redis存储在key上的值
   * @param {string} key
   * @return {Promise<*>}
   */
  async get(key) {
    const redis = await this.getService()
    return await redis.get(key)
  }

  /**
   * 写入一组值，并设置过期时间
   * @param {string} key
   * @param {*} value
   * @param {number} expire
   * @return {Promise.<Redis>}
   */
  async setWithExpire(key, value, expire) {
    const redis = await this.getService()
    await redis.setex(key, expire, value)
    return this
  }

  /**
   * 设置key的过期时间
   * @param key
   * @param expire
   * @return {Promise.<Redis>}
   */
  async expire(key, expire) {
    const redis = await this.getService()
    await redis.expire(key, expire)
    return this
  }

  /**
   * 删除key记录
   * @param key
   * @return {Promise.<Redis>}
   */
  async del(key) {
    const redis = await this.getService()
    await redis.del(key)
    return this
  }

  /**
   * 获取存储的buffer
   * @param {string} key
   * @return {Promise.<Buffer>}
   */
  async getBuffer(key) {
    const redis = await this.getService()
    return new Promise((resolve, reject) => {
      return redis.getBuffer(key, (err, buf) => {
        err ? reject(err) : resolve(buf)
      })
    })
  }

  /**
   * 写入buffer数据到redis的特殊处理函数，如果传入的buf过大，
   * 将会分批写入到redis。
   * 如果buffer较小，则直接使用`redis.set`即可
   * @param {string} key
   * @param {Buffer} buf
   * @return {Promise.<Redis>}
   */
  async writeBytes(key, buf) {
    buf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8')

    const total = buf.length
    const BATCH_SIZE = this._BATCH_SIZE
    const redis = await this.getService()

    await this.del(key)

    let start = 0,
      target,
      next,
      size

    while (start < total) {
      next = start + BATCH_SIZE

      if (next > total) {
        next = total
      }

      size = next - start
      target = Buffer.alloc(size)

      buf.copy(target, 0, start, next)

      start = next
      await redis.rpushBuffer(key, target)
    }

    return this
  }

  /**
   * 读取存储的大buffer数据，最大读取内容为`20 * (1<<20)`
   * 如果buffer较小，则直接使用`redis.get`即可
   * @param {string} key
   * @return {Promise.<Buffer>}
   */
  async readBytes(key) {
    const redis = await this.getService()
    const length = await redis.llenBuffer(key)

    if (length === 0) {
      return Buffer.alloc(0)
    }

    const arr = []

    let start = 0
    let total = 0
    let slice

    while (start < length) {
      slice = await redis.lindexBuffer(key, start)
      total += slice.length
      arr[start++] = slice
    }

    return Buffer.concat(arr, total)
  }
}

export { Redis }
