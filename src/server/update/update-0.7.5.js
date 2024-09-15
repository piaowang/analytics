import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {
  let updatedPattern = [
    {
      from: '.2',
      to: '.2f'
    },{
      from: '.4',
      to: '.4f'
    }
  ]
  //修改enum_sugo_measure_pattern 枚举值
  let arr = updatedPattern.reduce((prev, prop) => {
    return prev.concat([
      `update pg_enum set enumlabel = '${prop.to}' where enumtypid in (SELECT oid from pg_type where typname = 'enum_sugo_measure_pattern') and enumlabel = '${prop.from}';`
    ])
  }, [])

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.5'
    }, transaction)

    await db.Meta.update({
      value: '0.7.5'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.5 done')
}
