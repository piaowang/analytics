import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  //为sugo_app_version 增加status字段
  let arr1 = [
    'ALTER TABLE sugo_sdk_page_info_draft ADD COLUMN category varchar(50)',
    'ALTER TABLE sugo_sdk_page_info ADD COLUMN category varchar(50)',
    'ALTER TABLE sugo_track_event_draft ADD COLUMN cross_page boolean',
    'ALTER TABLE sugo_track_event_draft ADD COLUMN binds JSONB ',
    'ALTER TABLE sugo_track_event ADD COLUMN cross_page boolean',
    'ALTER TABLE sugo_track_event ADD COLUMN binds JSONB '
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    await rawQueryWithTransaction(db, arr1, t)
    await db.Meta.create({
      name: 'update-log',
      value: '0.16.0'
    }, transaction)

    await db.Meta.update({
      value: '0.16.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.16.0 done')
}
