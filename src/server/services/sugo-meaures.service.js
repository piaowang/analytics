/**
 * 指标的curd，
 * 暂时是满足monitor-loop.service.js使用，所以只有简单的查询和删除
 * sugo-measures.controller.js里面并没有使用，以后可能会引用，不过需要补充其他方法以满足需求
 */

import db from '../models'

async function queryOne(where) {
  return await db.SugoMeasures.findOne({
    where
  })
}

async function queryMany(where, other) {
  return await db.SugoMeasures.findAll({
    where,
    ...other
  })
}

async function deleteById(measureId, company_id) {
  return await db.SugoMeasures.destroy({
    where: {
      id: measureId,
      company_id
    }
  })
}

export async function getMeasuresByIds(measureIds) {
  return await db.SugoMeasures.findAll({
    where: {
      id: {$in: measureIds}
    },
    raw: true
  })
}

export async function getMeasuresByNames(dsId, names) {
  return await db.SugoMeasures.findAll({
    where: {
      parentId: dsId,
      ...(names ? {name: {$in: names}} : {})
    },
    raw: true
  })
}

export default {
  queryOne,
  queryMany,
  deleteById,
  getMeasuresByIds
}
