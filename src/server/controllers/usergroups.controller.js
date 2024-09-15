
import {returnResult} from '../utils/helper'
import {checkLimit} from '../utils/resouce-limit'
import conf from '../config'
import UserGroupService from '../services/usergroup-redis.service'
import segmentService, { removeLookup, createOrUpdateLookup } from '../services/segment.service'
import LifeCycleService from '../services/life-cycle.service'
import {mapAwaitAll} from '../../common/sugo-utils'
import Sequelize from 'sequelize'
import db from '../models'
import _ from 'lodash'
import { convertContainsByDBType } from './convert-contains-where'
let dbcon
const {
  cutv
} = conf
const getMySqlConn = async () => {
  let {
    mysqlHost,
    mysqlPort,
    mysqlUserName,
    mysqlPwd,
    cellphoneDatabase
  } = cutv
  let option = {
    dialect: 'mysql',
    host: mysqlHost,
    port: mysqlPort,
    pool: {
      max: 5, // 连接池中最大连接数量
      min: 0, // 连接池中最小连接数量
      idle: 10000 // 如果一个线程 10 秒钟内没有被使用过的话，那么就释放线程
    }
  }
  if (!dbcon) {
    dbcon = new Sequelize(
      cellphoneDatabase,
      mysqlUserName,
      mysqlPwd,
      option)
  }
  return dbcon
}
/**
 * 获取分群列表
 * @param {*} ctx
 */
const get = async ctx => {
  let query = ctx.q
  let {company_id} = ctx.session.user
  query.where = query.where || {}
  query.where.company_id = company_id
  const tagsFilter = _.get(query.where, 'tags.$contains', '')
  const notTagsFilter = _.get(query.where, '$not.tags.$contains', '')
  if(tagsFilter) {
    query.where = {
      ..._.omit(query.where, ['tags']),
      $and: convertContainsByDBType('tags', tagsFilter)
    }
  } else if (notTagsFilter) {
    query.where['$not'] = {
      ..._.omit(query.where['$not'], ['tags']),
      $and: convertContainsByDBType('tags', notTagsFilter)
    }
  }
  query.order = query.order || [ ['updated_at', 'DESC'] ]
  let ds = await segmentService.get(query)
  ctx.body = {
    result: ds
  }
}

/**
 * 刷新分群数据接口
 * @param {*} ctx
 */
const apiUpdate = async ctx => {
  let {query} = ctx.q
  let res = await segmentService.update({
    update: query,
    query
  })
  returnResult(ctx, res)
}

/**
 * 更新分群条件接口
 * @param {*} ctx
 */
const update = async ctx => {
  let {
    query,
    update
  } = ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  query.where.company_id = company_id
  // update = _.pick(update, [
  //   'title',
  //   'params',
  //   'description',
  //   'usergroupIds',
  //   'tags'
  // ])
  update.updated_by = id
  let res = await segmentService.update({
    update,
    query
  })

  returnResult(ctx, res)
}

/**
 * 删除单个分群
 * @param {*} ctx
 */
const del = async ctx => {
  let {user} = ctx.session
  let {company_id} = user
  let {
    del,
    query
  } = ctx.q
  query.where.company_id = company_id

  //删除版本表中版本记录
  let lifeCycleService = new LifeCycleService()
  let { where: { id: delId } } = query

  //删除历史版本
  let versionList = await db.SegmentVersion.findAll({where: { segment_id: delId }, raw: true })

  await mapAwaitAll(versionList, async ver => {
    await segmentService.del( { 
      query: { where: { id: ver.id }, raw: true },
      del: { 
        groupId: `usergroup_${ver.id}`,
        ...ver.params.dataConfig
      } })
  })

  let res = await segmentService.del({
    del,
    query
  })

  returnResult(ctx, res)
}

/**
 * 创建分群
 * @param {*} ctx
 */
const add = async ctx => {

  //数量限制
  await checkLimit(ctx, 'usergroup')

  let {user} = ctx.session
  let {company_id, id: user_id} = user
  let {usergroup} = ctx.q

  usergroup = _.pick(usergroup, [
    'title',
    'druid_datasource_id',
    'datasource_name',
    'params',
    'description',
    'md5',
    'tags'
  ])

  let q = {
    usergroup,
    user_id,
    company_id
  }

  let res = await segmentService.add(q)
  ctx.body = res
}

/**
 * 读取分群储存的id
 * @param {*} ctx
 */
const remoteRead = async ctx => {
  let {query} = ctx.q || ctx.query
  Object.assign(query.dataConfig, conf.dataConfig)
  let res = await UserGroupService.read(query)
  ctx.body = res.result
}

/**
 * 查询分群id，并缓存到redis
 * @param {*} ctx
 */
const query = async ctx => {
  let {usergroup} = ctx.q
  let cacheControl = (ctx.headers['cache-control'] || '').toLowerCase()
  let disableCache = cacheControl.indexOf('no-cache') !== -1 || cacheControl.indexOf('no-store') !== -1

  let addToDruidResult = await segmentService.query(usergroup, disableCache)
  ctx.body = {
    addToDruidResult
  }
}

const queryValidLookups = async ctx => {
  let {dataSourceId} = ctx.query
  ctx.body = await segmentService.queryLookups(dataSourceId)
}

const getUserIdsByTempId = async ctx => {
  let { id, limit, offset } = ctx.q
  const res = await segmentService.getUserIdsByTempId(id, limit, offset)
  returnResult(ctx, res)
}

const getUserListWithDiyDim = async ctx => {
  if (!cutv) return returnResult(ctx, null, 1, 500)
  const { tableName, pkName } = cutv
  const { filter, userIdDimName, demandDimName, limit } = ctx.q
  if (_.isEmpty(filter)) return returnResult(ctx, []) 
  let dbcon = await getMySqlConn()
  const res = await dbcon.query(`select ${pkName} AS ${demandDimName} from ${tableName} WHERE ${userIdDimName} LIKE '%${filter}%' LIMIT ${limit}`)
  return returnResult(ctx, res[0] )
}

/**
 * 删除分群
 * @param {*} ctx
 */
const delByDataConfig = async ctx => {
  const { dataConfig } = ctx.q
  try {
    UserGroupService.del(dataConfig)
    await removeLookup(dataConfig, false)
  } catch (e) {
    
  }
  return returnResult(ctx, [])
}

const saveLookUp = async ctx => {
  const { dataConfig } = ctx.q
  const lookUpInfo = {
    queryType: 'user_group',
    dataConfig: {
      ...dataConfig
    }
  }
  let res = await createOrUpdateLookup(lookUpInfo, false)
  return returnResult(ctx, res)
}

export default {
  get,
  apiUpdate,
  update,
  del,
  add,
  remoteRead,
  query,
  queryValidLookups,
  getUserIdsByTempId,
  getUserListWithDiyDim,
  delByDataConfig,
  createOrUpdateLookup,
  saveLookUp
}
