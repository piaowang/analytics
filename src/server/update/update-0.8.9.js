import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TYPE enum_sugo_tags_type ADD VALUE \'track_event\';'
  ]
  //为sugo_track_event，sugo_track_event_draft表 增加tags字段
  let arr1 = [
    'ALTER TABLE sugo_track_event ADD COLUMN tags JSONB default \'[]\'',
    'ALTER TABLE sugo_track_event_draft ADD COLUMN tags JSONB default \'[]\''
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }
    //加入事务之后，会出现 "ALTER TYPE ... ADD 无法在事物块中运行" 错误，所以不加入
    await rawQueryWithTransaction(db, arr)

    await rawQueryWithTransaction(db, arr1, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.8.9'
    }, transaction)

    await db.Meta.update({
      value: '0.8.9'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.8.9 done')
}
