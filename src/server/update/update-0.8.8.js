
//to del
/*
/console/manage/projects
/console/manage/projects/:projectId/install-sdk
/app/manage/*
*/

import { log } from '../utils/log'

export default async db => {


  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    // 
    /*
    /app/role/get/permissions
    requirePermission: false

    group 用户组 =》 用户组管理
    */

    let r = await db.Route.findOne({
      where: {
        path: '/app/role/get/permissions'
      },
      ...transaction
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: r.id
      },
      ...transaction
    })

    await db.Route.update({
      requirePermission: false
    }, {
      where: { path: '/app/role/get/permissions' },
      ...transaction
    })

    await db.Route.update({
      group: '用户组管理'
    }, {
      where: { group: '用户组' },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.8'
    }, transaction)

    await db.Meta.update({
      value: '0.8.8'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.8 done')
}
