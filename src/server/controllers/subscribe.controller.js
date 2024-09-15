import db from '../models'
import {returnResult} from '../utils/helper'
import _ from 'lodash'

export default {

  getAll: async ctx => {
    let {user} = ctx.session
    let {id} = user
    let query = ctx.q.query || {}
    let idOnly = ctx.q.idOnly
    query.where = query.where || {}
    query.where.user_id = id

    let dbSubscribes = await db.SugoSubscribe.findAll(query)

    if (idOnly) {
      ctx.body = {
        subscribes: dbSubscribes
      }
      return
    }

    let sliceIds = dbSubscribes.map(s => s.slice_id).filter(_.identity)
    let dashboardIds = dbSubscribes.map(s => s.dashboard_id).filter(_.identity)

    // 查询订阅了的单图
    let slices = !sliceIds.length ? [] : await db.Slices.findAll({
      where: {
        id: { $in: sliceIds }
      },
      attributes: ['id', 'slice_name', 'updated_at', 'params', 'datasource_name', 'druid_datasource_id']
    })

    // 查询订阅了的看板
    let dashboards = []
    if (dashboardIds.length) {
      let tempDashboards = await db.Dashboards.findAll({
        where: {
          id: {$in: dashboardIds}
        },
        attributes: ['id', 'dashboard_title', 'position_json', 'updated_at'],
        order: [ ['updated_at', 'DESC'] ],
        include: [{
          model: db.DashboardSlices,
          attributes: ['slice_id', 'updated_at'],
          order: [ ['updated_at', 'DESC'] ]
        }]
      })
      let promises = tempDashboards.map(async (d) => {
        let sliceIds = d.DashboardSlices.map(ds => ds.slice_id)
        // let sortedId = _.orderBy(d.position_json, ['y', 'x']).map(l => l.i)
        let dbSlices = await db.Slices.findAll({
          where: {
            id: {$in: sliceIds}
          },
          attributes: ['id', 'slice_name', 'updated_at', 'params', 'datasource_name', 'druid_datasource_id'],
          raw: true
        })
        return {..._.omit(d.toJSON(), 'DashboardSlices'), dbSlices}
      })
      dashboards = await Promise.all(promises)
    }

    ctx.body = {
      subscribes: dbSubscribes,
      slices,
      dashboards
    }
  },

  del: async ctx => {

    let query = ctx.q.query || ctx.q
    query.where.user_id = ctx.session.user.id
    let res = await db.SugoSubscribe.destroy(query)
    ctx.body = {
      reslut: res
    }

  },

  add: async ctx => {

    let body = ctx.q
    let sub = body.subscribe.where || body.subscribe
    sub.user_id = ctx.session.user.id
    let query = {
      where: sub
    }

    //add to subscribe
    let res = await db.SugoSubscribe.findOrCreate({
      ...query,
      defaults: sub
    })

    returnResult(ctx, res)

  }
}
