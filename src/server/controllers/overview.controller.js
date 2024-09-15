import db from '../models'
import {returnResult} from '../utils/helper'
import _ from 'lodash'

const sliceQueryOptions = {
  include: [{
    model: db.Slices,
    attributes: ['id', 'slice_name', 'updated_at', 'params', 'datasource_name', 'druid_datasource_id', 'created_by'],
    order: [ ['updated_at', 'DESC'] ],
    include: [{
      model: db.SugoDatasources,
      attributes: ['name', 'title']
    }]
  }, {
    model: db.SugoGallery,
    attributes: ['id', 'name', 'updated_at', 'parent_id'],
    order: [ ['updated_at', 'DESC'] ],
    include: [{
      model: db.SugoProjects,
      attributes: ['name', 'datasource_id']
    }]
  }]
}

export default {

  getAll: async ctx => {
    let {user} = ctx.session
    let {company_id} = user
    let query = ctx.q.query || {}
    let idOnly = ctx.q.idOnly
    query.where = query.where || {}
    query.where.company_id = company_id
    if (!query.order) query.order = [ ['updated_at', 'DESC'] ]
    query = idOnly ? query : {
      ...query,
      include: sliceQueryOptions.include
    }
    let overviews = await db.SugoOverview.findAll(query)
    returnResult(ctx, overviews)
  },

  del: async ctx => {
    let {user} = ctx.session
    let {company_id} = user
    let query = ctx.q
    query.where = query.where || {}
    query.where.company_id = company_id
    let res = await db.SugoOverview.destroy(query)
    returnResult(ctx, res)

  },

  add: async ctx => {
    let {user} = ctx.session
    let {company_id, id} = user
    let query = ctx.q
    query.where = query.where || {}
    query.where.company_id = company_id

    let [overview] = await db.SugoOverview.findOrCreate({
      ...query,
      defaults: {...query.where, created_by: id}
    })

    returnResult(ctx, overview)

  },

  getLayout: async ctx => {
    let {datasource_id} = ctx.params
    let {id: user_id, company_id} = ctx.session.user
    let inst = await db.SugoUserOverviewSetting.findOne({
      where: {
        datasource_id,
        user_id,
        company_id
      }
    })
    returnResult(ctx, _.get(inst, 'layouts') || [])
  },

  updateLayout: async ctx => {
    let {datasource_id} = ctx.params
    let {layout = []} = ctx.q
    let {id: user_id, company_id} = ctx.session.user
    let inst = await db.SugoUserOverviewSetting.findOne({
      where: {
        datasource_id,
        user_id,
        company_id
      }
    })
    let res
    if (!inst) {
      res = await db.SugoUserOverviewSetting.create({
        datasource_id,
        user_id,
        company_id,
        layouts: layout
      })
    } else {
      res = await db.SugoUserOverviewSetting.update({
        layouts: layout
      }, {
        where: {
          id: inst.id
        }
      })
    }
    returnResult(ctx, res)
  }
}
