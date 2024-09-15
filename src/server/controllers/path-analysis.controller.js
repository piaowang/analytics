/*
 * 路径分析功能
 */
import db from '../models'
import {returnResult, returnError} from '../utils/helper'
import se from '../services/path-analysis.service'

const get = async ctx => {
  let {company_id} = ctx.session.user
  let query = ctx.q
  query.where = query.where || {}
  query.where.company_id = company_id
  query.order = [ ['updated_at', 'DESC'] ],
  query.raw = true
  let res = await db.PathAnalysis.findAll(query)
  returnResult(ctx, res)
}

const del = async ctx => {
  let {company_id} = ctx.session.user
  let {id} = ctx.q
  let res = await se.del({
    id,
    company_id
  })
  returnResult(ctx, res)
}

const update = async ctx => {
  let {company_id, id: updated_by} = ctx.session.user
  let {id, update: updateObj} = ctx.q
  let res = await se.update({
    id,
    updateObj,
    updated_by,
    company_id
  })
  returnResult(ctx, {
    ...res,
    id
  })
}

const add = async ctx => {
  let {company_id, id: created_by} = ctx.session.user
  let {
    title,
    datasource_id,
    params
  } = ctx.q
  let res = await se.create({
    created_by,
    title,
    datasource_id,
    params,
    company_id
  })

  if (res.error) {
    return returnError(ctx, res.error)
  }

  returnResult(ctx, res)
}

const getChart = async ctx => {
  let {query, direction} = ctx.q
  let res = await se.queryChart({query, direction})
  if (res.error) {
    return returnError(ctx, res.error)
  }
  returnResult(ctx, res)
}

export default {
  get,
  del,
  update,
  add,
  getChart
}
