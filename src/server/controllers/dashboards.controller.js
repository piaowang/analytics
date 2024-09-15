import db from '../models'
import {checkLimit} from '../utils/resouce-limit'
import { returnError, returnResult, toJs } from '../utils/helper'
import _ from 'lodash'
import conf from '../config'
import fs from 'fs'
import CryptoJS from 'crypto-js'
import DashboardCategoryMapService from '../services/sugo-dashboard-category-map.service'
import DashboardService from '../services/dashboard.service'
import { convertContainsByDBType } from './convert-contains-where'
import { generate } from 'shortid'
import { AUTHORIZATION_TYPE, AUTHORIZATION_PERMISSIONS_TYPE } from '../../common/constants'
import AuthorizationServices from '../services/sugo-authorization.service'
import Sequelize from 'sequelize'

// https://stackoverflow.com/a/20525865/1745885
function getFiles(dir, files_) {
  files_ = files_ || []
  let files = fs.readdirSync(dir)
  for (let i in files){
    let name = dir + '/' + files[i]
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files_)
    } else {
      files_.push(name)
    }
  }
  return files_
}

const props = ['dashboard_title', 'position_json', 'description', 'datasource_id', 'params', 'category_id']
const sliceQueryOptions = {
  include: [{
    model: db.Slices,
    attributes: ['id', 'slice_name', 'updated_at', 'params', 'datasource_name', 'druid_datasource_id'],
    order: [ ['updated_at', 'DESC'] ],
    include: [{
      model: db.SugoDatasources,
      attributes: ['name', 'title']
    }]
  }]
}

const commonInclude = {
  model: db.Dashboards
}

const {staticDashboardScanPath} = conf.site

let genStaticDashboardStructure = () => !staticDashboardScanPath ? {} : _(getFiles(staticDashboardScanPath))
  .map(str => str.substr(staticDashboardScanPath.length).split('/').filter(_.identity))
  .groupBy(arr => arr[0])
  .mapValues(paths => paths.map(pArr => pArr[1]))
  .value()

let staticDashboardStructure = genStaticDashboardStructure()

let genStaticDashboards = () => {
  staticDashboardStructure = genStaticDashboardStructure()
  return _.keys(staticDashboardStructure).map(dashboardName => {
    return {
      'id': CryptoJS.MD5(dashboardName).toString().substr(0, 10),
      'dashboard_title': dashboardName,
      position_json: staticDashboardStructure[dashboardName].map((sliceName, idx) => {
        return {
          'h': 10,
          'i': CryptoJS.MD5(sliceName).toString().substr(0, 10),
          'w': 4,
          'x': (4 * idx) % 12,
          'y': Math.floor(idx / 3),
          'minH': 3,
          'minW': 3,
          'moved': false,
          'static': false
        }
      }),
      'params': {'allowAddSlicesCrossProjects': true},
      'datasource_id': null,
      'created_by': 'xxx',
      'updated_by': 'xxx',
      'company_id': 'xxx',
      'created_at': '2018-11-19T01:58:10.436Z',
      'updated_at': '2018-11-19T01:58:10.436Z'
    }
  })
}


let genStaticSlices = dsId => _(staticDashboardStructure).mapValues((sliceNames, k) => {
  return sliceNames.map(sliceName => {
    const sliceId = CryptoJS.MD5(sliceName).toString().substr(0, 10)
    return {
      'id': sliceId + '0',
      'dashboard_id': CryptoJS.MD5(k).toString().substr(0, 10),
      'slice_id': sliceId,
      'created_at': '2018-08-14T09:35:53.246Z',
      'updated_at': '2018-08-14T09:35:53.246Z',
      'Slice': {
        'id': sliceId,
        'slice_name': sliceName.replace(/\.\w+$/, ''),
        'updated_at': '2018-08-08T07:20:10.363Z',
        'params': {
          'vizType': 'image',
          'chartExtraSettings': {
            'imageUrl': `/static-dashboard/${encodeURIComponent(k)}/${encodeURIComponent(sliceName)}`
          }
        },
        'datasource_name': null,
        'druid_datasource_id': dsId
      }
    }
  })
}).values().flatten().value()


