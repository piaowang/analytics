import CONFIG from '../config'
import { log, debug } from './log'
import _ from 'lodash'
import { Timezone, parseInterval } from 'chronoshift'
import { $, TimeRange, External, SugoDruidExternal, AttributeInfo } from 'sugo-plywood'
import { properDruidRequesterFactory } from './requester'
import { DruidNativeType, DruidType } from '../../common/druid-column-type'
import { addExternal, getTablesDataset, getColumnsDataset, getSchemataDataset } from './schema'
import toArray from 'stream-to-array'
import SugoDimensionsService from '../services/sugo-dimensions.service'
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'
import {immutateUpdate} from '../../common/sugo-utils'
import { QUERY_ENGINE, DEFAULT_TIMEZONE } from '../../common/constants'
import * as Redis  from '../utils/redis'

//默认时区为上海
let TIMEZONE = new Timezone(DEFAULT_TIMEZONE)
const PLYWOOD_CONEXT_CACHE_PREFIX = 'plywood_context_cache'


export function getDefaultConfig(queryEngine = QUERY_ENGINE.TINDEX) {
  const {
    host: druidHost,
    timeout,
    engine = 'sugoDruid',
    verbose = '',
    retry = 2,
    concurrent: concurrentLimit = 2,
    exactResultsOnly = true,
    firstN = true,
    maxCardinality = 10000,
    groupByStrategy = 'v2',
    timezone = DEFAULT_TIMEZONE,
    socksHost,
    socksUsername,
    socksPassword
  } = queryEngine === QUERY_ENGINE.TINDEX ? CONFIG.druid : CONFIG.uindex || {}

  return {
    druidHost,
    timeout,
    engine,
    verbose,
    retry,
    concurrentLimit,
    exactResultsOnly,
    firstN,
    maxCardinality,
    groupByStrategy,
    timezone,
    socksHost,
    socksUsername,
    socksPassword
  }
}

export function getRequester(queryEngine = QUERY_ENGINE.TINDEX, extraOpts = {}) {
  const { druidHost, retry, timeout, verbose, concurrentLimit, socksHost, socksUsername, socksPassword } = getDefaultConfig(queryEngine)
  return properDruidRequesterFactory({
    druidHost,
    retry,
    timeout,
    verbose,
    concurrentLimit,
    socksHost,
    socksUsername,
    socksPassword,
    queryEngine,
    ...extraOpts
  })
}

export async function initDruid() {
  const requester = getRequester(QUERY_ENGINE.TINDEX)
  exports.requester = requester
  // requester 现在返回了一个流，为了兼容旧代码，实现了这个方法
  exports.requesterWithToArray = async (...args) => {
    const arr = await toArray(requester(...args))
    return arr && arr[0]
  }
  // 默认配置可以没有uindex配置项
  if (CONFIG.uindex) {
    const uindexRequester = getRequester(QUERY_ENGINE.UINDEX)
    exports.uindexRequester = uindexRequester
    // requester 现在返回了一个流，为了兼容旧代码，实现了这个方法
    exports.uindexRequesterWithToArray = async (...args) => {
      const arr = await toArray(uindexRequester(...args))
      return arr && arr[0]
    }
  }
  const druidVersion = await SugoDruidExternal.getVersion(requester)
  log('druid start, version:', druidVersion)
  exports.druidVersion = druidVersion
  return druidVersion
}

function withAbortSignal(getDruidContext) {
  return async (ctx, dataSourceName, params) => {
    let res = await getDruidContext(ctx, dataSourceName, params) // getDruidContext 带缓存逻辑，然而 params 不能被缓存

    let newContext = _.get(params, 'context') || {}

    // 如果能够知道 druid 查询请求是否被 abort，则加入 signal
    if (ctx && ctx.onceAbort && dataSourceName) {
      let abortCtrl = new AbortController()
      newContext = {...newContext, signal: abortCtrl.signal}
      ctx.onceAbort(() => abortCtrl.abort())
    }
    return immutateUpdate(res, `context.${dataSourceName}.context`, prevContext => {
      let prev = _.clone(prevContext)
      _.assign(prev, newContext)
      return prev
    })
  }
}

function getContextKey(queryEngine = QUERY_ENGINE.TINDEX) {
  return queryEngine === QUERY_ENGINE.TINDEX ? 'druidContext' : 'uindexContext'
}

