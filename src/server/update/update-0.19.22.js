import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.22'
  const arr = [
    'ALTER TABLE "sugo_track_heat_map" Drop constraint IF EXISTS "sugo_track_heat_map_screenshot_id_fkey";'
  ]

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    
    await rawQueryWithTransaction(db, arr, t)
    
    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })
    
    log(`update ${version} done`)
  })
}
