/**
 * 组合标签实现授权功能
 */
import { log } from '../utils/log'
import {checkColumnExists, rawQueryWithTransaction} from '../utils/db-utils'
import _ from 'lodash'

export default async db => {

  const version = '0.19.14'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
  
    // 这个列已存在表示数据表是先同步再进行数据库升级，无需重复插入
    let has_parent_id = await checkColumnExists(db, t, 'sugo_dashboard_category', 'parent_id')
    let has_type = await checkColumnExists(db, t, 'sugo_dashboard_category', 'type')
    let has_project_id = await checkColumnExists(db, t, 'sugo_dashboard_category', 'project_id')
  
    const arr = [
      has_parent_id ? '' : 'alter table sugo_dashboard_category add parent_id varchar(32) default \'\';',
      has_type ? '' : 'alter table sugo_dashboard_category add type int default 0 ;',
      has_project_id ? '' : 'alter table sugo_dashboard_category add project_id varchar(32) default \'\' ;'
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
