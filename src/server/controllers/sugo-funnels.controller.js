/**
 * Created by heganjie on 16/8/29.
 */

import db from '../models'
import _ from 'lodash'
import {returnResult, returnError} from '../utils/helper'
import {checkLimit} from '../utils/resouce-limit'

const ctrl = {
  querySugoFunnels: async ctx => {
    let {user} = ctx.session
    let {company_id, SugoRoles} = user
    let q = {
      order: [ ['updated_at', 'DESC'] ],
      attributes: ['id', 'funnel_name', 'druid_datasource_id', 'datasource_name', 'params'],
      where: {
        company_id
      }
    }

    let { id: funnelId } = ctx.params
    if (funnelId) {
      q = _.defaultsDeep({
        where: {
          id: funnelId,
          company_id
        }
      }, q)
    }

    if (ctx.query.name) {
      q = _.defaultsDeep({
        where: {
          funnel_name: ctx.query.name,
          company_id
        }
      }, q)
    } else if (ctx.query.name_contains) {
      q = _.defaultsDeep({
        where: {
          funnel_name: {
            $like: `%${ctx.query.name_contains}%`
          },
          company_id
        }
      }, q)
    }

    if (ctx.query.exclude_id) {
      q = _.defaultsDeep({
        where: {
          id: {
            $ne: ctx.query.exclude_id
          },
          company_id
        }
      }, q)
    }

    // 漏斗根据数据源权限来限制查询
    let userGroupIdsSet = new Set(SugoRoles.map(r => r.id))
    let permissionDataSourceIds = (await db.SugoDatasources.findAll({
      attributes: ['id', 'role_ids']
    }))
      .filter(ds => _.some(ds.role_ids, roleId => userGroupIdsSet.has(roleId)))
      .map(ds => ds.id)

    q = _.defaultsDeep({
      where: {
        druid_datasource_id: {
          $in: permissionDataSourceIds
        }
      }
    }, q)

    let funnels = await db.SugoFunnels.findAll(q)

    returnResult(ctx, funnels)
  },

  createOrUpdateSugoFunnel: async ctx => {
    let sugoFunnel = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user

    let res
    if (sugoFunnel.id) {
      delete sugoFunnel.company_id
      delete sugoFunnel.created_by
      sugoFunnel.updated_by = id
      res = await db.SugoFunnels.update(sugoFunnel, {
        where: {
          id: sugoFunnel.id,
          company_id
        }
      })
    } else {
      // 保存新创建的漏斗
      await checkLimit(ctx, 'funnel')
      sugoFunnel.updated_by = id
      sugoFunnel.created_by = id
      sugoFunnel.company_id = company_id
      res = await db.SugoFunnels.create(sugoFunnel)
    }
    returnResult(ctx, res)
  },
  deleteSugoFunnel: async ctx => {
    let preDelFunnelId = ctx.params.id
    let {user} = ctx.session
    let {company_id} = user
    let res = await db.SugoFunnels.destroy({
      where: {
        id: preDelFunnelId,
        company_id
      }
    })

    returnResult(ctx, res)
  }
}

export default ctrl
