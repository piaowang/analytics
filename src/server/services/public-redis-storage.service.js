/**
 * @Author sugo.io<asd>
 * @Date 17-11-23
 * @desc redis共享存储方法
 * 每个Storage以单例形式对外提供使用,以节省创建开销
 */

import * as Redis  from '../utils/redis'
import DataSource from './sugo-datasource.service'
import Desktop from './desktop.service'
import { Response } from '../utils/Response'
import { get } from '../utils/logger'
import AppConfig from '../config'
import sugoGlobalConfigService from '../services/sugo-global-config.service'
import sugoProject from '../services/sugo-project.service'
import moment from 'moment'
import _ from 'lodash'
import DataAnalysisService from './sugo-data-analysis.service'
import appVersionServers from './sugo-app-version'

const Logger = get('Public.Redis.Storage')
export const SDK_CONFIG_EX = 1 * 60 * 60 * 24 * 365
/**
 * @constructor
 * @abstract
 */
class AbstractStorage {
  /** @param {string} name */
  constructor (name) {
    this.$name = name
  }

  /** @return {string} */
  getName () {
    return this.$name
  }

  /**
   * generator必须是一个无副作用的纯函数
   * 如果传入的参数相同,返回值一定相同
   * 否则会出现存储在redis中的key错乱
   * @abstract
   */
  generator () {
    throw new Error(`${this.$name}.generator not implement.`)
  }

  /** @abstract */
  set () {
    throw new Error(`${this.$name}.set not implement.`)
  }

  /** @abstract */
  setExpire () {
    throw new Error(`${this.$name}.setExpire not implement.`)
  }

  /** @abstract */
  get () {
    throw new Error(`${this.$name}.get not implement.`)
  }

  /** @abstract */
  del () {
    throw new Error(`${this.$name}.del not implement.`)
  }

  /** @return {string} */
  toString () {
    return `Redis Storage [${this.$name}]`
  }
}

/** -------------------
 * dimension
 * ------------------- */
class SDKDimensionStorage extends AbstractStorage {
  static EXPIRE = AppConfig.redisExpire

  constructor () {
    super('SDKDimension')
  }

  /**
   * @override
   * @return {string}
   */
  generator (project_id) {
    return `PUBLIC_REDIS_KEY_DIMENSION_${project_id}`
  }

  /**
   * @param {*} value
   * @param {string} project_id
   * @return {Promise.<void>}
   * @override
   */
  async set (value, project_id) {
    const key = this.generator(project_id)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisSet(key, value)
  }

  /**
   * @param {*} value
   * @param {number} expire
   * @param {string} project_id
   * @return {Promise.<void>}
   */
  async setExpire (value, expire, project_id) {
    const key = this.generator(project_id)
    Logger.info('%s: setExpire [%s]', this.toString(), key)
    await Redis.redisSetExpire(key, expire, value)
  }

  /** 通过dataSourceName 缓存dimen 最大版本号
   * @param {string} project_id
   * @return {Promise.<ResponseStruct<Array<object>>>}
   * @override
   */
  async get (project_id, datasourceName = '') {
    const key = this.generator(project_id)
    const name = this.toString()

    let dimensions = await Redis.redisGet(key)
    if (dimensions !== null) {
      Logger.info('%s: get [%s] use cached', name, key)
      return Response.ok(dimensions)
    }

    Logger.info('%s: get [%s] no cached. do query and cache the result', name, key)
    let maxVersion = moment().unix()

    // // 处理上报地理位置和 采集设置
    // let sdkConfig = await sugoProject.findOne(project_id)
    // sdkConfig = _.get(sdkConfig, 'result.extra_params', {})
    // if (_.isEmpty(sdkConfig) && AppConfig.site.enableSdkDecideGlobalConfig) {
    //   sdkConfig = await sugoGlobalConfigService.getInstance().findAll({ key: { $or: ['sdk_position_config']} })
    //   sdkConfig = _.reduce(sdkConfig, (r, v) => { 
    //     r[v.key] = v.value 
    //     return r
    //   }, {})
    // }
    // const {sdk_position_config} = sdkConfig
    // sdk_ban_report 判断移到appsdk中去处理
    dimensions = await DataSource.getDimensionsForSDK(project_id)

    let result = { dimensions, dimension_version:maxVersion }
    // result.position_config = _.isNaN(_.toNumber(sdk_position_config)) ? 0 : _.toNumber(sdk_position_config)
    const redisDimensionKey = `${GetSDKConifgPrefix(datasourceName)}|${SDK_CONFIG_KEYS.latestDimensionVersion}`
    await Redis.redisSetExpire(key, SDK_CONFIG_EX, result)
    await Redis.redisSetExpire(redisDimensionKey, SDK_CONFIG_EX, maxVersion)

    return Response.ok(result)
  }

