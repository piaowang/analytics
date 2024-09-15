import { log } from '../utils/log'
import { addColumn, checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.47'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    let has = await checkAttributeExists(db, transaction, 'sugo_examine', 'config_id')
    if (!has) {
      await addColumn(db, transaction, 'sugo_examine', 'config_id', {
        type: db.Sequelize.STRING(50)
      })
    }

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
