import { log } from '../utils/log'

export default async db => {

  //const  queryInterface = db.client.getQueryInterface()
  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    let ids = await db.Route.findAll({
      where: {
        path: {
          $in: [
            '/app/usergroup/get/:id',
            '/app/usergroup/create'
          ]
        }
      },
      ...transaction
    })

    ids = ids.map(d => d.id)

    await db.Route.update({
      requirePermission: false
    }, {
      where: {
        id: {
          $in: ids
        }
      }
    })

    await db.Route.update({
      requirePermission: false
    }, {
      where: {
        id: {
          $in: ids
        }
      }
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: ids
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.6.8'
    }, transaction)

    await db.Meta.update({
      value: '0.6.8'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.6.8 done')
}