function checkSliceLimit (slices) {
  const {dashboardSliceLimit} = conf.site
  if (slices.length > conf.site.dashboardSliceLimit) {
    throw new Error(`每个看板不能超过${dashboardSliceLimit}个单图`)
  }
}

async function getOne(id, user) {
  let res = {}
  const { id: created_by, company_id, SugoRoles } = user
  let roleIds = _.map(SugoRoles, r => r.id)
  let dashboard = await db.Dashboards.findOne({
    where: {
      id,
      company_id
    },
    raw: true
  })

  if (!dashboard) throw new Error('看板不存在')
  if (dashboard.created_by === created_by) {
    dashboard.authorization_permissions_type =AUTHORIZATION_PERMISSIONS_TYPE.owner
  } else {
    let authorizationDashboards = await AuthorizationServices.getInstance().getAuthorizationType(AUTHORIZATION_TYPE.dashboard, roleIds)
    if (_.isEmpty(authorizationDashboards)) throw new Error('该看板无权限查看')
    dashboard.authorization_permissions_type = _.get(authorizationDashboards, `${dashboard.id}.type`, 0)
  }

  if (!dashboard) {
    dashboard = await db.SugoRoleDashboard.findOne({
      where: {
        company_id,
        dashboard_id: id
      },
      include: commonInclude
    })
    if (!dashboard) throw new Error('看板不存在')
    dashboard = dashboard.Dashboard
  }

  res.slices = await db.DashboardSlices.findAll({
    where: {
      dashboard_id: id
    },
    include: sliceQueryOptions.include
  })

  let subscribed = await db.SugoSubscribe.findOne({
    where: {
      user_id: created_by,
      dashboard_id: id
    }
  })

  let shareRoles = await db.SugoRoleDashboard.findAll({
    where: {
      dashboard_id: id
    }
  })

  
  dashboard.subscribed = !!subscribed
  dashboard.shareRoles = shareRoles.map(s => s.role_id)

  res.dashboard = dashboard
  return res
}

