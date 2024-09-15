/**
 * Created on 25/03/2017.
 * @file 用户分群相关的接口，主要是redis的操作
 * ioredis 配置参数文档
 * https://github.com/luin/ioredis/blob/master/API.md#Redis
 */

import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import { parseRedisHost, Redis } from '../utils/RedisServer'

class DataConfig {
  constructor (hostAndPorts, storeKey, clusterMode = false, type = 'redis') {
    this.hostAndPorts = hostAndPorts
    this.storeKey = '' + storeKey
    this.clusterMode = clusterMode
    this.type = type
  }

  /** @return {Host|Array<Host>} */
  getRedisHost () {
    if (this.clusterMode) {
      let delimiter = ';'
      let hostStr = this.hostAndPorts
      if (hostStr.indexOf(',') > -1) {
        hostStr = hostStr.replace(';', ',')
        delimiter = ','
      }
      return hostStr.split(delimiter).map(parseRedisHost)
    } else {
      return parseRedisHost(this.hostAndPorts)
    }
  }

  getStoreKey () {
    return this.storeKey
  }

  getClusterMode () {
    return this.clusterMode
  }

  getType () {
    return this.type
  }
}

class PageConfig {
  constructor (pageIndex = 1, pageSize = 5) {
    this.pageIndex = pageIndex
    this.pageSize = pageSize
  }

  getStartPos () {
    return this.pageIndex * this.pageSize
  }

  getEndPos () {
    return (this.pageIndex + 1) * this.pageSize
  }

  getPageSize () {
    return this.pageSize
  }
}

class ReadConfig extends DataConfig {
  constructor (dataConfig, readConfig) {
    const { hostAndPorts, groupId, clusterMode, type } = dataConfig
    const { pageIndex, pageSize } = readConfig
    super(hostAndPorts, groupId, clusterMode, type)
    this.readConfig = new PageConfig(pageIndex, pageSize)
  }

  getStartPos () {
    return this.readConfig.getStartPos()
  }

  getEndPos () {
    return this.readConfig.getEndPos()
  }

  getPageSize () {
    return this.readConfig.getPageSize()
  }
}

/**
 * @typedef {object} DataConfig
 * @property {string} hostAndPorts - Example:`192.168.0.1:6379;192.168.0.2:6379`
 * @property {string} groupId
 * @property {boolean} clusterMode
 * @property {string} [type]
 */

/* ------------------------- Params Checker ------------------------- */
const dataConfigChecker = defineTypes({
  hostAndPorts: PropTypes.string.isRequired,
  groupId: PropTypes.string.isRequired,
  clusterMode: PropTypes.bool.isRequired,
  type: PropTypes.string
})
/* ------------------------- Checker End ------------------------- */

/**
 * 提供用户分群相关的redis接口，包含写入、删除、读取三个操作行为
 * @class
 */
class UserGroupRedisService {
  /**
   * 创建一个usergroup
   * @param {Array<string>} value
   * @param {DataConfig} conf
   * @return {Promise.<ResponseStruct>}
   * @static
   */
  static async create (value, conf) {
    const resp = new Response()
    const check_conf = dataConfigChecker(conf)
    
    if (!check_conf.success) {
      throw new Error(check_conf.message)
    }

    const { hostAndPorts, clusterMode, type, groupId } = conf

    const dateConf = new DataConfig(hostAndPorts, groupId, clusterMode, type)
    const redis = new Redis(dateConf.getRedisHost(), dateConf.getClusterMode(), conf)

    if (!redis) {
      throw new Error('redis配置参数错误，请仔细核对')
    }

    const toBuffer = value.reduce((p, c) => {
      let buf = Buffer.from(c + '\t')
      return Buffer.concat([p, buf], p.length + buf.length)
    }, Buffer.alloc(0))

    // 兼容原来代码，在最前面存上count的值
    const prefix = `${value.length}\t`
    const toStore = Buffer.concat([Buffer.from(prefix), toBuffer], prefix.length + toBuffer.length)

    try {
      await redis.writeBytes(dateConf.getStoreKey(), toStore)
      // java: return Response.ok("execute successfully").build()
      // node: ResponseStruct
      resp.result = 'execute successfully'
    } catch (e) {
      console.log(e.stack)
      throw new Error(e.message)
    } finally {
      await redis.disconnect()
    }

    return resp.serialize()
  }

  /**
   * 读取已存的usergroup
   * @param {{dataConfig: DataConfig,groupReadConfig: {pageIndex: number,pageSize: number}}} config
   * @return {Promise.<ResponseStruct>}
   * @static
   */
  static async read (config) {
    const resp = new Response()
    const { groupReadConfig, dataConfig } = config
    const check_conf = dataConfigChecker(dataConfig)
    if (!check_conf.success) {
      throw new Error(check_conf.message)
    }

    const conf = new ReadConfig(dataConfig, groupReadConfig)
    const redis = new Redis(conf.getRedisHost(), conf.getClusterMode(), dataConfig)

    try {
      const buf = await redis.readBytes(conf.getStoreKey())
      const cache = []
      const total = buf.length
      const separator = 9   // '\t'

      let point = 0, index

      while (point < total) {
        index = buf.indexOf(separator, point)
        cache.push(buf.slice(point, index))
        point = index + 1
      }

      // 兼容旧代码，第一行为count
      const lines = cache.slice(1)
      const start = conf.getStartPos()
      const end = conf.getEndPos()
      const ids = lines.slice(start, end)

      resp.result = {
        ids: ids.map(buf => buf.toString('utf8')),
        count: ids.length,
        totalCount: lines.length
      }
    } catch (e) {
      console.log(e.stack)
      throw new Error(e.message)
    } finally {
      await redis.disconnect()
    }

    return resp.serialize()
  }

  /**
   * 删除记录
   * @param {DataConfig} config
   * @return {Promise.<ResponseStruct>}
   * @static
   */
  static async del (config) {
    const resp = new Response()
    const check = dataConfigChecker(config)

    if (!check.success) {
      throw new Error(check.message)
    }

    const { hostAndPorts, clusterMode, type, groupId } = config
    const conf = new DataConfig(hostAndPorts, groupId, clusterMode, type)

    const redis = new Redis(conf.getRedisHost(), conf.getClusterMode(), config)

    try {
      await redis.del(conf.getStoreKey())
      resp.result = config
    } catch (e) {
      console.log(e.stack)
      throw new Error(e.message)
    } finally {
      await redis.disconnect()
    }

    return resp.serialize()
  }
}

export default UserGroupRedisService







