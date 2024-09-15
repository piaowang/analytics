import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.38'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    // changeColumn(tableName: string, attributeName: string, dataTypeOrOptions: object, options: object):

    // 检查列是否存在
    const has_params = await checkAttributeExists(db, transaction, 'sugo_clone_package', 'task_ids')
    if (has_params) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.changeColumn(
        'sugo_clone_package',
        'task_ids',
        {
          type: db.Sequelize.STRING(800)
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
