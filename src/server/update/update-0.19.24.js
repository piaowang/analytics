import { log } from '../utils/log'
import {checkAttributeExists} from '../utils/db-utils'

export default async db => {

  const version = '0.19.24'

  /*const arr = [
    'alter table sugo_departments add parent_id varchar(32);',
    'alter table sugo_user add departments jsonb default \'[]\';',
    'alter table sugo_tags add parent_id varchar(32);'
  ]*/

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    
    // await rawQueryWithTransaction(db, arr, t)
    // 检查列是否存在
    const hasParentId = await checkAttributeExists(db, transaction, 'sugo_departments', 'parent_id')
    if (!hasParentId) {
      await db.client.queryInterface.addColumn(
        'sugo_departments',
        'parent_id',
        {
          type: db.Sequelize.STRING(32)
        },
        transaction
      )
    }

    const hasDepartments = await checkAttributeExists(db, transaction, 'sugo_user', 'departments')
    if (!hasDepartments) {
      await db.client.queryInterface.addColumn(
        'sugo_user',
        'departments',
        {
          type: db.Sequelize.JSONB,
          defaultValue: []
        },
        transaction
      )
    }

    const tagHasParentId = await checkAttributeExists(db, transaction, 'sugo_tags', 'parent_id')
    if (!tagHasParentId) {
      await db.client.queryInterface.addColumn(
        'sugo_tags',
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
