import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.17.2'
  const arr = [
    'ALTER TABLE IF EXISTS sugo_track_event ADD COLUMN screenshot_id VARCHAR(50) NULL' ,
    'ALTER TABLE IF EXISTS sugo_track_event_draft ADD COLUMN screenshot_id VARCHAR(50) NULL',
    'UPDATE sugo_track_event SET screenshot_id = id WHERE screenshot IS NOT NULL AND screenshot_id IS NULL ',
    'UPDATE sugo_track_event_draft SET screenshot_id = id WHERE screenshot IS NOT NULL AND screenshot_id IS NULL',
    'INSERT INTO sugo_track_event_screenshot SELECT id, screenshot from sugo_track_event_draft WHERE screenshot IS NOT NULL ',
    'INSERT INTO sugo_track_event_screenshot SELECT id, screenshot from sugo_track_event WHERE screenshot IS NOT NULL ',
    'UPDATE sugo_track_event_draft SET screenshot = NULL WHERE screenshot IS NOT NULL',
    'UPDATE sugo_track_event SET screenshot = NULL WHERE screenshot IS NOT NULL'
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
