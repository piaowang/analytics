import { log } from '../utils/log'

export default async db => {

  //all common=true change to requirePermission false
  let arr1 = await db.Route.findAll({
    where: {
      path: {
        $in: [
          '/app/usergroup/get',
          '/app/usergroup/info',
          '/app/usergroup/get/:id',
          '/app/usergroup/query',
          '/app/datasource/access/get-gzfile',
          '/app/datasource/access/create',
          '/app/datasource/access/getToken/:type',
          '/app/usergroup/get',
          '/app/retention/get',
          '/app/measure/get/:id',
          '/app/dimension/get/:id',
          '/app/retention/get',
          '/app/funnel/get/',
          '/app/funnel/get/:id',
          '/app/role/get',
          '/app/user/get',
          '/app/datasource/get',
          '/console/company-info',
          '/console/track/:token',
          '/console/track/event-list/:version',
          '/livefeed',
          '/app/measure/get/valid/formula',
          '/app/role/get/permissions',
          '/console/manage/projects/:projectId/install-sdk'
        ]
      }
    }
  })

  arr1 = arr1.map(a => a.id)

  let arr2 = await db.Route.findAll({
    where: {
      group: {
        $in: [
          'SDK埋点',
          '用户自定义排序',
          '应用管理',
          '项目管理',
          '看板操作',
          'plyql查询',
          '单图'
        ]
      }
    }
  })

  arr2 = arr2.map(a => a.id)

  let toDel = await db.Route.findAll({
    where: {
      $or: [
        {
          path: '/app/retention/:retentioneId'
        },
        {
          path: '/app/retention/get/getDimMeas/:id'
        },
        {
          path: '/console/retention/:retentioneId'
        }
      ]
    }
  })

  toDel = toDel.map(a => a.id)

  let ids = [...arr1, ...arr2, ...toDel]

  //rm SugoRoleRoute
  let res = await db.SugoRoleRoute.destroy({
    where: {
      route_id: {
        $in: ids
      }
    }
  })

  log('SugoRoleRoute destroy', ids.join(','), 'result:', JSON.stringify(res))

  //change
  await db.Route.update({
    common: false,
    requirePermission: false
  }, {
    where:{
      id: {
        $in: ids
      }
    }
  })

  await db.Route.destroy({
    where: {
      id: {
        $in: toDel
      }
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.6.1'
  })

  await db.Meta.update({
    value: '0.6.1'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.6.1 done')
}
