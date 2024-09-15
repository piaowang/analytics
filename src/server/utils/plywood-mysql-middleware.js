import _ from 'lodash'
import {parseInterval, Timezone} from 'chronoshift'
import {$, External, TimeRange} from 'sugo-plywood'
import {properMySQLRequesterFactory} from './requester'
import {addExternal, getColumnsDataset, getSchemataDataset, getTablesDataset} from './schema'
import {DEFAULT_TIMEZONE} from '../../common/constants'
import xorUtil from '../../common/xor-utils'
import dsServ from '../services/sugo-datasource.service'
import moment from 'moment-timezone'
import {hasContextCache, setContextCache} from './druid-middleware'

//默认时区为上海
let TIMEZONE = new Timezone(DEFAULT_TIMEZONE)


const DEFAULT_CONFIG = {
  engine: 'mysql',
  verbose: process.env.NODE_ENV !== 'production',
  retry: 2,
  timeout: 60000,
  concurrentLimit: 30,
  exactResultsOnly: true,
  maxCardinality: 10000,
  timezone: DEFAULT_TIMEZONE
}

export function getRequester(dataSource, extraOpts = {}) {
  const { retry, verbose, concurrentLimit, timezone } = DEFAULT_CONFIG

  let {db_name, db_host, table_name, db_user, db_pwd, db_timezone} = _.get(dataSource, 'params.dbConnectionInfo') || {}
  // {"dbConnectionInfo": {"db_pwd": "MDU0MDUzMDUyMDUxMDUwMDQ5", "db_host": "192.168.0.202:3306", "db_name": "mysql", "db_user": "root", "table_name": "db"}}
  return properMySQLRequesterFactory({
    host: db_host,
    database: db_name,
    user: db_user,
    password: db_pwd && xorUtil.decrypt(db_pwd),
    retry,
    verbose,
    concurrentLimit,
    // mySQL 返回的是不带时区的字符串，这里需要用户指定
    // 将服务器的时间当成是 db_timezone 的时区
    timezone: db_timezone || moment().tz(timezone).format('Z'),
    ...extraOpts
  })
}

export async function introspectTable(ds, params) {
  const { engine, timeout, maxCardinality, exactResultsOnly } = DEFAULT_CONFIG

  let tableName = ds.name
  const timeAttribute = _.get(ds, 'params.dbConnectionInfo.db_time_dim_name') || undefined
  const requester = getRequester(ds)

  let filter = null
  const intervalString = params.interval || ''

  if (intervalString && timeAttribute) {
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

  const baseExternal = External.fromJS({
    engine,
    // version: druidVersion,
    source: tableName,
    maxCardinality,
    exactResultsOnly, //数据要求准确性（true=分组查询为groupBy，false && limit < 1000 分组查询为topN
    rollup: params.rollup || false,
    timeAttribute,
    allowEternity: true,
    allowSelectQueries: true,
    introspectionStrategy: params.introspectionStrategy || '',
    context: {
      timeout,
      ...params.context
    },
    filter,
    customAggregations: params.customAggregations || null,
    customTransforms: params.customTransforms || null,
    attributeOverrides: [],

    // mySQL 数据库时区，筛选时，会将筛选日期转换到这个时区，再进行筛选
    timezone: TIMEZONE.toString()
  }, requester)
  // 如果是预聚合引擎则不查询前端维度表，最发起lucene_segementMeta查询组装表结构
  let introspectedExternal = await baseExternal.introspect()
  addExternal(tableName, introspectedExternal, params.rawType || false)
  return introspectedExternal
}

const withCacheControl = (func, resolver) => {
  let funcWithMarkCached = async (...args) => {
    let res = await func(...args)
    // 变量缓存的同时，在redis里打上已缓存标识（解决PM2多进程变量共享问题)
    await setContextCache(resolver(...args))
    return res
  }
  let funcMem = _.memoize(funcWithMarkCached, resolver)

  return async (...args) => {
    let key = resolver(...args)
    if (!await hasContextCache(key)) {
      funcMem.cache.clear()
    }

    return funcMem(...args)
  }
}

export const introspectTableWithCacheCtrl = withCacheControl(introspectTable, ds => ds.name)

const getMySQLContext = async (ctx, dataSourceName, params = { context: {} }) => {
  if (!dataSourceName) {
    throw new Error('Need table name to get MySQL requester')
  }

  const { verbose } = DEFAULT_CONFIG

  if (params.timezone) {
    TIMEZONE = Timezone.fromJS(params.timezone)
  }

  let sourceList = [dataSourceName]

  let context = {
    // for sql query
    SCHEMATA: getSchemataDataset(),
    TABLES: getTablesDataset(),
    COLUMNS: getColumnsDataset()
  }

  await Promise.all(sourceList.filter(_.identity).map(async source => {
    let ds = await dsServ.getDataSourceByName(source)
    let introspectedExternal = await introspectTableWithCacheCtrl(ds, params)
    if (introspectedExternal) {
      // 将external设置到context中
      context[source] = introspectedExternal
    }
  }))

  if (verbose) console.log('introspection complete')

  return {
    context,
    timezone: TIMEZONE
  }
}

/**
 * @param dataSourceName 数据源名称(tableName)
 * @param params: {
 *  context,timezone, interval, rollup, introspectionStrategy, customAggregations, customTransforms,
 *  queryEngine: 查询引擎类型默认为tindex; 'tindex' (行为数据) or 'uindex' (标签画像数据)
 *  ... }
 * @return {}
 */
export default getMySQLContext
