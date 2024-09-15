
//to del
/*
'/app/dimension/sync/:id'
'/app/dimension/getDruidDims/:name'
*/

import { log } from '../utils/log'

export default async db => {

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    let rs = await db.Route.findAll({
      where: {
        path: {
          $in:[
            '/app/dimension/sync/:id',
            '/app/dimension/getDruidDims/:name'
          ]
        }
      },
      ...transaction
    })

    for(let one of rs) {
      await db.SugoRoleRoute.destroy({
        where: {
          route_id: one.id
        },
        ...transaction
      })
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.9.0'
    }, transaction)

    await db.Meta.update({
      value: '0.9.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.9.0 done')
}
