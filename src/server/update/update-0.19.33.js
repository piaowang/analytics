import { log } from '../utils/log'
import { addColumn } from '../utils/db-utils'

export default async db => {

  const version = '0.19.33'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }

    await addColumn(db, transaction, 'sugo_data_apis', 'type', {
      type: db.Sequelize.INTEGER,
      defaultValue: 0
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
