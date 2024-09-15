import { log } from '../utils/log'

export default async db => {

  const version = '0.18.5'

  const tableList = [
    { prevName: 'southern_alarm_notify_templates', nextName: 'sugo_alarm_notify_templates' },
    { prevName: 'southern_departments', nextName: 'sugo_departments' }
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    for (let table of tableList) {
      await db.client.query(`drop table if exists ${table.nextName}`, {
        type: db.client.QueryTypes.RAW,
        transaction: t
      })
      await db.client.query(`alter table if exists ${table.prevName} rename to ${table.nextName}`, {
        type: db.client.QueryTypes.RAW,
        transaction: t
      })
    }

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

    log(`update ${version} done`)
  })
}
