/**
 * 组合标签实现授权功能
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import Sequelize from 'sequelize'

export default async db => {

  const version = '0.19.11'
  const arr = [
    'alter table tag_group add role_ids jsonb default \'[]\';'
  ]
  
  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    
    await rawQueryWithTransaction(db, arr, t)
    
    // 复制数据源权限
    let tagGroupsDistinctDataSourceIds = await db.TagGroup.findAll({
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('datasource_id')) ,'datasource_id']
      ],
      raw: true,
      ...transaction
    })
    for (const record of tagGroupsDistinctDataSourceIds) {
      let {datasource_id: dsId} = record
      let ds = await db.SugoDatasources.findOne({
        where: { id: dsId },
        raw: true,
        ...transaction
      })
      await db.TagGroup.update({
        role_ids: ds.role_ids
      }, {
        where: { datasource_id: dsId },
        ...transaction
      })
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
