import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.20'
  const arr = [
    'ALTER TABLE sugo_sdk_page_info ADD COLUMN is_submit_point boolean default false;',
    'ALTER TABLE sugo_sdk_page_info_draft ADD COLUMN is_submit_point  boolean default false;'
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
