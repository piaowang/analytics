import toArray from 'stream-to-array'
import {DataSourceType, DEFAULT_TIMEZONE, QUERY_ENGINE} from '../../common/constants'
import getDruidQueryContext, {
  getDefaultConfig as getDruidDefaultConfig,
  getRequester as getDruidRequester,
  requester as tIndexRequester,
  uindexRequester
} from './druid-middleware'
import getMySQLContext, {
  getRequester as getMysqlRequester,
  getRequester, introspectTable,
  introspectTableWithCacheCtrl
} from './plywood-mysql-middleware'
import dsServ from '../services/sugo-datasource.service'
import {Expression, External, SugoDruidExternal} from 'sugo-plywood'
import {addExternal, getColumnsDataset, getSchemataDataset, getTablesDataset} from './schema'
import {Timezone} from 'chronoshift'
import * as plyqlExecutor from './plyql-executor'
import xorUtil from '../../common/xor-utils'


export function getStreamRequesterByDataSource(ds) {
  let dataSourceType = ds && ds.type
  if (dataSourceType === DataSourceType.Tindex || dataSourceType === DataSourceType.Druid) {
    return tIndexRequester
  }
  if (dataSourceType === DataSourceType.Uindex) {
    return uindexRequester
  }
  if (dataSourceType === DataSourceType.MySQL) {
    return getRequester(ds)
  }
  throw new Error('Unknown dataSource type: ' + dataSourceType)
}

export function getRequesterByDataSource(dataSource) {
  let requester = getStreamRequesterByDataSource(dataSource)
  return async (...args) => {
    const arr = await toArray(requester(...args))
    return arr && arr[0]
  }
}

/**
 *
 * @param ctx koaContext
 * @param dataSourceName
 * @param params    // {
 * context,timezone, interval, rollup, introspectionStrategy, customAggregations, customTransforms,
 * queryEngine: 查询引擎类型默认为tindex; 'tindex' (行为数据) or 'uindex' (标签画像数据) ...}
 */
export async function getExpressionComputeContext(ctx, dataSourceName, params) {
  let ds = await dsServ.getDataSourceByName(dataSourceName)
  let dataSourceType = ds && ds.type
  if (dataSourceType !== DataSourceType.MySQL) {
    return getDruidQueryContext(ctx, dataSourceName, params)
  }
  return await getMySQLContext(ctx, dataSourceName, params)
}

function getRequesterByArgs(hostAndPort, database, user, password) {
  if (!hostAndPort) {
    throw new Error('Missing host and port')
  }
  if (!database) { // druid
    return getDruidRequester(QUERY_ENGINE.TINDEX + `_${hostAndPort}`, {druidHost: hostAndPort})
  } else if (user && password) {
    return getMysqlRequester(null, {
      host: hostAndPort,
      database,
      user,
      password
      // password: xorUtil.decrypt(password)
    })
  } else {
    throw new Error('Invalid args: getRequesterByArgs')
  }
}


export async function rawShowTables(args) {
  let {hostAndPort, database, user, password} = args
  let requester = getRequesterByArgs(hostAndPort, database, user, password)
  if (database) {
    const arr = await toArray(SugoDruidExternal.executeRawQuery(requester, 'show tables;'))
    let tableNameKey = `Tables_in_${database}`
    return (arr || []).map(ev => ev && ev[tableNameKey])
  }
  return await SugoDruidExternal.getSourceList(requester)
}


export async function rawSQLQuery(args) {
  let {sql, hostAndPort, database, user, password} = args
  let requester = getRequesterByArgs(hostAndPort, database, user, password)
  
  let sqlParse = Expression.parseSQL(sql)
  // console.log(JSON.stringify(sqlParse))
  
  // const queryEngine = QUERY_ENGINE.TINDEX + `_${hostAndPort}`
  
  if (database) {
    let mockDs = {
      name: sqlParse.table,
      params: {
        // {"dbConnectionInfo": {"db_pwd": "MDU0MDUzMDUyMDUxMDUwMDQ5", "db_host": "192.168.0.202:3306", "db_name": "mysql", "db_user": "root", "table_name": "db"}}
        dbConnectionInfo: {
          db_host: hostAndPort,
          db_name: database,
          db_user: user,
          db_pwd: password && xorUtil.encrypt(password),
          table_name: sqlParse.table
        }
      }
    }
  
    let context = {
      // for sql query
      SCHEMATA: getSchemataDataset(),
      TABLES: getTablesDataset(),
      COLUMNS: getColumnsDataset()
    }
  
    let introspectedExternal = await introspectTable(mockDs, {rawType: true})
    if (introspectedExternal) {
      // 将external设置到context中
      context[mockDs.name] = introspectedExternal
    }
  
    let result = await plyqlExecutor.executeSQLParse(sqlParse, context, Timezone.fromJS('Asia/Shanghai'))
    return result.toJS()
  }
  
  const {engine, timeout, groupByStrategy, firstN, maxCardinality, exactResultsOnly} = getDruidDefaultConfig()
  const timeAttribute = '__time'
  const baseExternal = External.fromJS({
    engine,
    version: await SugoDruidExternal.getVersion(requester),
    source: sqlParse.table,
    firstN,
    maxCardinality,
    exactResultsOnly, //数据要求准确性（true=分组查询为groupBy，false && limit < 1000 分组查询为topN
    rollup: false,
    timeAttribute,
    allowEternity: true,
    allowSelectQueries: true,
    introspectionStrategy: '',
    context: {
      timeout,
      groupByStrategy,
      isScan: false
    },
    filter: null,
    customAggregations: null,
    customTransforms: null,
    attributeOverrides: []
  }, requester)
  // 如果是预聚合引擎则不查询前端维度表，最发起lucene_segementMeta查询组装表结构
  const external = await baseExternal.introspect()
  
  let druidProps = {
    context: {
      SCHEMATA: getSchemataDataset(),
      TABLES: getTablesDataset(),
      COLUMNS: getColumnsDataset(),
      [sqlParse.table]: external
    },
    timezone: new Timezone(DEFAULT_TIMEZONE)
  }
  addExternal(sqlParse.table, external, true)
  
  let result = await plyqlExecutor.executeSQLParse(sqlParse, druidProps.context, druidProps.timezone)
  return result.toJS()
}
