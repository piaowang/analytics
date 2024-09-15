import { log } from '../utils/log'

export default async db => {


  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    // 删除路由
    /*
    /app/gallery/share
    /app/gallery/roles
    */

    let toDels = await db.Route.findAll({
      where: {
        path: {
          $in: [
            '/app/gallery/share',
            '/app/gallery/roles'
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
      value: '0.10.4'
    }, transaction)

    await db.Meta.update({
      value: '0.10.4'
    }, {
      where: { name: 'version' },
      ...transaction
    })

  })

  log('update 0.10.4 done')
}
