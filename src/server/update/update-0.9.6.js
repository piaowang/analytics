import {log} from '../utils/log'
import {dropTables} from '../utils/db-utils'

export default async db => {

  const arr = ['sugo_project_manage', 'sugo_apps_manage']

  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }

    await dropTables(db, arr, t)

    // 删除路由 /access/create
    await db.Route.destroy({
      where: {
        path: {
          $in: ['/access/create']
        }
      },
      ...transaction
    })

    log('ok')

    await db.Meta.update({
      value: '0.9.6'
    }, {
      where: {
        name: 'version'
      }
    })
  })

  log('update 0.9.6 done')
}
