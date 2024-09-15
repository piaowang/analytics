import { log } from '../utils/log'

export default async db => {
  
  await db.client.transaction(async t => {
    
    const transaction = {
      transaction: t
    }

    // 删除权限
    const routes = await db.Route.findAll({
      where: {
        path: {
          $in: [
            '/console/user-action-analytics/:sliceId'
          ]
        }
      }
    })
    
    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: routes.map(r => r.id)
        }
      },
      ...transaction
    })

    await db.Meta.update({
      value: '0.9.9'
    }, {
      where: {
        name: 'version'
      }
    })
  })
  
  log('update 0.9.9 done')
}
