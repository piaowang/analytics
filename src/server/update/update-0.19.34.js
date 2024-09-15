import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.34'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }


    // 检查列是否存在
    const has_category = await checkAttributeExists(db, transaction, 'sugo_task', 'category_id')
    const has_parent  = await checkAttributeExists(db, transaction, 'sugo_task_category', 'parent_id')
    const has_group_id  = await checkAttributeExists(db, transaction, 'sugo_task', 'task_group_id')
    const has_group_parent = await checkAttributeExists(db, transaction, 'sugo_task_group_category', 'parent_id')
    if (!has_category) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_task',
        'category_id',
        {
          type: db.Sequelize.STRING(32)
        },
        transaction
      )
    }
    if (!has_parent) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_task_category',
        'parent_id',
        {
          type: db.Sequelize.STRING(32)
        },
        transaction
      )
    }  
    if (!has_group_id) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_task',
        'task_group_id',
        {
          type: db.Sequelize.STRING(32)
        },
        transaction
      )
    }
    if (!has_group_parent) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_task_group_category',
        'parent_id',
        {
          type: db.Sequelize.STRING(32)
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
