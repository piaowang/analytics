import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.40'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    // changeColumn(tableName: string, attributeName: string, dataTypeOrOptions: object, options: object):

    // 检查列是否存在
    const has_params_dimensions_name = await checkAttributeExists(db, transaction, 'sugo_dimensions', 'name')
    if (has_params_dimensions_name) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.changeColumn(
        'sugo_dimensions',
        'name',
        {
          type: db.Sequelize.STRING(255) 
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_params_dimensions_title = await checkAttributeExists(db, transaction, 'sugo_dimensions', 'title')
    if (has_params_dimensions_title) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.changeColumn(
        'sugo_dimensions',
        'title',
        {
          type: db.Sequelize.STRING(255) 
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_params_dictionary_title = await checkAttributeExists(db, transaction, 'sugo_tag_dictionary', 'title')
    if (has_params_dictionary_title) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.changeColumn(
        'sugo_dimensions',
        'title',
        {
          type: db.Sequelize.STRING(255) 
        },
        transaction
      )
    }

    // 检查列是否存在
    const has_params_dictionary_name = await checkAttributeExists(db, transaction, 'sugo_tag_dictionary', 'name')
    if (has_params_dictionary_name) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.changeColumn(
        'sugo_dimensions',
        'name',
        {
          type: db.Sequelize.STRING(255) 
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