/**
 * @param dataSourceName 数据源名称(tableName)
 * @param params: {
 *  context,timezone, interval, rollup, introspectionStrategy, customAggregations, customTransforms,
 *  queryEngine: 查询引擎类型默认为tindex; 'tindex' (行为数据) or 'uindex' (标签画像数据)
 *  ... }
 * @return {}
 */
export default withAbortSignal(async (ctx, dataSourceName, params = { context: {} }) => {
  const { queryEngine = QUERY_ENGINE.TINDEX } = params
  const { engine, timeout, verbose, groupByStrategy, firstN, maxCardinality, exactResultsOnly } = getDefaultConfig(queryEngine)
  const contextKey = getContextKey(queryEngine)
  // 从缓存中获取是否已将context缓存在当前进程中的标识
  const hasCurrentProcessCache = await hasContextCache(dataSourceName)
  let context = exports[contextKey] && exports[contextKey].context || {}
  if (context[dataSourceName] && hasCurrentProcessCache) {
    return exports[contextKey]
  }

  let druidContext = {
    timeout,
    groupByStrategy,
    ...params.context
  }

  if (params.timezone) {
    TIMEZONE = Timezone.fromJS(params.timezone)
  }

  const requester = queryEngine === QUERY_ENGINE.TINDEX ? exports.requester : exports.uindexRequester
  let druidVersion = exports.druidVersion
  if (queryEngine === QUERY_ENGINE.UINDEX && !exports.uindexVersion) {
    const uindexVersion = await SugoDruidExternal.getVersion(requester)
    exports.uindexVersion = uindexVersion
    druidVersion = uindexVersion
  }
  const timeAttribute = '__time'
  let filter = null
  const intervalString = params.interval || ''

  if (intervalString) {
    try {
      const _f = parseInterval(intervalString, TIMEZONE)
      const computedStart = _f.computedStart
      const computedEnd = _f.computedEnd
      const interval = TimeRange.fromJS({
        start: computedStart,
        end: computedEnd,
        bounds: '[)'
      })
      filter = $(timeAttribute).overlap(interval)
    } catch (e) {
      throw new Error(`Could not parse interval: ${intervalString}`)
    }
  }
  // var onlyDataSource = masterSource || (sqlParse ? sqlParse.table : null);
  if (!dataSourceName) {
    console.warn('No dataSourceName pass to druidContext, will query all dataSource meta data...')
  }

  let sourceList = dataSourceName ? [dataSourceName] : await SugoDruidExternal.getSourceList(requester)

  const introspectedExternals = await Promise.all(sourceList.filter(_.identity).map( async source => {
    const baseExternal = External.fromJS({
      engine,
      version: druidVersion,
      source,
      firstN,
      maxCardinality,
      exactResultsOnly, //数据要求准确性（true=分组查询为groupBy，false && limit < 1000 分组查询为topN
      rollup: params.rollup || false,
      timeAttribute,
      allowEternity: true,
      allowSelectQueries: true,
      introspectionStrategy: params.introspectionStrategy || '',
      context: druidContext,
      filter,
      customAggregations: params.customAggregations || null,
      customTransforms: params.customTransforms || null,
      attributeOverrides: []
    }, requester)
    if (queryEngine === QUERY_ENGINE.TINDEX || queryEngine === QUERY_ENGINE.UINDEX) {
      // .introspect()
      // 优化每次调用introspect()（lucene_segementMeta查询)
      // 查询前端数据库的维度，组装为lucene_segementMeta查询的返回结果，构建plywood引擎
      // 查询前端库有个好处就是可以包含自定义添加的维度，保证自定义添加的维度查询时也不报错
      const attributes = await SugoDimensionsService.getDimensionsForPlywood(source, queryEngine)
      const external = await baseExternal.introspect(undefined, attributes)
      return external
    } else {
      // 如果是预聚合引擎则不查询前端维度表，最发起lucene_segementMeta查询组装表结构
      const external = await baseExternal.introspect()
      return external
    }
  }))

  // 将external设置到context中
  introspectedExternals.filter(_.identity).forEach(introspectedExternal => {
    let source = introspectedExternal.source
    context[source] = introspectedExternal
    addExternal(source, introspectedExternal, false)
  })
  // for sql query
  context['SCHEMATA'] = getSchemataDataset()
  context['TABLES'] = getTablesDataset()
  context['COLUMNS'] = getColumnsDataset()
  // if (mode === 'query' && masterSource && !sqlParse.table && !sqlParse.rewrite) {
  // context['data'] = context[masterSource];
  // }
  if (verbose) console.log('introspection complete')

  exports[contextKey] = {
    context,
    timezone: TIMEZONE
  }

  // 变量缓存的同时，在redis里打上已缓存标识（解决PM2多进程变量共享问题)
  await setContextCache(dataSourceName)

  return exports[contextKey]
})

