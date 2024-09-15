import SugoOfflineCalcDataSourcesService from '../services/sugo-offline-calc-data-sources.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import {rawShowTables, rawSQLQuery} from '../utils/plywood-facade'
import xorUtils from '../../common/xor-utils'
import {OfflineCalcDataSourceTypeEnum} from '../../common/constants'
import {rawShowTables as oracleRawShowTables, rawDescTable as oracleRawDescTable} from '../utils/oracle-facade'
import {rawShowTables as sqlserverRawShowTables, rawDescTable as sqlserverRawDescTable} from '../utils/sql-server-facade'
import { rawDescTable as db2RawDescTable, rawShowTables as db2RawShowTables } from '../utils/db2-facade'
import { rawShowTables as pgRawShowTables, rawDescTable as pgRawDescTable } from '../utils/postgres-facade'
import { rawShowTables as hiveRawShowTables, rawDescTable as hiveRawDescTable } from '../utils/hive-facade'
import {getAllHiveDatabase} from './hive.controller'
import {guessDruidStrTypeByDbDataType} from '../../common/offline-calc-model-helper'


/**
 * 查询指标模型数据源
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let {offset, limit, attributes, q, ...where} = _.isEmpty(ctx.q) ? ctx.query : ctx.q
  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  if (isGET && _.isString(attributes)) {
    attributes = attributes.split(',')
  }
  let others = {
    raw: true,
    order: [['updated_at', 'desc']],
    offset: _.isNil(offset) ? undefined : +offset,
    limit: _.isNil(limit) ? undefined : +limit,
    attributes: _.isNil(attributes) ? undefined : attributes
  }
  
  const serv = SugoOfflineCalcDataSourcesService.getInstance()
  where = serv.trimWhere(where)
  let res = await serv.findAll(where, others)
  returnResult(ctx, res)
}

/**
 * 创建指标模型数据源
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q

  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcDataSourcesService.getInstance()
  let ds = await serv.__model.findOne({
    where: {
      name: data.name
    },
    raw: true
  })
  if (ds) {
    returnError(ctx, `创建失败，已存在同名的数据源：${data.name}`)
    return
  }
  let res = await serv.create({...data, company_id, created_by: id})
  returnResult(ctx, res)
}

/**
 * 修改指标模型数据源
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q

  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcDataSourcesService.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该数据源不存在')
    return
  }
  let ds = await serv.__model.findOne({
    where: {
      id: {$ne: modId},
      name: patch.name
    },
    raw: true
  })
  if (ds) {
    returnError(ctx, `创建失败，已存在同名的数据源：${patch.name}`)
    return
  }
  
  let res = await serv.update({...patch, updated_by: id}, { id: modId, company_id })
  returnResult(ctx, res)
}

/**
 * 删除指标模型数据源
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoOfflineCalcDataSourcesService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该数据源不存在')
    return
  }
 
  try {
    // 有外键依赖，不允许删除，会报异常
    let res = await serv.remove({id: delId})
    returnResult(ctx, res)
  } catch (e) {
    returnError(ctx, '该数据源正在被维表使用，不能删除', 400)
  }
}


async function showTables(ctx) {
  let {id: dsId} = ctx.params
  const serv = SugoOfflineCalcDataSourcesService.getInstance()
  let ds = dsId !== 'new' ? await serv.__model.findByPk(dsId) : ctx.q
  
  const hostAndPort = _.get(ds, 'connection_params.hostAndPort')
  const {database, schema, user, password} = _.get(ds, 'connection_params')
  const args = {
    hostAndPort,
    database,
    schema,
    user,
    password: password && xorUtils.decrypt(password)
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.Oracle) {
    ctx.body = await oracleRawShowTables(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.SQLServer) {
    ctx.body = await sqlserverRawShowTables(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.Db2) {
    ctx.body = await db2RawShowTables(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.PostgreSQL) {
    ctx.body = await pgRawShowTables(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.Hive) {
    ctx.body = await hiveRawShowTables(args)
    return
  }
  let tables = await rawShowTables(args)
  ctx.body = tables
}

async function describeTable(ctx) {
  let {id: dsId, tableName} = ctx.params
  const serv = SugoOfflineCalcDataSourcesService.getInstance()
  let ds = dsId !== 'new' ? await serv.__model.findByPk(dsId) : ctx.q
  const hostAndPort = _.get(ds, 'connection_params.hostAndPort')
  const {database, schema, user, password} = _.get(ds, 'connection_params')
  
  const sql = `desc \`${tableName}\``
  const args = {
    sql,
    tableName, // oracle
    hostAndPort,
    database,
    schema,
    user,
    password: password && xorUtils.decrypt(password)
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.Oracle) {
    ctx.body = await oracleRawDescTable(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.SQLServer) {
    ctx.body = await sqlserverRawDescTable(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.Db2) {
    ctx.body = await db2RawDescTable(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.PostgreSQL) {
    ctx.body = await pgRawDescTable(args)
    return
  }
  if (ds.type === OfflineCalcDataSourceTypeEnum.Hive) {
    ctx.body = await hiveRawDescTable(args)
    return
  }
  
  // TODO fix first time query return empty array
  let result = await rawSQLQuery(args)
  if (_.isEmpty(result)) {
    // retry hack
    result = await rawSQLQuery(args)
  }
  // 因为数据库的数据类型多种多样，简单起见，统一转换为 Druid 的类型
  result = result.map(c => {
    return {
      ...c,
      Type: guessDruidStrTypeByDbDataType(c.Type),
      RawType: c.Type
    }
  })
  ctx.body = result
}


export default {
  query,
  create,
  update,
  remove,
  showTables,
  describeTable
}