  /** s
   * @param {string} project_id
   * @return {Promise.<void>}
   * @override
   */
  async del (project_id, datasourceName) {
    const key = this.generator(project_id) 
    const redisDimensionKey = `${GetSDKConifgPrefix(datasourceName)}|${SDK_CONFIG_KEYS.latestDimensionVersion}`
    Logger.info('%s: del [%s]', this.toString(), key)
    Logger.info('%s: del [%s]', this.toString(), redisDimensionKey)
    await Redis.redisDel(key)
    //删除维度缓存同时删掉维度版本号缓存
    await Redis.redisDel(redisDimensionKey)
  }
}

export const NAME_SPACE = 'Decide'
export const GetDecideEventPrefix = (token, appVersion) => {
  return [NAME_SPACE, token, appVersion].filter(_.identity).join('|')
}
/** -------------------
 * desktop decide
 * ------------------- */
class DesktopDecideStorage extends AbstractStorage {

  static REDIS_EXPIRE = AppConfig.redisExpire

  constructor () {
    super('DesktopDecide')
  }

  /**
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {string}
   * @override
   */
  generator (token, path_names, version) {
    return [
      GetDecideEventPrefix(token, version),	
      path_names.sort().join('$')	
    ].join('|')
  }

  /**
   * @param {*} value
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<void>}
   * @override
   */
  async set (value, token, path_names, version) {
    const key = this.generator(token, path_names, version)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisSet(key, value)
  }

  /**
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<ResponseStruct<object>>}
   * @override
   */
  async get (token, path_names, version) {
    const key = this.generator(token, path_names, version)
    const name = this.toString()

    let decide = await Redis.redisGet(key)

    if (decide !== null) {
      Logger.info('%s: get [%s] use cached', name, key)
      return Response.ok(decide)
    }

    Logger.info('%s: get [%s] no cached. do query and cache the result', name, key)
    const res = await Desktop.decide(token, path_names, version)

    if (!res.success) {
      Logger.error('%s: get. Get error in Desktop(...args) : %s', name, res.message)
      return res
    }

    decide = res.result
    await Redis.redisSetExpire(key, DesktopDecideStorage.REDIS_EXPIRE, decide)

    return Response.ok(decide)
  }

  /**
   * @param {string} token
   * @param {string[]} path_names
   * @param {string} version
   * @return {Promise.<ResponseStruct<object>>}
   * @override
   */
  async del (token, path_names, version) {
    const key = this.generator(token, path_names, version)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisDel(key)
  }

  async delByProjectId(projectId) {
    const tokens = await DataAnalysisService.findAll({ where: { project_id: projectId } })
    for (let i = 0; i < tokens.length; i++) {
      await this.delByToken(tokens[i].id)
    }
  }
  /**
   * 删除所有以token开头的键
   * @param {string} token
   * @return {Promise.<void>}
   */
  async delByToken (token) {
    const redis = await Redis.getRedisClient()
    const pattern = GetDecideEventPrefix(token)
    const keys = await redis.keys(pattern + '*')

    if (keys.length === 0) {
      return
    }
    Logger.info('%s: delByToken delete pattern: %s', this.toString(), pattern)
    Logger.info('%s: delByToken delete keys: %s', this.toString(), JSON.stringify(keys, null, 2))
    await redis.del.apply(redis, keys)
  }

