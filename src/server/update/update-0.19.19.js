import { log } from '../utils/log'
import {checkColumnExists, rawQueryWithTransaction} from '../utils/db-utils'
import _ from 'lodash'

export default async db => {

  const version = '0.19.19'
  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    // 这个列已存在表示数据表是先同步再进行数据库升级，无需重复插入
    let has_month_active = await checkColumnExists(db, t, 'cutv_custom_report', 'month_active')
    let has_week_active = await checkColumnExists(db, t, 'cutv_custom_report', 'week_active')
  
    const arr = [
      has_month_active ? '' : 'ALTER TABLE cutv_custom_report ADD COLUMN month_active INTEGER;',
      has_week_active ? '' : 'ALTER TABLE cutv_custom_report ADD COLUMN week_active INTEGER;'
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
