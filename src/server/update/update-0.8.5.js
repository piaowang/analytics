import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_dimensions ADD COLUMN tags JSONB default \'[]\'',
    'ALTER TABLE sugo_measures ADD COLUMN tags JSONB default \'[]\''
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.5'
    }, transaction)

    await db.Meta.update({
      value: '0.8.5'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.5 done')
}
