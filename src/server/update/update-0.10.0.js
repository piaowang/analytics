import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  //为sugo_datasources 增加parent_id和filter字段
  //为sugo_projects 增加parent_id字段
  let arr1 = [
    'ALTER TABLE sugo_datasources ADD COLUMN filter JSONB default \'{}\'',
    'ALTER TABLE sugo_datasources ADD COLUMN parent_id character varying(32)',
    'ALTER TABLE sugo_projects ADD COLUMN parent_id character varying(32)'
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr1, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.0'
    }, transaction)

    await db.Meta.update({
      value: '0.10.0'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.10.0 done')
}
