/**
 * 组合标签实现授权功能
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.13'
  const arr = [
    'alter table sugo_track_event add class_attr JSONB default \'[]\';',
    'alter table sugo_track_event_draft add  class_attr JSONB default \'[]\';'
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
