import { log } from '../utils/log'
import { addColumn } from '../utils/db-utils'

export default async db => {

  const version = '0.19.31'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }

    await addColumn(db, transaction, 'sugo_data_apis', 'tags', {
      type: db.Sequelize.JSONB,
      defaultValue: []
    })

    await addColumn(db, transaction, 'slices', 'tags', {
      type: db.Sequelize.JSONB,
      defaultValue: []
    })

    await addColumn(db, transaction, 'slices', 'notes', {
      type: db.Sequelize.STRING(255),
      defaultValue: ''
    })

    await addColumn(db, transaction, 'slices', 'author', {
      type: db.Sequelize.STRING(50),
      defaultValue: ''
    })

    await addColumn(db, transaction, 'sugo_sharings', 'tags', {
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
