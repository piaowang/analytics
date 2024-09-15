import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'
import {tryJsonParse} from '../../common/sugo-utils'
import _ from 'lodash'

async function doJSONBUpdate(db, model, modelName, props, defaults, transaction) {
  let data = await db[model].findAll({
    attributes: ['id', ...props],
    ...transaction
  })
  data = data.map(d => d.get({ plain: true }))
  let arr = props.reduce((prev, prop) => {
    return prev.concat([
      `ALTER TABLE ${modelName} DROP COLUMN "${prop}"`,
      `ALTER TABLE ${modelName} ADD COLUMN "${prop}" JSONB default '${defaults}'::jsonb`
    ])
  }, [])
  await rawQueryWithTransaction(
    db,
    arr,
    transaction.transaction
  )
  for (let ds of data) {
    let update = props.reduce((prev, curr) => {
      prev[curr] = tryJsonParse(ds[curr])
      return prev
    }, {})
    await db[model].update(update, {
      where: {
        id: ds.id
      },
      ...transaction
    })
  }
}

export default async db => {

  //const  queryInterface = db.client.getQueryInterface()
  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await doJSONBUpdate(db, 'Dashboards', 'dashboards', ['position_json'], '[]', transaction)
    await doJSONBUpdate(db, 'Segment', 'segment', ['params'], '{}', transaction)
    await doJSONBUpdate(db, 'Slices', 'slices', ['params'], '{}', transaction)
    await doJSONBUpdate(db, 'SugoCustomOrders', 'sugo_custom_orders', ['dimensions_order', 'metrics_order'], '[]', transaction)
    await doJSONBUpdate(db, 'SugoDatasources', 'sugo_datasources', ['supervisorJson', 'params'], '{}', transaction)
    await doJSONBUpdate(db, 'SugoFunnels', 'sugo_funnels', ['params'], '{}', transaction)
    await doJSONBUpdate(db, 'SugoPivotMarks', 'sugo_pivot_marks', ['queryParams'], '{}', transaction)
    await doJSONBUpdate(db, 'SugoRetentions', 'sugo_retentions', ['params'], '{}', transaction)
    await doJSONBUpdate(db, 'Log', 'sugo_log', ['body'], '{}', transaction)

    await db.Meta.create({
      name: 'update-log',
      value: '0.6.5'
    }, transaction)

    await db.Meta.update({
      value: '0.6.5'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.6.5 done')
}
