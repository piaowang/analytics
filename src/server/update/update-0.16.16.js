import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.16.16'
  const arr = [
    'ALTER TABLE IF EXISTS segment ADD COLUMN compute_time timestamptz',
    'ALTER TABLE IF EXISTS sugo_projects ADD COLUMN reference_tag_name VARCHAR(25) DEFAULT NULL'
  ]

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    let allSegs = await db.Segment.findAll({
      where: {},
      attributes: ['id', 'created_at', 'updated_at'],
      ...transaction
    })

    for (let seg of allSegs) {
      let {id, created_at, updated_at} = seg
      await db.Segment.update({
        compute_time: updated_at || created_at
      }, {
        where: {
          id
        },
        ...transaction
      })
    }

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
