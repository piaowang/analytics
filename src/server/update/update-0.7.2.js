import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'DROP TYPE IF EXISTS enum_sugo_measure_pattern;',
    'CREATE TYPE "enum_sugo_measure_pattern" AS ENUM(\'none\', \'.2%\', \'.2\', \'.4\');',
    'ALTER TABLE "sugo_measures" ADD COLUMN "pattern" "enum_sugo_measure_pattern" DEFAULT \'none\''
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.2'
    }, transaction)

    await db.Meta.update({
      value: '0.7.2'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.2 done')
}