/**
 * 根据进程id生成对应的缓存key (PM2 cluster模式)
 */
export const getContextCacheFieldKey = (dataSourceName) => {
  const clusterId = process.env.NODE_APP_INSTANCE || 0
  return `${dataSourceName}_${clusterId}`
}

// 根据每台机器mac地址作为key
export const getRootContextCacheKey = async () => {
  // const macaddr = await getMacaddress()
  const { db: { database = 'global' } } = CONFIG // 改为数据库标识区分缓存标识，同一集群可能会有多台前端服务，故不能使用macaddr为key标识
  return `${PLYWOOD_CONEXT_CACHE_PREFIX}_${database}`
}

// 判断redis中是否存在某台机器某个进程是否缓存有plywood-context的标识
export const hasContextCache = async (dataSourceName) => {
  const rootKey = await getRootContextCacheKey()
  const fieldKey = getContextCacheFieldKey(dataSourceName)
  const redisClient = await Redis.getRedisClient()
  const res = await redisClient.hget(rootKey, fieldKey)
  return res === 'true'
}

/**
 * redis里打上已缓存context标识（解决PM2多进程变量共享问题)
 * @param {*} dataSourceName
 */
export const setContextCache = async (dataSourceName) => {
  const rootKey = await getRootContextCacheKey()
  const fieldKey = getContextCacheFieldKey(dataSourceName)
  const redisClient = await Redis.getRedisClient()
  // hash 存储
  await redisClient.hset(rootKey, fieldKey, true)
  // 设置过期时间
  await Redis.redisExpire(rootKey, 10 * 60 * 60) // 缓存一个小时
}

/**
 * 清除redis中缓存的plywood-context缓存标识
 */
export const removeProcessContextCacheForPlywood = async (dataSourceName) => {

  const rootKey = await getRootContextCacheKey()
  const redisClient = await Redis.getRedisClient()
  const fields = await redisClient.hkeys(rootKey)
  if (!fields || fields.length === 0) {
    return
  }
  for (let field of fields) {
    if (field.startsWith(dataSourceName)) {
      await redisClient.hdel(rootKey, field)
    }
    // 启动程序时，清楚所有缓存
    if (!dataSourceName) {
      await redisClient.hdel(rootKey, field)
    }
  }
}

/**
 * 同步plywood查询引擎中context中数据源的attributes
 * @deprecated
 * @param {*} source 数据源名称
 * @param {*} attribute 更新的数据源 {name, oldName, type} || names
 * @param {*} opt add=新增维度；update=更新维度；sync=同步维度操作;delete=删除维度操作
 */
export const updateAttributeInExternalContext =  async (source, attribute, opt, queryEngine = QUERY_ENGINE.TINDEX) => {
  const contextKey = getContextKey(queryEngine)
  let context = exports[contextKey] && exports[contextKey].context || {}
  let instanceExternal = context[source]
  if (!instanceExternal || !instanceExternal.attributes || !opt) {
    return
  }
  const newAttribute = (opt === 'add' || opt === 'update') ? AttributeInfo.fromJS({
    name: attribute.name,
    type: DruidType[attribute.type] || 'STRING',
    nativeType: DruidNativeType[attribute.type] || 'STRING'
  }) : null
  if (opt === 'sync') {
    const attributes = await SugoDimensionsService.getDimensionsForPlywood(source)
    let value = instanceExternal.valueOf()
    value.attributes = AttributeInfo.override(value.attributes, attributes)
    instanceExternal = External.fromValue(value)
  } else if (opt === 'add' && newAttribute) {
    instanceExternal = instanceExternal.updateAttribute(newAttribute)
  } else if (opt === 'update' && newAttribute){
    instanceExternal = instanceExternal.updateAttribute(newAttribute)
  } else if (opt === 'delete') {
    _.remove(instanceExternal.attributes, (attr) => _.includes(attribute, attr.name))
  }
  exports[contextKey].context[source] = instanceExternal
}
