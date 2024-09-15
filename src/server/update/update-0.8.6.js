
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

    // 删除路由
    /*
    /app/sdk/device
    /app/sdk/screenshot
    /app/sdk/testevent
    留存图详情
    获取留存指标和维度
    */

    await db.Route.destroy({
      where: {
        path: {
          $like: '/app/manage/%'
        }
      },
      ...transaction
    })

    let toDels = await db.Route.findAll({
      where: {
        path: {
          $in: [
            '/console/manage/projects/:projectId/install-sdk',
            '/console/manage/projects',
            '/console/datasource/access'
          ]
        }
      },
      ...transaction
    })

    
    let ids = toDels.map(d => d.id)

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: ids
        }
      },
      ...transaction
    })

    await db.Route.destroy({
      where: {
        id: {
          $in: ids
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.6'
    }, transaction)

    await db.Meta.update({
      value: '0.8.6'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.6 done')
}
