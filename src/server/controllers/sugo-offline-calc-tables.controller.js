import SugoOfflineCalcTablesService from '../services/sugo-offline-calc-tables.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import SugoOfflineCalcModelsService from '../services/sugo-offline-calc-models.service'
import SugoOfflineCalcIndicesService from '../services/sugo-offline-calc-indices.service'
import LivescreenService from  '../services/sugo-livescreen.service'


/**
 * 查询维表
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
  
  const serv = SugoOfflineCalcTablesService.getInstance()
  where = serv.trimWhere(where)
  let res = await serv.findAll(where, others)
  returnResult(ctx, res)
}

/**
 * 创建维表
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {id} = user
  
  const serv = SugoOfflineCalcTablesService.getInstance()
  // TODO 补充使用事务完善其他修改方法
  await serv.client.transaction(async transaction => {
    let conflict = await serv.findOne({
      data_source_id: data.data_source_id,
      name: data.name
    }, {raw: true, transaction})
    if (conflict) {
      returnError(ctx, '此表已经添加过了')
      return
    }
    conflict = data.title && await serv.findOne({ title: data.title }, {raw: true, transaction})
    if (conflict) {
      returnError(ctx, '此别名已经使用过了')
      return
    }
    let res = await serv.create({...data, created_by: id}, {transaction})
    returnResult(ctx, res)
  })
}

/**
 * 修改维表
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {id} = user
  
  const serv = SugoOfflineCalcTablesService.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该维表不存在')
    return
  }
  let conflict = await serv.findOne({
    id: {$ne: modId},
    data_source_id: patch.data_source_id,
    name: patch.name
  }, {raw: true})
  if (conflict) {
    returnError(ctx, '此表已经添加过了')
    return
  }
  conflict = patch.title && await serv.findOne({
    id: {$ne: modId},
    title: patch.title
  }, {raw: true})
  if (conflict) {
    returnError(ctx, '此别名已经使用过了')
    return
  }
  
  let res = await serv.update({...patch, updated_by: id}, { id: modId })
  returnResult(ctx, res)
}

/**
 * 删除维表
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoOfflineCalcTablesService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该维表不存在')
    return
  }
  // 查询指标库中是否有依赖当前 维表id 的数据
  let depIndices = await SugoOfflineCalcIndicesService.getInstance().findAll({
    formula_info: {
      tableDeps: {
        $like: `%"${delId}"%`
      }
    }
  }, {raw: true})
  
  if (!_.isEmpty(depIndices)) {
    returnError(ctx, `该维表正在被指标 ${depIndices.map(idx => idx.title || idx.name).join('、')} 使用，不能删除`, 400)
    return
  }
  
  // 查询指标模型中是否有依赖当前 维表id 的数据
  let depModels = await SugoOfflineCalcModelsService.getInstance().findAll({
    params: {
      tableDeps: {
        $like: `%"${delId}"%`
      }
    }
  }, {raw: true})
  
  if (!_.isEmpty(depModels)) {
    returnError(ctx, `该维表数据正在被指标模型 ${depModels.map(m => m.title || m.name)} 使用，不能删除`, 400)
    return
  }
  // 检测大屏是否依赖
  let livescreen = await LivescreenService.getLiveScreenComponent()
  livescreen = livescreen.filter(p => _.get(p, 'data_source_config.offline_calc_table_id', '') === delId)
  livescreen = await LivescreenService.getLiveScreensById(livescreen.map(p => p.screen_id))
  if (livescreen.length) {
    returnError(ctx, `该维表数据正在大屏 ${livescreen.map(m => m.title)} 使用，不能删除`, 400)
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
