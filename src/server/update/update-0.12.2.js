import {log} from '../utils/log'

export default async db => {

  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }

    let route_id = 'get#/console/livefeed'

    await db.SugoRoleRoute.update({
      route_id: 'get#/console/livescreen'
    }, {
      where: {
        route_id
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.12.2'
    }, transaction)

    await db.Meta.update({
      value: '0.12.2'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.12.2 done')
}
