import {log} from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {
  await db.client.transaction(async transaction => {

    let sqls = [
      'ALTER TABLE sugo_track_event_draft ADD is_global VARCHAR(3) NULL',
      'ALTER TABLE sugo_track_event ADD is_global VARCHAR(3) NULL',
      'ALTER TABLE sugo_app_version ADD last_deployed_on timestamptz'
    ]

    await rawQueryWithTransaction(db, sqls, transaction)

    await db.client.query('update sugo_app_version set "last_deployed_on" = "changed_on"', {transaction})

    await db.Meta.create({
      name: 'update-log',
      value: '0.11.1'
    }, {transaction})

    await db.Meta.update({
      value: '0.11.1'
    }, {
      where: { name: 'version' },
      transaction
    })
  })

  log('update 0.11.1 done')
}
