/**
 * 组合标签实现授权功能
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.15'
  const arr = [
    'ALTER TABLE sugo_track_event ALTER column "event_bindings_version" type BIGINT;',
    'ALTER TABLE sugo_sdk_page_categories ALTER column "event_bindings_version" type BIGINT;',
    'ALTER TABLE sugo_sdk_page_info ALTER column "event_bindings_version" type BIGINT;',
    'ALTER TABLE sugo_app_version ALTER column "event_bindings_version" type BIGINT;'
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
