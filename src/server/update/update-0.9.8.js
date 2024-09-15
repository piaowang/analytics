import { log } from '../utils/log'

export default async db => {
  
  await db.client.transaction(async t => {
    
    const transaction = {
      transaction: t
    }
    
    // 删除路由
    await db.Route.destroy({
      where: {
        path: {
          $in: [
            '/app/gallery/frame/get/:id',
            '/app/gallery/frame/create',
            '/app/gallery/frame/update',
            '/app/gallery/frame/delete/:id'
          ]
        }
      },
      ...transaction
    })
    
    // 变更路由
    await db.Route.destroy({
      where: {
        path: '/app/gallery/collection/gallery/:parentId'
      },
      ...transaction
    })
    
    // 删除权限
    const routes = await db.Route.findAll({
      where: {
        path: {
          $in: [
            '/console/gallery/:id/edit',
            '/console/gallery/:id/info'
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
    
    log('ok')
    
    await db.Meta.update({
      value: '0.9.8'
    }, {
      where: {
        name: 'version'
      }
    })
  })
  
  log('update 0.9.8 done')
}
