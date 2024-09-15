import SugoOfflineCalcIndicesService, {genIndicesId} from '../services/sugo-offline-calc-indices.service'
import SugoOfflineCalcVersionHistoriesService from '../services/sugo-offline-calc-version-histories.service'
import SugoOfflineCalcModelsService from '../services/sugo-offline-calc-models.service'
import { OfflineCalcVersionStatus } from '../../common/constants'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import db from '../models'
import { Response } from '../utils/Response'

/**
 * 查询指标模型指标
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let {offset, limit, attributes, q, publicOnly, ...where} = _.isEmpty(ctx.q) ? ctx.query : ctx.q
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
  if (publicOnly) {
    where = {
      ...(where || {}),
      belongs_id: {$eq: db.Sequelize.col('id')}
    }
  }

  let res
  const serv = SugoOfflineCalcIndicesService.getInstance()
  where = serv.trimWhere(where)
  if (_.isEmpty(where)) {
    let {user} = ctx.session
    res = await serv.findAll({
      $or: [
        {created_by: user.id},
        {belongs_id: {$eq: db.Sequelize.col('id')}}
      ]
    }, others)
  } else {
    res = await serv.findAll(where, others)
  }
  
  // 公有的查版本号 私有的查是否正在审核
  for (let i = 0; i < res.length; i ++) {
    let item = res[i]
    item.SugoVersionHistory = {
      version: '私有',
      isReviewing: false,
      status: OfflineCalcVersionStatus.pass
    }
    if (item.id === item.belongs_id) {
      //公有版本 查版本号
      let version = await SugoOfflineCalcVersionHistoriesService.getInstance().findAll({
        target_id: item.id,
        status: {
          $or: [OfflineCalcVersionStatus.pass, OfflineCalcVersionStatus.watingForDel]
        }
      }, { raw: true, attributes:['version', 'status'] })

      version = version.some( i => i.status === OfflineCalcVersionStatus.watingForDel) ? version.filter( i => i.status === OfflineCalcVersionStatus.watingForDel) : version
      version = _.maxBy(version, o => Number(o.version))
      item.SugoVersionHistory.version = version.version
      item.SugoVersionHistory.status = version.status
      item.status = version.status
      
    } else {
      let isReviewing = await SugoOfflineCalcVersionHistoriesService.getInstance().findOne({
        target_id: item.id,
        status: OfflineCalcVersionStatus.watingForReview
      })
      if (isReviewing) item.SugoVersionHistory.isReviewing = true
    }
  }

  returnResult(ctx, res)
}

async function getNextUnusedOfflineCalcIndexId(opts = {}) {
  // 如果没有 id，并且新产生的 id 已经存在，则自动修改 id
  let newId, idxIdOffset = 0
  const serv = SugoOfflineCalcIndicesService.getInstance()
  while(!newId) {
    newId = genIndicesId(idxIdOffset++)
    let existed = await serv.findByPk(newId, {...opts, raw: true})
    if (existed) {
      newId = null
    }
  }
  return newId
}

/**
 * 创建指标模型指标
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q

  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcIndicesService.getInstance()
  await db.client.transaction(async t => {
    if (data.id) {  // 如果id已经在数据库中存在，直接返回错误
      const hasId = await serv.findById(data.id)
      if (hasId.success) {
        returnResult(ctx, {message: 'error', sucess: false})
        return
      }
    }
    if (!data.id) {
      data.id = await getNextUnusedOfflineCalcIndexId({transaction: t})
    }
    let res = await serv.create({...data, company_id, created_by: id}, {transaction: t})
    returnResult(ctx, res)
  })
}

/**
 * 修改指标模型指标
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user

  const serv = SugoOfflineCalcIndicesService.getInstance()
  await db.client.transaction(async transaction => {
    let preMod = await serv.__model.findByPk(modId, {raw: true, transaction})
    if (!preMod) {
      returnError(ctx, '该指标不存在')
      return
    }

    if (preMod.belongs_id === modId) {
      // 修改公有版本 产生一个新的私有版本
      preMod = {
        ..._.omit(preMod, ['created_at','created_by', 'updated_by']),
        ...patch,
        id: await getNextUnusedOfflineCalcIndexId({transaction}),
        created_by: id
      }
      let res = await serv.create({...preMod, company_id, created_by: id}, {transaction})
      returnResult(ctx, res)
      return
    }

    let res = await serv.update({...preMod, ...patch, updated_by: id}, { id: modId, company_id }, {transaction})
    returnResult(ctx, res)
  })
}

/**
 * 删除指标模型指标
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoOfflineCalcIndicesService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该指标不存在')
    return
  }

  // 查询指标模型中是否有依赖当前 指标id 的数据
  let depModels = await SugoOfflineCalcModelsService.getInstance().findAll({
    params: {
      idxDeps: {
        $like: `%"${delId}"%`
      }
    }
  })

  if (!_.isEmpty(depModels)) {
    returnError(ctx, `该指标正在被指标模型 ${depModels.map(m => m.title || m.name).join('、')} 使用，不能删除`, 400)
    return
  }
  
  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

async function importIndices(ctx) {
  return ctx.body = Response.ok({})
}


export default {
  query,
  create,
  update,
  remove,
  importIndices
}
