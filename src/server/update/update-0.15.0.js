import {log} from '../utils/log'

export default async db => {
  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }

    let toDel = [
      'get#/console/gallery',
      'get#/console/gallery/new',
      'get#/console/gallery/:id/edit'
    ]

    await db.SugoRoleRoute.update({
      route_id: 'get#/console/project/access/create'
    }, {
      where: {
        route_id: 'post#/app/project/create'
      },
      ...transaction
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: toDel
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.15.0'
    }, transaction)

    await db.Meta.update({
      value: '0.15.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.15.0 done')
}
