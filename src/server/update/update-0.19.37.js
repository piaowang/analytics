import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.37'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }


    // 检查列是否存在
    const has_params = await checkAttributeExists(db, transaction, 'sugo_dimensions', 'tags_layer')
    if (!has_params) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_dimensions',
        'tags_layer',
        {
          type: db.Sequelize.JSONB,
          defaultValue: []
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
