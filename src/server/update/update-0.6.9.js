import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_measures ADD COLUMN params JSONB default \'{}\''
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.6.9'
    }, transaction)

    await db.Meta.update({
      value: '0.6.9'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.6.9 done')
}
