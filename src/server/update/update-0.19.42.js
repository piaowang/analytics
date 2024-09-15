import { log } from '../utils/log'
import { addColumn } from '../utils/db-utils'

export default async db => {

  const version = '0.19.42'

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    // 状态
    await addColumn(db, transaction, 'sugo_livescreen_role', 'status', {
      type: db.Sequelize.INTEGER
    })
    // 授权类型
    await addColumn(db, transaction, 'sugo_livescreen_role', 'type', {
      type: db.Sequelize.INTEGER
    })
    // 大屏id
    await addColumn(db, transaction, 'sugo_livescreen_role', 'livescreen_id', {
      type: db.Sequelize.STRING(32)
    })
    // 创建人
    await addColumn(db, transaction, 'sugo_livescreen_role', 'created_by', {
      type: db.Sequelize.STRING(32)
    })
    // 修改人
    await addColumn(db, transaction, 'sugo_livescreen_role', 'updated_by', {
      type: db.Sequelize.STRING(32)
    })
   
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
