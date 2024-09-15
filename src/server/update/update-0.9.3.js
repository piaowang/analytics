
import { log } from '../utils/log'

export default async db => {
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    let query = {
      where: {
        path: {
          $in: [
            '/console/slices/new',
            '/console/slices/:sliceId'
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
  
    await db.Meta.create({
      name: 'update-log',
      value: '0.9.3'
    }, transaction)
  
    await db.Meta.update({
      value: '0.9.3'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })
  
  log('update 0.9.3 done')
}
