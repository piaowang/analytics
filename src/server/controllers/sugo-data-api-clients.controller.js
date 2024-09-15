import _ from 'lodash'
import {generate} from 'shortid'
import {returnError, returnResult} from '../utils/helper'
import {SugoDataApiClientService} from '../services/sugo-data-api-clients.service'
import sid from '../models/safe-id'
import moment from 'moment'
import conf from '../config'
import { redisSetExpire, redisDel } from '../utils/redis'

const { data_api_access_token_expire=2 } = conf
/**
 * 查询多个客户端
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let where = ctx.q
  
  let res = await SugoDataApiClientService.getInstance().findAll(where, { order: [['updated_at', 'desc']]})
  returnResult(ctx, res)
}

/**
 * 创建客户端
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoDataApiClientService.getInstance()
  let existedSameName = await serv.findOne({name: data.name}, {raw: true})
  if (existedSameName) {
    returnError(ctx, '存在同名的客户端')
    return
  }
  
  // 只取 name, status，其他由系统生成
  let preCreate = {
    name: data.name,
    app_id: sid(),
    app_key: generate(),
    status: _.isNil(data.status) ? 1 : (+data.status ? 1 : 0),
    created_by: id,
    company_id
  }
  if (!preCreate.name) {
    returnError(ctx, '客户端名称不能为空')
    return
  }
  let res = await serv.create(preCreate)
  returnResult(ctx, res)
}

/**
 * 修改客户端
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let rowId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoDataApiClientService.getInstance()
  let existed = await serv.findByPk(rowId)
  if (!existed) {
    returnError(ctx, '该客户端不存在', 404)
    return
  }
  let existedSameName = await serv.findOne({
    id: {$ne: rowId},
    name: patch.name
  }, {raw: true})
  if (existedSameName) {
    returnError(ctx, '存在同名的客户端')
    return
  }
  // 只取 name, status，其他无法修改
  let preMod = {
    ...existed,
    name: patch.name,
    status: _.isNil(patch.status) ? 1 : (+patch.status ? 1 : 0),
    updated_by: id
  }

  if (preMod.status === 1) {
    // 添加redis缓存(跟token过期时间)
    const expireSec = moment(preMod.access_token_expire_at).diff(moment(), 's')
    expireSec > 0 && await redisSetExpire(preMod.access_token, expireSec, moment(preMod.access_token_expire_at).toISOString())
  } else {
    // 禁用时删除redis缓存
    preMod.access_token && await redisDel(preMod.access_token)
  }

  let res = await serv.update(preMod, { id: rowId, company_id })
  returnResult(ctx, res)
}

/**
 * 删除客户端
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoDataApiClientService.getInstance()
  let preDel = await serv.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该客户端不存在', 404)
    return
  }
  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
  try {
    // 删除redis缓存
    preDel.access_token && await redisDel(preDel.access_token)
  } catch(e) {
    console.log(e.stack)
  }
}

async function authClient(ctx) {
  let {app_id, app_key} = ctx.request.body
  const serv = SugoDataApiClientService.getInstance()
  let res = await serv.findOne({app_id, app_key}, {raw: true})
  if (!res) {
    ctx.status = 404
    ctx.body = { code: 404, description: '客户端不存在' }
    return
  }
  let {access_token, access_token_expire_at} = res
  if (access_token && moment().isBefore(access_token_expire_at)) {
    // 未过期，返回当前 access_token
    
    ctx.status = 200
    ctx.body = {
      code: 200,
      description: 'OK',
      response: _.pick(res, ['access_token', 'refresh_token', 'access_token_expire_at'])
    }
    return
  }
  
  const accessToken = `${app_id}-${sid()}`
  let preMod = {
    ...res,
    access_token: accessToken,
    refresh_token: accessToken,
    access_token_expire_at: moment().add(data_api_access_token_expire, 'hours').toDate()
  }

  // 添加redis缓存(跟token过期时间data_api_access_token_expire小时)
  await redisSetExpire(accessToken, data_api_access_token_expire*60*60, moment(preMod.access_token_expire_at).toISOString())

  await serv.update(preMod, { id: res.id })

  ctx.status = 200
  ctx.body = {
    code: 200,
    description: 'OK',
    response: _.pick(preMod, ['access_token', 'refresh_token', 'access_token_expire_at'])
  }
}

async function refreshAccessToken(ctx) {
  let {jwt, refresh_token = jwt} = ctx.request.body
  
  const serv = SugoDataApiClientService.getInstance()
  let res = await serv.findOne({refresh_token}, {raw: true})
  if (!res) {
    ctx.status = 404
    ctx.body = { code: 404, description: '客户端不存在' }
    return
  }
  let {app_id} = res

  /*if (access_token && moment().isBefore(access_token_expire_at)) {
    // 未过期，返回当前 access_token
    ctx.status = 200
    ctx.body = {
      code: 200,
      description: 'OK',
      response: _.pick(res, ['access_token', 'refresh_token', 'access_token_expire_at'])
    }
    return
  }*/

  const expireHours = data_api_access_token_expire // 2 hours
  const expireSec = expireHours * 60 * 60
  
  const accessToken = `${app_id}-${sid()}`
  const refreshToken = `${app_id}-${sid()}`
  let preMod = {
    ...res,
    access_token: accessToken,
    // refresh_token: accessToken,
    refresh_token: refreshToken, // 改为一个固定的新值，不要跟access_token值一样, modify by WuQic
    access_token_expire_at: moment().add(expireHours, 'hours').toDate()
  }

  // 添加redis缓存(跟token过期时间2小时)
  await redisSetExpire(accessToken, expireSec, preMod.access_token_expire_at.toISOString())
  await serv.update(preMod, { id: res.id })

  ctx.status = 200
  ctx.body = {
    code: 200,
    description: 'OK',
    response: _.pick(preMod, ['access_token', 'refresh_token', 'access_token_expire_at'])
  }
}

export default {
  query,
  create,
  update,
  remove,
  authClient,
  refreshAccessToken
}
