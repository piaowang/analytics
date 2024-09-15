/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-26 17:51:11
 * @description 自定义排序表增加module_id, module_orders字段，可以存储任务模块的排序操作，只需要存储不同的module_id即可
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.18'
  const arr = [
    'ALTER TABLE sugo_custom_orders ADD COLUMN module_id varchar(100) NULL;',
    'ALTER TABLE sugo_custom_orders ADD COLUMN module_orders jsonb DEFAULT \'[]\' NULL;',
    'ALTER TABLE sugo_custom_orders ADD CONSTRAINT module_id_unique UNIQUE (module_id);'
  ]

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    
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
