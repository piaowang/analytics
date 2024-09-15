import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {
  
  //为sugo_datasources 增加parent_id和filter字段
  //为sugo_projects 增加parent_id字段
  let arr1 = [
    'alter table sugo_projects drop column created_at',
    'alter table sugo_projects drop column updated_at',
    'alter table sugo_projects add column created_at timestamptz',
    'alter table sugo_projects add column updated_at timestamptz',
    'alter table sugo_data_analysis drop column created_at',
    'alter table sugo_data_analysis drop column updated_at',
    'alter table sugo_data_analysis add column created_at timestamptz',
    'alter table sugo_data_analysis add column updated_at timestamptz'
  ]
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    
    await rawQueryWithTransaction(db, arr1, t)
    
    // 2017-03-29 18:17:14.864+08
    await db.SugoProjects.update(
      {
        created_at: '2017-03-29 18:17:14.864+08',
        updated_at: '2017-03-29 18:17:14.864+08'
      },
      {
        where: { id: { $ne: null } },
        transaction: t
      }
    )
  
    await db.SugoDataAnalysis.update(
      {
        created_at: '2017-03-29 18:17:14.864+08',
        updated_at: '2017-03-29 18:17:14.864+08'
      },
      {
        where: { id: { $ne: null } },
        transaction: t
      }
    )
    
    await db.Meta.create({
      name: 'update-log',
      value: '0.10.1'
    }, transaction)
    
    await db.Meta.update({
      value: '0.10.1'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })
  
  log('update 0.10.1 done')
}
