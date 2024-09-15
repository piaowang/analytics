import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  //为sugo_app_version 增加status字段
  let arr1 = [
    'ALTER TABLE sugo_projects ADD COLUMN type varchar(50) default \'user-created\''
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    await rawQueryWithTransaction(db, arr1, t)
    await db.Meta.create({
      name: 'update-log',
      value: '0.16.1'
    }, transaction)

    await db.Meta.update({
      value: '0.16.1'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.16.1 done')
}
