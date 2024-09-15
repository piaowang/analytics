/*
 * 标签分类
 */
import {returnResult, returnError} from '../utils/helper'
import se from '../services/tag-group.service'
import _ from 'lodash'
import { convertContainsByDBType } from './convert-contains-where'

const get = async ctx => {
  let {company_id, id} = ctx.session.user
  let query = ctx.q
  query.where = query.where || {}
  // 处理多维分析传入的权限ID过滤 兼容mysql
  if (query && query.roleIds) {
    query.where = {
      ...query.where,
      $or: [
        { created_by: id },
        ...query.roleIds.map(roleId => convertContainsByDBType('role_ids', roleId))
      ]
    }
  }
  const tagsFilter = _.get(query.where, 'tags.$contains', '')
  const notTagsFilter = _.get(query.where, '$not.tags.$contains', '')
  if(tagsFilter) {
    query.where = {
      ..._.omit(query.where, ['tags']),
      $and: convertContainsByDBType('tags', tagsFilter)
    }
  } else if(notTagsFilter) {
    query.where['$not'] = {
      ..._.omit(query.where['$not'], ['tags']),
      $and: convertContainsByDBType('tags', notTagsFilter)
    }
  }
  query.where.company_id = company_id
  query.order = [ ['updated_at', 'DESC'] ]
  let res = await se.get(query)
  returnResult(ctx, res)
}

const del = async ctx => {
  let {company_id} = ctx.session.user
  let {ids} = ctx.q
  let res = await se.del({
    ids,
    company_id
  })
  returnResult(ctx, res)
}

const update = async ctx => {
  let {company_id, id: updated_by} = ctx.session.user
  let {id, update: updateObj} = ctx.q
  let res = await se.update({
    id,
    updateObj: _.pick(updateObj, ['title', 'description', 'params', 'type', 'status', 'role_ids']),
    updated_by,
    company_id
  })
  returnResult(ctx, res)
}

const add = async ctx => {
  let {company_id, id: created_by} = ctx.session.user
  let {
    title,
    description,
    params,
    datasource_id,
    type,
    status,
    role_ids
  } = ctx.q
  let res = await se.create({
    created_by,
    title,
    description,
    type,
    params,
    datasource_id,
    company_id,
    status,
    role_ids
  })

  if (res.error) {
    return returnError(ctx, res.error)
  }

  returnResult(ctx, res)
}


export default {
  get,
  del,
  update,
  add
}
