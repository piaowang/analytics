import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {
  
  //为sugo_app_version 增加status字段  
  let arr1 = [    
    'ALTER TABLE sugo_app_version ADD COLUMN status INT DEFAULT 1'
  ]
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    
    await rawQueryWithTransaction(db, arr1, t)    
    
    await db.AppVersion.update(
      {
        status: 1
      },
      {
        where: { id: { $ne: null } },
        ...transaction
      }
    )

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.2'
    }, transaction)

    await db.Meta.update({
      value: '0.10.2'
    }, {
      where: { name: 'version' },
      ...transaction
    })

  })
  
  log('update 0.10.２ done')
}
