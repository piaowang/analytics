import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.39'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }


    // 检查列是否存在
    const has_role_status = await checkAttributeExists(db, transaction, 'sugo_role', 'status')
    if (!has_role_status) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_role',
        'status',
        {
          type: db.Sequelize.INTEGER,
          defaultValue: 1
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_user_status = await checkAttributeExists(db, transaction, 'sugo_user', 'status')
    if (!has_user_status) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_user',
        'status',
        {
          type: db.Sequelize.INTEGER,
          defaultValue: 1
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_user_efficacy_at = await checkAttributeExists(db, transaction, 'sugo_user', 'efficacy_at')
    if (!has_user_efficacy_at) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_user',
        'efficacy_at',
        {
          type: db.Sequelize.DATE
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_user_loss_efficacy_at = await checkAttributeExists(db, transaction, 'sugo_user', 'loss_efficacy_at')
    if (!has_user_loss_efficacy_at) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_user',
        'loss_efficacy_at',
        {
          type: db.Sequelize.DATE
        },
        transaction
      )
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
