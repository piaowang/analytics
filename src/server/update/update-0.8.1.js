import { log } from '../utils/log'

export default async db => {


  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    //消灭SugoUserSlice表
    await db.SugoUserSlice.destroy({
      where: {},
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.1'
    }, transaction)

    await db.Meta.update({
      value: '0.8.1'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.1 done')
}
