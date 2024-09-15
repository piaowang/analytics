import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_track_event_draft ADD code text;',            
    'ALTER TABLE sugo_track_event ADD code text;'  
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.1'
    }, transaction)

    await db.Meta.update({
      value: '0.7.1'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.1 done')
}
