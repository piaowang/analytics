import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.16.14'
  const arr = [
    'ALTER TABLE IF EXISTS sugo_track_event_draft ADD COLUMN similar_path TEXT DEFAULT NULL',
    'ALTER TABLE IF EXISTS sugo_track_event ADD COLUMN similar_path TEXT DEFAULT NULL'
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
