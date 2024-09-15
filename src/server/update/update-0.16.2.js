import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.16.2'
  const arr = [
    'ALTER TABLE sugo_app_version ALTER COLUMN status SET DEFAULT 1;'
  ]

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

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
