import { log } from '../utils/log'

export default async db => {

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    // path: '/usergroup/:usergroupId' 改为 requirePermission: false,

    let toDel = await db.Route.findOne({
      where: {
        path: '/console/usergroup/:usergroupId'
      },
      ...transaction
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: toDel.id
      },
      ...transaction
    })

    await toDel.update({
      requirePermission: false
    }, transaction)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.9'
    }, transaction)

    await db.Meta.update({
      value: '0.7.9'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.9 done')
}
