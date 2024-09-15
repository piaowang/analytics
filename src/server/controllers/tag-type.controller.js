/*
 * 标签分类
 */
import db from '../models'
import {returnResult, returnError} from '../utils/helper'
import se from '../services/tag-type.service'
import _ from 'lodash'
import {Response} from '../utils/Response'
import { AccessDataType } from '../../common/constants'
import projectServices from '../services/sugo-project.service'

const get = async ctx => {
  let company_id = null
  if(ctx.session?.user){
    company_id = ctx.session.user.company_id
  }
  let query = ctx.q
  query.where = query.where || {}
  
  //未了兼容接口暴露给外部无需登录
  if(company_id){
    query.where.company_id = company_id
  }
  
  // 如果传入的是行为项目datasourceId 则根据行为项目的datasourceId 查询标签项目的标签设置
  let { datasource_id: datasourceId } = query.where
  let project = await projectServices.findByDataSourceId(datasourceId)
  if (project.success && _.get(project, 'result.accessType', '') !== AccessDataType.Tag) {
    const tagProject = await projectServices.findByTagName(_.get(project, 'result.tag_datasource_name', ''))
    if (project.success) {
      datasourceId = _.get(tagProject, 'result.datasource_id', '')
    }
  }
  query.where.datasource_id = datasourceId
  query.order = [ ['updated_at', 'DESC'] ]
  let res = await db.TagType.findAll(query)
  returnResult(ctx, res)
}

const del = async ctx => {
  let {company_id} = ctx.session.user
  let {ids} = ctx.q
  let res = await se.getInstance().del({
    ids,
    company_id
  })
  returnResult(ctx, res)
}

const update = async ctx => {
  let {company_id, id: updated_by} = ctx.session.user
  let {ids, update: updateObj} = ctx.q
  let res = await se.getInstance().update({
    ids,
    updateObj: _.pick(updateObj, ['type', 'dimension_id']),
    updated_by,
    company_id
  })
  returnResult(ctx, {
    ...res,
    ids
  })
}

const add = async ctx => {
  let {company_id, id: created_by} = ctx.session.user
  let {
    type,
    dimension_ids,
    datasource_id
  } = ctx.q
  let res = await se.getInstance().create({
    created_by,
    type,
    dimension_ids,
    datasource_id,
    company_id
  })

  if (res.error) {
    return returnError(ctx, res.error)
  }

  returnResult(ctx, res)
}

/**
 * 更新标签相关表名称操作
 * @deprecated 后端每天会重新创建一张标签明细表和标签字典表
 * @param {string} prefix 旧表名前缀
 * @param {string} userTagName 新用户标签明细表名称
 * @param {string} tagRefName 新标签引用（字典）表名称
 */
const updateTagTable = async ctx => {
  const { prefix, userTagName, tagRefName } = ctx.query
  if (!prefix || !userTagName || !tagRefName) {
    return ctx.body = Response.fail('缺少参数')
  }
  const res = await se.getInstance().updateTagTable({prefix, userTagName, tagRefName})
  return ctx.body = res
}

export default {
  get,
  del,
  update,
  add,
  updateTagTable
}
