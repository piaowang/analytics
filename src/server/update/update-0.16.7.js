import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import _ from 'lodash'

export default async db => {

  const version = '0.16.7'

  //为sugo_app_version 增加status字段
  let arr1 = [
    'ALTER TABLE dashboards ADD COLUMN datasource_id varchar(32) REFERENCES sugo_datasources(id)'
  ]

  await db.client.transaction(async transaction => {

    await rawQueryWithTransaction(db, arr1, transaction)

    //收集看板里单图的数据源id
    let dashboards = await db.Dashboards.findAll({transaction})

    for (let d of dashboards) {
      let {position_json, id, company_id} = d
      let sliceIds = _.isArray(position_json)
        ? position_json.map(s => s.i)
        : []
      if (sliceIds.length) {
        let slices = await db.Slices.findAll({
          where: {
            id: {
              $in: sliceIds
            },
            company_id
          },
          attributes: ['id', 'druid_datasource_id'],
          transaction
        })
        if (slices.length) {
          let datasource_id = slices[0].druid_datasource_id
          await db.Dashboards.update({
            datasource_id
          }, {
            where: {
              id
            },
            transaction
          })
        }
      }
    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, {transaction})

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      transaction
    })
  })

  log(`update ${version} done`)
}
