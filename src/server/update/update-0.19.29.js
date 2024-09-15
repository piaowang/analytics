import { log } from '../utils/log'
import {checkColumnExists, rawQueryWithTransaction} from '../utils/db-utils'
import _ from 'lodash'

export default async db => {

  const version = '0.19.29'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
  
    // 这个列已存在表示数据表是先同步再进行数据库升级，无需重复插入
    let has_copy_from_project_id = await checkColumnExists(db, t, 'sugo_dashboard_category', 'copy_from_project_id')
    let has_copy_from_project_id_in_map = await checkColumnExists(db, t, 'sugo_dashboard_category_map', 'copy_from_project_id')
  
    const arr = [
      'alter table sugo_data_apis add COLUMN tags JSONB default \'[]\';',
      'ALTER TABLE dashboards ADD copy_from_project_id VARCHAR (32);',
      'ALTER TABLE dashboard_slices ADD copy_from_project_id VARCHAR (32);',
      'ALTER TABLE slices ADD copy_from_project_id VARCHAR (32);',
      has_copy_from_project_id ? '' : 'ALTER TABLE sugo_dashboard_category ADD copy_from_project_id VARCHAR (32);',
      has_copy_from_project_id_in_map ? '' : 'ALTER TABLE sugo_dashboard_category_map ADD copy_from_project_id VARCHAR (32);'
    ].filter(_.identity)
    await rawQueryWithTransaction(db, arr, t)
    
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
