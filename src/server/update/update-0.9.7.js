
import { log } from '../utils/log'

export default async db => {
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    //完全移除
    let query = {
      where: {
        path: {
          $in: [
            '/app/datasource/delete',
            '/app/datasource/create',
            '/app/datasource/get/:id/unActive/:taskId',
            '/app/datasource/get/:id/active',
            '/console/datasource',
            '/app/sdk/desktop/track-events',
            '/api/desktop/track',
            '/app/datasource/access/create'
          ]
        }
      },
      ...transaction
    }
    const routes = await db.Route.findAll(query)

    for (let route of routes) {
      await db.SugoRoleRoute.destroy({
        where: {
          route_id: route.id
        },
        ...transaction
      })
    }

    await db.Route.destroy(query)

    //取消权限
    let query1 = {
      where: {
        path: {
          $in: [
            '/update/:id'
          ]
        }
      },
      ...transaction
    }

    const routes1 = await db.Route.findAll(query1)

    for (let route1 of routes1) {
      await db.SugoRoleRoute.destroy({
        where: {
          route_id: route1.id
        },
        ...transaction
      })
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.9.7'
    }, transaction)
  
    await db.Meta.update({
      value: '0.9.7'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })
  
  log('update 0.9.7 done')
}
