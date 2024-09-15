import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import SugoDataDevVisualModelsService from '../services/sugo-data-dev-visual-models.service'

/**
 * 查询数据开发中心的数据模型
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let {offset, limit, q, ...where} = _.isEmpty(ctx.q) ? ctx.query : ctx.q
  
  if (!_.get(where, 'type_id')) {
    returnError(ctx, 'missing type_id')
    return
  }
  const serv = SugoDataDevVisualModelsService.getInstance()
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
 * 创建数据开发中心的数据模型
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoDataDevVisualModelsService.getInstance()
  let res = await serv.create({...data, company_id, created_by: id})
  returnResult(ctx, res)
}

/**
 * 修改数据开发中心的数据模型
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {id} = user
  
  const serv = SugoDataDevVisualModelsService.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该数据模型不存在')
    return
  }
  
  let res = await serv.update({...patch, updated_by: id}, { id: modId })
  returnResult(ctx, res)
}

/**
 * 删除数据开发中心的数据模型
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoDataDevVisualModelsService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该数据模型不存在')
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
