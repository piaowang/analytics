import { log } from '../utils/log'
import {rawQuery} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_user ALTER column "username" type character varying(100);'
  ]

  await rawQuery(db, arr)

  await db.Meta.update({
    value: '0.5.8'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.8 done')
}
