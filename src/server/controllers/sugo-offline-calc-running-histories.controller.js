import SugoOfflineCalcRunningHistoriesService from '../services/sugo-offline-calc-running-histories.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'

/**
 * 查询指标模型执行历史
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let {offset, limit, q, ...where} = _.isEmpty(ctx.q) ? ctx.query : ctx.q
  
  if (!_.get(where, 'model_id')) {
    returnError(ctx, 'missing model_id')
    return
  }
  
  const serv = SugoOfflineCalcRunningHistoriesService.getInstance()
  where = serv.trimWhere(where)
  let res = await serv.findAll(where, {
    raw: true,
    order: [['updated_at', 'desc']],
    offset: _.isNil(offset) ? undefined : +offset,
    limit: _.isNil(limit) ? undefined : +limit
  })
  returnResult(ctx, res)
}

/**
 * 创建指标模型执行历史
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcRunningHistoriesService.getInstance()
  let res = await serv.create({...data, company_id, created_by: id})
  returnResult(ctx, res)
}

/**
 * 修改指标模型执行历史
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {id} = user
  
  const serv = SugoOfflineCalcRunningHistoriesService.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该指标模型执行历史不存在')
    return
  }
  
  let res = await serv.update({...patch, updated_by: id}, { id: modId })
  returnResult(ctx, res)
}

/**
 * 删除指标模型执行历史
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoOfflineCalcRunningHistoriesService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该指标模型执行历史不存在')
    return
  }
  
  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

export default {
  query,
  create,
  update,
  remove
}
