import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.25'
  const arr = [
    'alter table "sugo_data_apis" add "type" INTEGER default 0;',
    'alter table "sugo_projects" alter column "name" set data type VARCHAR(50);'
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
