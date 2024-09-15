import {log} from '../utils/log'

export default async db => {
  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: [
            'get#/console/access-tools/create/:id',
            'get#/console/access-tools/edit/:id'
          ]
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.16.6'
    }, transaction)

    await db.Meta.update({
      value: '0.16.6'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.16.6 done')
}
