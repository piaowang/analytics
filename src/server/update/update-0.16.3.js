import {log} from '../utils/log'

export default async db => {
  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }

    await db.SugoRoleRoute.update({
      route_id: 'get#/console/project/create'
    }, {
      where: {
        route_id: 'get#/console/project/access/create'
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.16.3'
    }, transaction)

    await db.Meta.update({
      value: '0.16.3'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.16.3 done')
}
