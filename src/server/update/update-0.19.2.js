import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.2'
  const arr = [
    'ALTER TABLE sugo_projects ADD COLUMN ignore_sync_dimension JSONB DEFAULT \'[]\';'
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