  /**
   * 删除最后事件版本的配置
   * @param {*} projectId 
   * @param {*} token 
   * @param {*} appVersion 
   */
  async deleteLastVersion(projectId, token, appVersion) {
    const redis = await Redis.getRedisClient()
    const versionProfix = GetSDKConifgPrefix(projectId, token, appVersion)
    const eventVersionKey = [versionProfix, SDK_CONFIG_KEYS.latestEventVersion].join('|')
    await redis.del(redis, eventVersionKey)
  }
  /**
   * 删除所有以token开头的键
   * @param {string} token
   * @return {Promise.<void>}
   */
  async delByTokenAndVersion (token, appVersion, datasourceName) {
    const redis = await Redis.getRedisClient()
    const pattern = GetDecideEventPrefix(token, appVersion)
    
    const redisEventKey = `${GetSDKConifgPrefix(datasourceName, token, appVersion)}|${SDK_CONFIG_KEYS.latestEventVersion}`
    const keys = await redis.keys(pattern + '*')

    if (keys.length === 0) {
      return
    }
    Logger.info('%s: delByToken delete pattern: %s', this.toString(), pattern)
    Logger.info('%s: delByToken delete keys: %s', this.toString(), JSON.stringify(keys, null, 2))
    await redis.del.apply(redis, keys)
    //删除事件同时删除事件版本
    await Redis.redisDel(redisEventKey)
  }
}

/* -------------------------------------------------------SDK全局配置-------------------------------------------------------------------- */

export const SDK_CONFIG_NAME_SPACE = 'SDKCONFIG'
export const SDK_CONFIG_KEYS = {
  isSugoInitialize:'isSugoInitialize',
  isHeatMapFunc:'isHeatMapFunc',
  uploadLocation:'uploadLocation',
  forceUpdateConfig: 'forceUpdateConfig',
  latestEventVersion: 'latestEventVersion',
  isAutotrackInit:'isAutotrackInit',
  latestDimensionVersion: 'latestDimensionVersion'
}
export const GetSDKConifgPrefix = (project, token, appVersion) => {
  return [SDK_CONFIG_NAME_SPACE, project, token, appVersion].filter(_.identity).join('|')
}

class SdkGlobalConfig extends AbstractStorage {

  static EXPIRE = AppConfig.redisExpire

  constructor() {
    super('SDKGlobalConfig')
  }


  /**
   * @param {*} value
   * @param {string} token
   * @param {string} app_version
   * @return {Promise.<void>}
   * @override
   */
  async set(value, projectId, token, app_version) {
    const key = GetSDKConifgPrefix(projectId, token, app_version)
    Logger.info('%s: set [%s]', this.toString(), key)
    await Redis.redisSet(key, value)
  }

  /**
   * @param {*} value
   * @param {number} expire
   * @param {string} token
   * @param {string} app_version
   * @return {Promise.<void>}
   */
  async setExpire(value, expire, projectId, token, app_version) {
    const key = GetSDKConifgPrefix(projectId, token, app_version)
    Logger.info('%s: setExpire [%s]', this.toString(), key)
    await Redis.redisSetExpire(key, expire, value)
  }

