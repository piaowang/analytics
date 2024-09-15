import { log } from '../utils/log'
import { addColumn, checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.45'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    // category_id
    //重命名字段
    let has = await checkAttributeExists(db, transaction, 'sugo_user', 'suggestion')
    if (!has) {
      await addColumn(db, transaction, 'sugo_user', 'suggestion', {
        type: db.Sequelize.STRING(500)
      })
    }

    has = await checkAttributeExists(db, transaction, 'sugo_user', 'status')
    if (!has) {
      await addColumn(db, transaction, 'sugo_user', 'audit_status', {
        type: db.Sequelize.INTEGER,
        defaultValue: 1
      })
    }

    has = await checkAttributeExists(db, transaction, 'sugo_role', 'suggestion')
    if (!has) {
      await addColumn(db, transaction, 'sugo_role', 'suggestion', {
        type: db.Sequelize.STRING(500)
      })
    }

    has = await checkAttributeExists(db, transaction, 'sugo_role', 'status')
    if (!has) {
      await addColumn(db, transaction, 'sugo_role', 'audit_status', {
        type: db.Sequelize.INTEGER,
        defaultValue: 1
      })
    }

    has = await checkAttributeExists(db, transaction, 'sugo_institutions', 'suggestion')
    if (!has) {
      await addColumn(db, transaction, 'sugo_institutions', 'suggestion', {
        type: db.Sequelize.STRING(500)
      })
    }

    has = await checkAttributeExists(db, transaction, 'sugo_institutions', 'check_status')
    if (!has) {
      await addColumn(db, transaction, 'sugo_institutions', 'check_status', {
        type: db.Sequelize.INTEGER
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
