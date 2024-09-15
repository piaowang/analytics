import { log } from '../utils/log'
import { addColumn } from '../utils/db-utils'

export default async db => {

  const version = '0.19.41'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    // category_id
    await addColumn(db, transaction, 'sugo_livescreen', 'category_id', {
      type: db.Sequelize.STRING(50)
    })
    // authorize_to
    await addColumn(db, transaction, 'sugo_livescreen', 'authorize_to', {
      type: db.Sequelize.JSON
    })
    // status
    await addColumn(db, transaction, 'sugo_livescreen', 'status', {
      type: db.Sequelize.INTEGER
    })
    // cover_mode
    await addColumn(db, transaction, 'sugo_livescreen', 'cover_mode', {
      type: db.Sequelize.INTEGER
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
