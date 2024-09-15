/**
 * 流量分析的 curd
 * */

import db from '../models'

async function queryOne(where) {
  return await db.SugoTrafficAnalyticModels.findOne({
    where
  })
}

async function queryMany(where, other) {
  return await db.SugoTrafficAnalyticModels.findAll({
    where,
    ...other
  })
}

async function create(model) {
  let {name, druid_datasource_id} = model
  name = (name || '').trim()
  if (!name) {
    throw new Error('名称不能为空')
  }
  if (!druid_datasource_id) {
    throw new Error('请先选择模型所属项目')
  }
  return await db.SugoTrafficAnalyticModels.create({...model, name})
}

async function updateById(modelId, company_id, model) {
  if ('name' in model) {
    let name = (model.name || '').trim()
    if (!name) {
      throw new Error('名称不能为空')
    }
    let existedSameNameModel = await db.SugoTrafficAnalyticModels.findOne({
      where: {
        name,
        company_id
      }
    })
    if (existedSameNameModel && existedSameNameModel.id !== modelId) {
      throw new Error(`存在同名的模型：${name}，请尝试别的名称`)
    }
  }

  if (!model.druid_datasource_id) {
    throw new Error('请先选择模型所属项目')
  }

  return await db.SugoTrafficAnalyticModels.update(model, {
    where: {
      id: modelId,
      company_id
    }
  })
}

async function deleteById(modelId, company_id) {
  return await db.SugoTrafficAnalyticModels.destroy({
    where: {
      id: modelId,
      company_id
    }
  })
}

export default {
  queryOne,
  queryMany,
  create,
  updateById,
  deleteById
}
