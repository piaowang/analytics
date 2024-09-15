import {log} from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {
  await db.client.transaction(async t => {

    let sqls = [
      'ALTER TABLE public.route ADD class character varying(100);'
    ]

    await rawQueryWithTransaction(db, sqls, t)

    const transaction = {
      transaction: t
    }
    let arr = [
      '/app/role/create',
      '/app/role/update',
      '/app/gallery/share',
      '/console/rfm/:id/new'
    ]

    // 删除权限
    const routes = await db.Route.findAll({
      where: {
        path: {
          $in: arr
        }
      },
      ...transaction
    })

    //删除书签相关
    await db.Route.destroy({
      where: {
        title: {
          $like: '%书签'
        }
      },
      ...transaction
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: routes.map(r => r.id)
        }
      },
      ...transaction
    })

    await db.Route.destroy({
      where: {
        path: {
          $in: [
            '/console/rfm/:id/new',
            '/app/gallery/share'
          ]
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.10'
    }, transaction)

    await db.Meta.update({
      value: '0.10.10'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.10.10 done')
}
