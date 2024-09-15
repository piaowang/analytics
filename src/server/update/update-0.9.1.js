
import { log } from '../utils/log'

export default async db => {
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    const result = await db.Route.findAll({
      where: {
        path: {
          $in: [
            '/app/project/run/:project_id',
            '/app/project/stop/:project_id'
          ]
        }
      },
      ...transaction
    })
    
    /**
     * permissions 查询过程
     * 1. 查询 user 所属的 role (sugo_role)
     * 2. 查询 role 所有的 routes (sugo_role_route)
     *
     * 销毁 route 过程
     * 1. 查询 route.id
     * 2. 删除 sugo_role_routes 中所有 route.id 的记录
     */
  
    for (let one of result) {
      await db.SugoRoleRoute.destroy({
        where: {
          route_id: one.id
        },
        ...transaction
      })
    }
  
    await db.Meta.create({
      name: 'update-log',
      value: '0.9.1'
    }, transaction)
  
    await db.Meta.update({
      value: '0.9.1'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })
  
  log('update 0.9.1 done')
}