  /**
   * @param {string} project_id
   * @return {Promise.<ResponseStruct<Array<object>>>}
   * @override
   */
  /**
   * @description 增加一个名为isAllburiedPoint的字段判断是否开启了全埋点,当redis中没有的时候，从数据库查询并放在redis中，有的时候直接丢前端
   * @date: 2020-07-21 09:25:39
  */
  async get(projectId, token, appVersion = '') {
    const redis = await Redis.getRedisClient()
    const profix = GetSDKConifgPrefix(projectId)
    const tokenProfix = GetSDKConifgPrefix(projectId, token)
    const versionProfix = GetSDKConifgPrefix(projectId, token, appVersion)

    const tokenBuriedKey = [tokenProfix, SDK_CONFIG_KEYS.isAutotrackInit].join('|')
    
    const globalInitKey = [SDK_CONFIG_NAME_SPACE, SDK_CONFIG_KEYS.isSugoInitialize].join('|')
    const projectInitKey = [profix, SDK_CONFIG_KEYS.isSugoInitialize].join('|')
    const tokenInitKey = [tokenProfix, SDK_CONFIG_KEYS.isSugoInitialize].join('|')
    const versionInitKey = [versionProfix, SDK_CONFIG_KEYS.isSugoInitialize].join('|')

    const globalPositionConfigKey = [SDK_CONFIG_NAME_SPACE, SDK_CONFIG_KEYS.uploadLocation].join('|')
    const projectPositionConfigKey = [profix, SDK_CONFIG_KEYS.uploadLocation].join('|')

    const globalSubmitPointKey = [SDK_CONFIG_NAME_SPACE, SDK_CONFIG_KEYS.isHeatMapFunc].join('|')
    const projectSubmitPointKey = [profix, SDK_CONFIG_KEYS.isHeatMapFunc].join('|')
    
    const globalUpdateConfigKey = [SDK_CONFIG_NAME_SPACE, SDK_CONFIG_KEYS.forceUpdateConfig].join('|')
    const projectUpdateConfigKey = [profix, SDK_CONFIG_KEYS.forceUpdateConfig].join('|')
    const tokenUpdateConfigKey = [tokenProfix, SDK_CONFIG_KEYS.forceUpdateConfig].join('|')
    const versionUpdateConfigKey = [versionProfix, SDK_CONFIG_KEYS.forceUpdateConfig].join('|')

    const dimensionVersionKey = [profix, SDK_CONFIG_KEYS.latestDimensionVersion].join('|')
    const eventVersionKey = [versionProfix, SDK_CONFIG_KEYS.latestEventVersion].join('|')
    const objs = await redis.mget([
      globalInitKey, // 全局配置
      projectInitKey, // 项目配置
      tokenInitKey,
      versionInitKey, // 版本配置

      tokenBuriedKey,//token配置

      globalPositionConfigKey, // 全局配置
      projectPositionConfigKey, // 项目配置

      globalSubmitPointKey, // 全局配置
      projectSubmitPointKey, // 项目配置

      globalUpdateConfigKey,//强制拉取配置
      projectUpdateConfigKey,//强制拉取配置
      tokenUpdateConfigKey,//强制拉取配置
      versionUpdateConfigKey,//强制拉取配置
      
      dimensionVersionKey,//维度版本 时间戳
      eventVersionKey//事件版本 时间戳
    ])
    let isSugoInitialize = false
    let isHeatMapFunc = false
    let uploadLocation = false
    let isUpdateConfig = false
    let isAutoTrack=false
    let latestEventBindingVersion = -1
    let latestDimensionVersion = -1

    let [
      globalInitValue,
      projectInitValue,
      tokenInitValue,
      versionInitValue,

      tokenBuriedValue,

      globalPositionConfigValue,
      projectPositionConfigValue,

      globalSubmitPointValue,
      projectSubmitPointValue,

      globalUpdateConfigValue,
      projectUpdateConfigValue,
      tokenUpdateConfigValue,
      versionUpdateConfigValue,

      dimensionVersionValue,
      eventVersionValue
    ] = objs
    tokenBuriedValue = tokenBuriedValue === null ? null : tokenBuriedValue === 'true'
    globalInitValue = globalInitValue === null ? null : globalInitValue === 'true'
    projectInitValue = projectInitValue === null ? null : projectInitValue === 'true'
    tokenInitValue = tokenInitValue === null ? null : tokenInitValue === 'true'
    versionInitValue = versionInitValue === null ? null : versionInitValue === 'true'
    globalSubmitPointValue = globalSubmitPointValue === null ? null : globalSubmitPointValue === 'true'
    projectSubmitPointValue = projectSubmitPointValue === null ? null : projectSubmitPointValue === 'true'
    globalPositionConfigValue = globalPositionConfigValue === null ? null : _.toNumber(globalPositionConfigValue)
    projectPositionConfigValue = projectPositionConfigValue === null ? null : _.toNumber(projectPositionConfigValue)
    globalUpdateConfigValue = globalUpdateConfigValue === null ? null : globalUpdateConfigValue === 'true'
    projectUpdateConfigValue = projectUpdateConfigValue === null ? null : projectUpdateConfigValue === 'true'
    tokenUpdateConfigValue = tokenUpdateConfigValue === null ? null : tokenUpdateConfigValue === 'true'
    versionUpdateConfigValue = versionUpdateConfigValue === null ? null : versionUpdateConfigValue === 'true'

    latestEventBindingVersion = eventVersionValue ? _.toNumber(eventVersionValue) : -2
    latestDimensionVersion = dimensionVersionValue ? _.toNumber(dimensionVersionValue) : -2
    try {
  

      // 如果没有全局配置 则统一查询 并设置redis
      if (globalInitValue === null || globalPositionConfigValue == null || globalSubmitPointValue === null || globalUpdateConfigValue === null) {
        let sdkConfig = await sugoGlobalConfigService.getInstance().findAll({ key: { $or: ['sdk_position_config', 'sdk_submit_click_point', 'sdk_init', 'sdk_force_update_config'] } })
        sdkConfig = _.reduce(sdkConfig, (r, v) => {
          r[v.key] = v.value
          return r
        }, {})
        isSugoInitialize = _.get(sdkConfig, 'sdk_init', '1') === '1'
        isHeatMapFunc = _.get(sdkConfig, 'sdk_submit_click_point', '1') === '1'
        uploadLocation = _.get(sdkConfig, 'sdk_position_config', 0)
        isUpdateConfig = _.get(sdkConfig, 'sdk_force_update_config', '1') === '1'

        await Redis.redisSetExpire(globalInitKey, SDK_CONFIG_EX, isSugoInitialize)
        await Redis.redisSetExpire(globalSubmitPointKey, SDK_CONFIG_EX, isHeatMapFunc)
        await Redis.redisSetExpire(globalPositionConfigKey, SDK_CONFIG_EX, uploadLocation)
        await Redis.redisSetExpire(globalUpdateConfigKey, SDK_CONFIG_EX, isUpdateConfig)
      } else {
        isSugoInitialize = globalInitValue
        isHeatMapFunc = globalSubmitPointValue
        uploadLocation = globalPositionConfigValue
        isUpdateConfig = globalUpdateConfigValue
      }

      //如果没有项目配置 则统一查询 并设置redis
      if (isSugoInitialize && (projectInitValue === null || projectPositionConfigValue == null || projectSubmitPointValue === null || projectUpdateConfigValue === null)) {
        const sdkConfig = await sugoProject.findOneByDatasourcename(projectId)

        const dbSdkInit = _.get(sdkConfig, 'result.extra_params.sdk_init', '1') !== '0'// 项目启用sdk默认开启
        isSugoInitialize = isSugoInitialize && dbSdkInit

        const dbHeatMapFunc = _.get(sdkConfig, 'result.extra_params.sdk_submit_click_point', '1') === '1'// 项目启用点击位置默认开启
        isHeatMapFunc = isHeatMapFunc && dbHeatMapFunc

        const dbUploadLocation = _.get(sdkConfig, 'result.extra_params.sdk_position_config', -1)// 项目上报地理位置
        uploadLocation = dbUploadLocation < 0 ? uploadLocation : dbUploadLocation

        const dbUpdateConfig  = _.get(sdkConfig, 'result.extra_params.sdk_force_update_config', '0') === '1'// 项目强制拉取配置 默认关闭
        isUpdateConfig = isUpdateConfig && dbUpdateConfig

        await Redis.redisSetExpire(projectInitKey, SDK_CONFIG_EX, dbSdkInit)
        await Redis.redisSetExpire(projectSubmitPointKey, SDK_CONFIG_EX, dbHeatMapFunc)
        await Redis.redisSetExpire(projectPositionConfigKey, SDK_CONFIG_EX, dbUploadLocation)
        await Redis.redisSetExpire(projectUpdateConfigKey, SDK_CONFIG_EX, dbUpdateConfig)
      } else {
        isSugoInitialize = isSugoInitialize && projectInitValue
        isHeatMapFunc = isHeatMapFunc && projectSubmitPointValue
        uploadLocation = projectPositionConfigValue < 0 ? uploadLocation : projectPositionConfigValue
        isUpdateConfig = isUpdateConfig && projectUpdateConfigValue
      }

      // 获取某一端配置 若无则统一查询 并设置redis
      if (isSugoInitialize && (tokenInitValue === null || tokenUpdateConfigValue === null || tokenBuriedValue === null)) {
        const sdkConfig = await DataAnalysisService.findOne(token)

        const dbSdkInit =  _.get(sdkConfig, 'result.sdk_init', true) !== false// SDK类型启用sdk默认开启
        isSugoInitialize = dbSdkInit

        const dbBuriedPoint=_.get(sdkConfig,'result.all_buried_point_init',false) // sdk类型默认关闭全埋点
        isAutoTrack=dbBuriedPoint

        const dbUpdateConfig = _.get(sdkConfig, 'result.sdk_force_update_config', false) === true// SDK类型强制拉取配置 默认关闭
        isUpdateConfig = isUpdateConfig && dbUpdateConfig

        await Redis.redisSetExpire(tokenInitKey, SDK_CONFIG_EX, dbSdkInit)
        await Redis.redisSetExpire(tokenBuriedKey, SDK_CONFIG_EX, dbBuriedPoint)
        await Redis.redisSetExpire(tokenUpdateConfigKey, SDK_CONFIG_EX, dbUpdateConfig)
      } else {
        isSugoInitialize = isSugoInitialize && tokenInitValue
        isUpdateConfig = isUpdateConfig && tokenUpdateConfigValue
        isAutoTrack = tokenBuriedValue
      }

      // 获取appversion配置 则统一查询 并设置redis
      if (isSugoInitialize && (versionInitValue === null || versionUpdateConfigValue === null) ) {
        const sdkConfig = await appVersionServers.getInfoByTokenAndVersion(token, appVersion)

        const dbSdkInit =  _.get(sdkConfig, 'result.sdk_init', true) !== false// 版本启用sdk默认开启
        isSugoInitialize = dbSdkInit

        const dbUpdateConfig = !!_.get(sdkConfig, 'result.sdk_force_update_config', false) === true// 版本强制拉取配置 默认关闭
        isUpdateConfig = isUpdateConfig && dbUpdateConfig

        await Redis.redisSetExpire(versionInitKey, SDK_CONFIG_EX, dbSdkInit)
        await Redis.redisSetExpire(versionUpdateConfigKey, SDK_CONFIG_EX, dbUpdateConfig)
      } else {
        isSugoInitialize = isSugoInitialize && versionInitValue
        isUpdateConfig = isUpdateConfig && versionUpdateConfigValue
      }
      return Response.ok({ isSugoInitialize,isAutoTrack: isAutoTrack,isHeatMapFunc, uploadLocation: uploadLocation ? uploadLocation : 0, isUpdateConfig, latestDimensionVersion, latestEventBindingVersion })
    } catch (error) {
      throw Error('查询项目数据失败，请检查参数')
    }
  
  }

  /**
   * @param {string} project_id
   * @return {Promise.<void>}
   * @override
   */
  async del(key) {
    Logger.info('%s: del [%s]', this.toString(), key)
    await Redis.redisDel(key)
  }
  /**
   *@description 直接通过键名去获取
   *@params {String}  redis的key
   *@return {Unknow}  redis中的值  
  */
  async getByKey(key) {
    return await Redis.redisGet(key)
  }
  /**
  *@description 通过键名去更新redis
  *@params {String} key 键名
  *@params {String} value   键值
  */
  async setByKey(key, value) {
    Logger.info('%s: reset [%s]', this.toString(), value, 'to', this.toString(), key)
    return await Redis.redisSet(key, value)
  }
}

export default {
  SDKDimension: new SDKDimensionStorage(),
  DesktopDecide: new DesktopDecideStorage(),
  GlobalConfig: new SdkGlobalConfig()
}
