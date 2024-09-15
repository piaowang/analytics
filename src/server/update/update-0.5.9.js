import { log } from '../utils/log'
import {rawQuery} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_user ADD "cellphone" character varying(24);'
  ]

  await rawQuery(db, arr)

  await db.Meta.update({
    value: '0.5.9'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.9 done')
}
