/**
 * 用户向导阅读状态的 curd
 * */

import db from '../models'

async function queryOne(where) {
  return await db.SugoUserGuideReadingStates.findOne({
    where
  })
}

async function queryMany(where, other) {
  return await db.SugoUserGuideReadingStates.findAll({
    where,
    ...other
  })
}

async function create(model) {
  let {guide_name, user_id} = model
  guide_name = (guide_name || '').trim()
  if (!guide_name) {
    throw new Error('向导名称不能为空')
  }
  if (!user_id) {
    throw new Error('请先登录')
  }
  return await db.SugoUserGuideReadingStates.create({...model, guide_name})
}

async function updateById(modelId, company_id, model) {
  if ('guide_name' in model) {
    let guide_name = (model.guide_name || '').trim()
    if (!guide_name) {
      throw new Error('名称不能为空')
    }
  }

  if (!model.druid_datasource_id) {
    throw new Error('请先选择模型所属项目')
  }

  return await db.SugoUserGuideReadingStates.update(model, {
    where: {
      id: modelId,
      company_id
    }
  })
}

async function deleteById(modelId, company_id) {
  return await db.SugoUserGuideReadingStates.destroy({
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