export default {
  share: async ctx => {
    let {dashboardId, roleIds} = ctx.q
    let {id, company_id} = ctx.session.user

    let q = {
      where: {
        id: dashboardId,
        company_id,
        created_by: id
      }
    }

    if (!dashboardId) {
      return returnError(ctx, '别闹, 这参数不对', 404)
    }

    let hasDashboard = await db.Dashboards.findOne(q)

    if (!hasDashboard) return returnError(ctx, '您无权操作或者资源不存在', 404)

    //check role exist
    if (roleIds.length) {
      let count1 = await db.SugoRole.count({
        where: {
          company_id,
          id: {
            $in: roleIds
          }
        }
      })
      if (count1 !== roleIds.length) return returnError(ctx, '您无权操作或者角色资源不存在，请刷新后重试', 404)
    }

    let sliceIds = hasDashboard.position_json.map(p => p.i)
    let sliceIdOK = await db.Slices.findAll({
      where: {
        created_by: id,
        id: {
          $in: sliceIds
        }
      }
    })

    let okIds = sliceIdOK.map(s => s.id)

    let res = await db.client.transaction(async transaction => {

      //看板
      await db.SugoRoleDashboard.destroy({
        where: {
          dashboard_id: dashboardId,
          company_id
        },
        transaction
      })
      for(let role_id of roleIds) {
        let defaults = {
          dashboard_id: dashboardId,
          company_id,
          role_id
        }
        await db.SugoRoleDashboard.findOrCreate({
          where: defaults,
          defaults,
          transaction
        })
      }

      //单图
      for (let slice_id of okIds) {
        await db.SugoRoleSlice.destroy({
          where: {
            slice_id,
            company_id
          },
          transaction
        })
        for(let role_id of roleIds) {
          let defaults = {
            slice_id,
            company_id,
            role_id
          }
          await db.SugoRoleSlice.findOrCreate({
            where: defaults,
            defaults,
            transaction
          })
        }
      }

    })

    returnResult(ctx, res)
  },
  getOne: async ctx => {

    let did = ctx.params.id
    let {user} = ctx.session
    
    let res = await getOne(did, user)

    returnResult(ctx, res)

  },
  getAll: async ctx => {
    let {user} = ctx.session
    let {company_id, id, SugoRoles} = user
    let query = ctx.q
    query.where = query.where || {}
    query.where.company_id = company_id
    query.where.created_by = id
    if (!query.order) query.order = [ ['updated_at', 'DESC'] ]
    if (query.limit < 999) query.limit = 999
    query.raw = true
    let roleIds = SugoRoles.map(r => r.id)
    let createdByUser = await db.Dashboards.findAll(query)
    // 获取授权信息
    let authorizationDashboardsPermissions = await AuthorizationServices.getInstance().getAuthorizationType(AUTHORIZATION_TYPE.dashboard, roleIds)
    let ids0 = createdByUser.map(d => d.id)
    let ids1 = _.keys(authorizationDashboardsPermissions)
    
    const authorizationDashboards = await db.Dashboards.findAll({ where: {id: {$in: ids1}}, raw: true})
    let ids = [...ids0, ...ids1]
    let dashboards = _.uniqBy([
      ...createdByUser.map(p => {
        return {
          ...p,
          authorization_permissions_type: AUTHORIZATION_PERMISSIONS_TYPE.owner
        }
      }),
      ...authorizationDashboards.map(p => {
        return {
          ...p,
          authorization_permissions_type: _.get(authorizationDashboardsPermissions, p.id, 0)
        }
      })], ds => ds.id)

    let slices = await db.DashboardSlices.findAll({
      where: {
        dashboard_id: {
          $in: ids
        }
      },
      include: sliceQueryOptions.include
    })//.map(d => d.get({ plain: true }))

    let user_id = ctx.session.user.id

    let subscribes = await db.SugoSubscribe.findAll({
      where: {
        user_id: user_id,
        dashboard_id: {
          $in: ids
        }
      }
    })

    let shareRoles = await db.SugoRoleDashboard.findAll({
      where: {
        dashboard_id: {
          $in: ids
        }
      }
    })

    // // 单图列表根据数据源权限来限制查询		
    // let userGroupIdsSet = new Set(roleIds)		
    // let permissionDataSourceIds = (await db.SugoDatasources.findAll({		
    //   attributes: ['id', 'role_ids']		
    // }))		
    // .filter(ds => _.some(ds.role_ids, roleId => userGroupIdsSet.has(roleId)))		
    // .map(ds => ds.id)		
    // let permissionDataSourceIdsSet = new Set(permissionDataSourceIds)		
    // let slicesFilterByDataSourceRole = slices.filter(s => permissionDataSourceIdsSet.has(s.Slice.druid_datasource_id))

    let dsId = _(slices).chain().first().get('Slice.druid_datasource_id').value()
    
    if (!dsId) {
      let ds = await db.SugoDatasources.findOne()
      dsId = ds && ds.id
    }
    
    let result = {
      dashboards: [...genStaticDashboards(), ...dashboards],
      slices: [...genStaticSlices(dsId), ...slices],
      subscribes: subscribes,
      shareRoles
    }

    returnResult(ctx, result)

  },
  update: async ctx => {
    const body = ctx.q
    const id = body.query.where.id
    const slices = body.slices
    checkSliceLimit(slices)
    let {id: updated_by, company_id} = ctx.session.user
    let update = _.pick(
      body.update,
      _.without(props, 'datasource_id')
    )
    update.updated_by = updated_by

    let inst = await db.Dashboards.findOne({
      where: {
        id,
        company_id
      }
    })
    if (!inst) {
      return returnError(ctx, '看板不存在', 404)
    }

    if (update.dashboard_title) {
      let queryCond = {
        where: {
          id: {
            $ne: id
          },
          company_id,
          dashboard_title: update.dashboard_title
        }
      }
      // 非夸项目看板检测重名需加datasource_id条件
      if (_.get(inst, 'params.allowAddSlicesCrossProjects') !== true
      && _.get(update, 'params.allowAddSlicesCrossProjects') !== true
      && body.update.datasource_id) {
        queryCond.where.datasource_id = body.update.datasource_id
      }
      let hasInst = await db.Dashboards.findOne(queryCond)
      if (hasInst) {
        return returnError(ctx, '名字已经存在，请换一个名称')
      }
    }

    let res = await db.client.transaction(async transaction => {
      let query = {
        where: {
          dashboard_id: id
        },
        transaction
      }
      let query1 = {...body.query, transaction: transaction}

      await db.Dashboards.update(update, query1)

      if (slices && slices.length) {
        await db.DashboardSlices.destroy(query)
        for (let slice_id of slices) {
          let q = {
            slice_id,
            dashboard_id: id
          }
          await db.DashboardSlices.findOrCreate({
            where: q,
            defaults: q,
            transaction
          })
        }
      }
      const category_id = update.category_id
      if (category_id) {
        const oldCategory = await DashboardCategoryMapService.getInstance().findOne({ dashboard_id: id }) || {}
        if (!oldCategory.category_id) {
          await DashboardCategoryMapService.getInstance().create({ category_id, dashboard_id: id, company_id, order: 0 },{ transaction })
        } else if (oldCategory.category_id !== category_id) {
          await DashboardCategoryMapService.getInstance().update({ category_id }, { dashboard_id: id }, { transaction })
        }
      }
      return 'ok'
    })
    
    let reslut = {
      reslut: res
    }
    returnResult(ctx, reslut)

  },
  del: async ctx => {
    let body = ctx.q
    const { company_id } = ctx.session.user

    let res = await db.client.transaction(async t => {

      let query = {
        where: {
          dashboard_id: body.query.where.dashboard_id
        },
        transaction: t}
      let query0 = {
        where: {
          id: query.where.dashboard_id
        },
        transaction: t
      }

      await db.SugoRoleDashboard.destroy({
        where: {
          dashboard_id: body.query.where.dashboard_id,
          company_id
        },
        transaction: t
      })
      
      await DashboardCategoryMapService.getInstance().remove({ dashboard_id: body.query.where.dashboard_id }, { transaction: t })

      return db.SugoSubscribe.destroy(query)
        .then(() => {
          return db.DashboardSlices.destroy(query)
        })
        .then(() => {
          return db.Dashboards.destroy(query0)
        })

    })

    returnResult(ctx, res)

  },

  getAllDashboards: async ctx => {
    let { user } = ctx.session
    let { company_id, id } = user
    let { datasource_id } = ctx.q
    try {
      const result = await db.Dashboards.findAll({
        where: {
          $or: [{ datasource_id },convertContainsByDBType('params',{allowAddSlicesCrossProjects: true})],
          company_id
        },
        attributes: ['id', 'dashboard_title', 'params'],
        raw: true
      })
      returnResult(ctx, result)
    } catch (e) {
      returnResult(ctx, [])
    }
  },
  
  add: async ctx => {
    
    let body = ctx.q
    let {id, company_id} = ctx.session.user

    await checkLimit(ctx, 'dashboard')

    let result = await db.client.transaction(async (transaction) => {

      let {dashboard: inst, slices} = body
      checkSliceLimit(slices)
      let dashboard = _.pick(
        inst,
        props
      )
      dashboard.id = generate()
      dashboard.created_by = id
      dashboard.updated_by = id
      dashboard.company_id = company_id
      let q = {
        where: _.pick(dashboard, [
          'dashboard_title',
          'datasource_id'
        ])
      }
      let [created, flag] = await db.Dashboards.findOrCreate(
        {
          ...q,
          defaults: dashboard,
          transaction
        }
      )
      if (!flag) {
        throw new Error('名字已经存在，请换一个名称')
      }
      for (let slice of slices) {
        let def = {
          slice_id: slice,
          dashboard_id: created.id
        }
        await db.DashboardSlices.findOrCreate({
          where: def,
          defaults: def,
          transaction
        })
      }
      const category_id = dashboard.category_id
      if(category_id) {
        await DashboardCategoryMapService.getInstance().create({ category_id, dashboard_id: dashboard.id, company_id, order: 0 },{ transaction })
      }
      return created

    })

    //add to subscribe
    // await db.SugoSubscribe.create({
    //   dashboard_id: result.dashboard.id,
    //   user_id: id
    // })

    returnResult(ctx, result)

  },

  saveCopyAs: async ctx => {
    let body = ctx.q
    const {dashboardId, type} = body
    let {id: userId} = ctx.session.user
    const result = DashboardService.dashboardSaveCopyAs(dashboardId, type, userId)
    ctx.body = {
      sucess: Object.keys(result).length ? false : true,
      result
    }
  }
}
