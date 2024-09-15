import { log } from '../utils/log'
import {rawQuery} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_data_monitors ADD slice_refresh_dict JSONB default \'{}\';',
    'ALTER TABLE sugo_data_monitors ADD "next_refresh" BIGINT default 0;'
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
      value: '0.10.9'
    }, transaction)

    await db.Meta.update({
      value: '0.10.9'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.10.9 done')
}
