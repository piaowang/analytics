import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.16.13'
  const arr = [
    'DELETE FROM sugo_role_route where route_id like \'%data-monitors%\';'
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
