import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.35'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }


    // 检查列是否存在
    const has_params = await checkAttributeExists(db, transaction, 'sugo_market_brain_events', 'params')
    if (!has_params) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_market_brain_events',
        'params',
        {
          type: db.Sequelize.JSON,
          defaultValue: null
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_usergroup_title = await checkAttributeExists(db, transaction, 'sugo_market_brain_task_executions', 'usergroup_title')
    if (!has_usergroup_title) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_market_brain_task_executions',
        'usergroup_title',
        {
          type: db.Sequelize.INTEGER,
          defaultValue: null
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_send_channel = await checkAttributeExists(db, transaction, 'sugo_market_brain_task_executions', 'send_channel')
    if (!has_send_channel) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_market_brain_task_executions',
        'send_channel',
        {
          type: db.Sequelize.STRING(100),
          defaultValue: null
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_msgid = await checkAttributeExists(db, transaction, 'sugo_market_brain_task_details', 'msgid')
    if (!has_msgid) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_market_brain_task_details',
        'msgid',
        {
          type: db.Sequelize.STRING(100),
          defaultValue: null
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_openid = await checkAttributeExists(db, transaction, 'sugo_market_brain_task_details', 'openid')
    if (!has_openid) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_market_brain_task_details',
        'openid',
        {
          type: db.Sequelize.STRING(100),
          defaultValue: null
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
