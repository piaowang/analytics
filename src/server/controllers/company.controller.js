/*
 * 路径分析功能
 */
import {returnResult} from '../utils/helper'
import se from '../services/company.service'

const get = async ctx => {
  se.checkPermission(ctx)
  let res = await se.find(ctx.q)
  returnResult(ctx, res)
}

const del = async ctx => {
  se.checkPermission(ctx)
  let {id} = ctx.q
  let res = await se.del({
    id
  })
  returnResult(ctx, res)
}

const update = async ctx => {
  se.checkPermission(ctx)
  let {id: updated_by} = ctx.session.user
  let {id, update: updateObj} = ctx.q
  let res = await se.update({
    id,
    updateObj,
    updated_by
  })
  returnResult(ctx, {
    ...res,
    id
  })
}

const add = async ctx => {
  se.checkPermission(ctx)
  let {id: created_by} = ctx.session.user
  let {q} = ctx
  let res = await se.create({
    ...q,
    created_by
  })

  returnResult(ctx, res)
}

export default {
  get,
  del,
  update,
  add
}
