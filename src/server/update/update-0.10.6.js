import { log } from '../utils/log'
import {rawQuery} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_dimensions ADD COLUMN params JSONB default \'{}\''
  ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    try {
      await rawQuery(db, arr)
    } catch(e) {
      log(e)
      log('raw query error, but maybe it is ok.')
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.6'
    }, transaction)

    await db.Meta.update({
      value: '0.10.6'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.10.6 done')
}
