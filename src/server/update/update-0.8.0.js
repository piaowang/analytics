import { log } from '../utils/log'

export default async db => {


  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    //分享单图加入权限控制
    await db.Route.update({
      requirePermission: true
    }, {
      where: {
        path: '/app/slices/share'
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.0'
    }, transaction)

    await db.Meta.update({
      value: '0.8.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.0 done')
}
