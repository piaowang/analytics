import TrafficAnalyticModelsService from '../services/traffic-analytic-models.service'
import {returnResult, returnError} from '../utils/helper'
import _ from 'lodash'

async function getModels(ctx) {
  let {modelId} = ctx.params
  let {user} = ctx.session
  let {company_id} = user

  if (modelId) {
    let model = await TrafficAnalyticModelsService.queryOne({id: modelId, company_id})
    returnResult(ctx, model)
    return
  }

  let models = await TrafficAnalyticModelsService.queryMany({company_id}, {
    order: [
      ['updated_at', 'DESC']
    ]
  })
  returnResult(ctx, models)
}

async function createModel(ctx) {
  let {user} = ctx.session
  let {company_id, id} = user
  let model = ctx.q

  // 重名检查
  let sameNameModel = await TrafficAnalyticModelsService.queryOne({
    name: model.name, 
    druid_datasource_id: model.druid_datasource_id
  })
  if (sameNameModel) {
    returnError(ctx, '存在同名的流量分析模型，请修改名称再试')
    return
  }

  model.company_id = company_id
  model.created_by = id
  let res = await TrafficAnalyticModelsService.create(model)
  returnResult(ctx, res)
}

async function updateModel(ctx) {
  let {modelId} = ctx.params
  let model = ctx.q
  let {user} = ctx.session
  let {company_id, id} = user

  model.updated_by = id
  let res = await TrafficAnalyticModelsService.updateById(modelId, company_id, model)
  returnResult(ctx, res)
}

async function deleteModel(ctx) {
  let {modelId} = ctx.params
  let {user} = ctx.session
  let {company_id} = user

  let res = await TrafficAnalyticModelsService.deleteById(modelId, company_id)
  returnResult(ctx, res)
}

export default {
  getModels,
  createModel,
  updateModel,
  deleteModel
}
