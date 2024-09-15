/*
 * 扩群功能
 */
import db from '../models'
import {returnResult, returnError} from '../utils/helper'
import se from '../services/segment-expand.service'

const get = async ctx => {
  let {company_id} = ctx.session.user
  let query = ctx.q
  query.where = query.where || {}
  query.where.company_id = company_id
  query.order = [ ['updated_at', 'DESC'] ]
  let res = await db.SegmentExpand.findAll(query)
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
  let {host} = ctx.local
  let res = await se.update({
    id,
    updateObj,
    host,
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
  let {host} = ctx.local
  let {
    usergroup_id,
    title,
    datasource_id,
    params,
    description
  } = ctx.q
  let res = await se.create({
    usergroup_id,
    created_by,
    title,
    host,
    datasource_id,
    params,
    description,
    company_id
  })

  if (res.error) {
    return returnError(ctx, res.error)
  }

  returnResult(ctx, res)
}

const queryStatus = async ctx => {
  let {company_id} = ctx.session.user
  let {
    id
  } = ctx.q
  let res = await se.queryStatus({id, company_id})
  returnResult(ctx, {
    ...res,
    id
  })
}

const remoteDownload = async ctx => {
  let {company_id} = ctx.session.user
  let {
    id
  } = ctx.q
  let res = await se.queryIds({id, company_id})
  returnResult(ctx, res)
}

const saveAsUsergroup = async ctx => {
  let {user} = ctx.session
  let {
    id, title
  } = ctx.q
  let res = await se.saveAsUsergroup({id, title, user})
  returnResult(ctx, res)
}

export default {
  get,
  del,
  update,
  add,
  remoteDownload,
  saveAsUsergroup,
  queryStatus
}
