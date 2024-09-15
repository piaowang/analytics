import db from '../models'
import {checkLimit} from '../utils/resouce-limit'
import _ from 'lodash'
import {returnError} from '../utils/helper'

export default {
  getRetentions: async(ctx) => {
    let {id} = ctx.query
    let {user} = ctx.session
    let {company_id, SugoRoles} = user

    // 留存根据数据源权限来限制查询
    let userGroupIdsSet = new Set(SugoRoles.map(r => r.id))
    let permissionDataSourceIds = (await db.SugoDatasources.findAll({
      attributes: ['id', 'role_ids'],
      raw: true
    }))
      .filter(ds => _.some(ds.role_ids, roleId => userGroupIdsSet.has(roleId)))
      .map(ds => ds.id)

    let retensions = await db.SugoRetentions.findAll({
      where: {
        ...(id ? {id} : {}),
        company_id,
        druid_datasource_id: { $in: permissionDataSourceIds }
      },
      order: [ ['updated_at', 'DESC'] ],
      include: [{
        model: db.SugoDatasources,
        attributes: ['name', 'title']
      }]
    })
    ctx.body = retensions
  },

  getDimMeas: async(ctx) => {
    let {user} = ctx.session
    let {company_id} = user
    const datasource_id = ctx.params.id
    const dim = await db.SugoDimensions.findAll({
      where: {
        parentId: datasource_id,
        company_id
      }
    })
    const mea = await db.SugoMeasures.findAll({
      where: {
        parentId: datasource_id,
        company_id
      }
    })
    ctx.body = {
      dim,
      mea
    }
    // }
  },

  createRetention: async(ctx) => {
    let retention = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user
    retention.company_id = company_id
    retention.created_by = id
    await checkLimit(ctx, 'retention')

    let [result, isCreate] = await db.SugoRetentions.findOrCreate({
      where: {
        name: retention.name,
        druid_datasource_id: retention.druid_datasource_id,
        company_id
      },
      defaults: retention
    })
    if (!isCreate) {
      returnError(ctx, '此项目下存在同名的留存，请用别的名称')
      return
    }
    ctx.status = 201
    ctx.body = {
      success: true,
      data: result
    }

  },
  updateRetention: async(ctx) => {
    let slice = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user
    delete slice.company_id
    delete slice.created_by
    slice.updated_by = id
    await db.SugoRetentions.update(slice, {
      where: {
        id: slice.id,
        company_id
      }
    }).then((result) => {
      ctx.status = 200
      ctx.body = {
        success: true,
        data: result
      }
    })

  },
  deleteRetention: async(ctx) => {
    let {user} = ctx.session
    let {company_id} = user
    await db.SugoRetentions.destroy({
      where: {
        id: ctx.q.id,
        company_id
      }
    }).then(result => {
      if (result > 0) {
        ctx.status = 200
        ctx.body = {
          success: true
        }
      } else {
        ctx.status = 200
        ctx.body = {
          success: false
        }
      }

    })
  }

}
