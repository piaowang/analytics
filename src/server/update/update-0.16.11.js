import { log } from '../utils/log'
import { rawQuery } from '../utils/db-utils'

export default async db => {

  // 增加检查计数列
  let arr1 = [
    'ALTER TABLE sugo_monitor_alarms_histories ADD COLUMN check_counter int default 0',
    'ALTER TABLE sugo_monitor_alarms ADD COLUMN check_counter int default 0'
  ]

  const version = '0.16.11'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    try {
      // 这里不用事务
      await rawQuery(db, arr1)
    } catch (e) { }
    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log(`update ${version} done`)
}
