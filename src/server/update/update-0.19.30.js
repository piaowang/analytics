import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'
import { rawQueryWithTransaction, addColumn } from '../utils/db-utils'

export default async db => {

  const version = '0.19.30'
  const arr = [
    'ALTER TABLE slices ADD COLUMN tags JSONB default \'[]\';',
    'ALTER TABLE slices ADD COLUMN notes varchar(255) default \'\';',
    'ALTER TABLE slices ADD COLUMN author varchar(50) default \'\';',
    'ALTER TABLE sugo_sharings ADD COLUMN tags JSONB default \'[]\';'
  ]

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    await rawQueryWithTransaction(db, arr, t)

    await addColumn(db, transaction, 'sugo_data_apis', 'tags', {
      type: db.Sequelize.JSONB,
      defaultValue: []
    })

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
