import {log} from '../utils/log'

export default async db => {
  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }
    // 删除路由 /access/create
    await db.Route.destroy({
      where: {
        path: {
          $in: ['/app/proj/run-single']
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.8'
    }, transaction)

    await db.Meta.update({
      value: '0.10.8'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.10.8 done')
}
