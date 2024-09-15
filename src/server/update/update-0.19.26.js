import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.26'
  const arr = [
    'alter table "sugo_offline_calc_tables" alter column "id" set data type VARCHAR(128);',
    'alter table "sugo_offline_calc_tables" alter column "name" set data type VARCHAR(128);'
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
