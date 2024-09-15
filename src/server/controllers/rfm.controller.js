/**
 * Created on 14/03/2017.
 */

import db from '../models'
import _ from 'lodash'
import { returnResult } from '../utils/helper'
import { Response } from '../utils/Response'
import { defineTypes, PropTypes } from '../../common/checker'
import { RFMState } from '../../common/constants'

const Checker = {
  RFM: {
    create: defineTypes({
      project_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      params: PropTypes.object.isRequired,
      state: PropTypes.number
    }),
    update: defineTypes({
      id: PropTypes.string.isRequired,
      project_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      params: PropTypes.object.isRequired,
      state: PropTypes.number
    }),
    del: defineTypes({
      id: PropTypes.string.isRequired
    }),
    query: defineTypes({
      id: PropTypes.string.isRequired
    })
  },
  Collection: {
    RFMOfProjects: defineTypes({
      projects: PropTypes.array.isRequired
    })
  }
}

async function getRFMWithPermission (user_id, company_id, role_ids) {
  const order = { order: [['created_at', 'DESC']] }
  const created = await db.SugoRFM.findAll({
    where: {
      created_by: user_id,
      company_id
    },
    ...order
  })
  
  // TODO 分享给用户的
  
  //  const roles = await db.SugoRoleGalleries.findAll({
  //    where: {
  //      role_id: {
  //        $in: role_ids
  //      },
  //      company_id
  //    },
  //    include: [{ model: db.SugoGallery }]
  //  })
  //
  //  const shared = roles.length > 0
  //    ? roles.map(r => r.get({ plain: true }).SugoGallery)
  //    : []
  
  return _.uniqBy(created, 'id')
}

export default {
  create: async ctx => {
    const param = ctx.q
    const check = Checker.RFM.create(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id } = ctx.session.user
    const { project_id, name, params, state = RFMState.Normal } = param
    
    // 同名检测
    const same_name = await db.SugoRFM.findOne({
      where: {
        name,
        project_id,
        company_id
      }
    })
    
    if (same_name) {
      resp.success = false
      resp.message = `${name}已存在`
      return returnResult(ctx, resp.serialize())
    }
    
    // TODO params 参数限制检测，暂时在前端做
    const record = await db.SugoRFM.create({
      project_id,
      company_id,
      name,
      params,
      state,
      created_by: user_id
    })
    
    resp.result = record.get({ plain: true })
    return returnResult(ctx, resp.serialize())
  },
  
  update: async ctx => {
    const param = ctx.q
    const check = Checker.RFM.update(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id } = ctx.session.user
    const { id, project_id, name, params, state } = param
    
    // 是否存在
    const records = await db.SugoRFM.findAll({
      where: {
        id,
        company_id
      }
    })
    
    let record = null
    let r = null
    let same_name = false
    
    for (r of records) {
      if (r.id === id) {
        record = r
      } else if (r.name === name) {
        same_name = true
        break
      }
    }
    
    if (!record) {
      resp.success = false
      resp.message = '未找到记录'
      return returnResult(ctx, resp.serialize())
    }
    
    if (same_name) {
      resp.success = false
      resp.message = `${name}已存在`
      return returnResult(ctx, resp.serialize())
    }
    
    const next = { project_id, name, params, state, updated_by: user_id }
    
    await db.SugoRFM.update(next, { where: { id } })
    
    resp.result = { ...record.get({ plain: true }), ...next }
    return returnResult(ctx, resp.serialize())
  },
  
  del: async ctx => {
    const param = ctx.q
    const check = Checker.RFM.del(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { company_id } = ctx.session.user
    const { id } = param
    await db.SugoRFM.destroy({ where: { id, company_id } })
    
    resp.result = param
    return returnResult(ctx, resp.serialize())
  },
  
  get: async ctx => {
    const param = ctx.q
    const check = Checker.RFM.query(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id, SugoRoles } = ctx.session.user
    const { id } = param
    const records = await getRFMWithPermission(
      user_id,
      company_id,
      SugoRoles.map(r => r.id)
    )
    
    const record = records.find(r => r.id === id)
    
    resp.result = record ? record.get({ plain: true }) : null
    
    return returnResult(ctx, resp.serialize())
  },
  
  getRFMOfProjects: async ctx => {
    const param = ctx.q
    const check = Checker.Collection.RFMOfProjects(param)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = false
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id, SugoRoles } = ctx.session.user
    const { projects } = param
    const records = await getRFMWithPermission(
      user_id,
      company_id,
      SugoRoles.map(r => r.id)
    )
    
    resp.result = records.filter(r => projects.some(pid => pid === r.project_id))
    return returnResult(ctx, resp.serialize())
  }
}
