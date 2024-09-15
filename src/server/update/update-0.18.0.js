import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.18.0'
  const arr = [
    'ALTER TABLE sugo_projects ADD COLUMN tag_datasource_name varchar(50);',
    'ALTER TABLE sugo_datasources ADD COLUMN tag_datasource_name varchar(50);',
    'ALTER TABLE sugo_datasources ADD COLUMN tag_task_id varchar(100);',
    'ALTER TABLE sugo_dimensions ADD COLUMN datasource_type varchar(100) DEFAULT \'default\';'
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
