import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_datasources ALTER column "taskId" type character varying(100);'
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.0'
    }, transaction)

    await db.Meta.update({
      value: '0.7.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.0 done')
}
