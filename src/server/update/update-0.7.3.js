import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_track_event_draft ADD advance bool;',            
    'ALTER TABLE sugo_track_event ADD advance bool;'  
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.3'
    }, transaction)

    await db.Meta.update({
      value: '0.7.3'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.3 done')
}
