import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import _ from 'lodash'
import dataSourceService from '../services/sugo-datasource.service'
export default async db => {

  //自定义排序加入company_id
  //
  let arr1 = [
    'ALTER TABLE sugo_custom_orders ADD COLUMN company_id character varying(32)',
    'ALTER TABLE sugo_custom_orders ADD COLUMN created_by character varying(32)',
    'ALTER TABLE sugo_custom_orders ADD COLUMN updated_by character varying(32)'
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr1, t)

    let customOrders = await db.SugoCustomOrders.findAll(transaction)

    for(let co of customOrders) {
      let {druid_datasource_id, id, user_id} = co
      let dimensions_order = _.cloneDeep(co.dimensions_order || [])
      let ds = await db.SugoDatasources.findOne({
        id: druid_datasource_id
      })
      if (!ds) continue
      let hideDimensionNames = dimensions_order.filter(d => {
        return _.startsWith(d, 'hide:')
      }).map(d => d.replace(/^hide\:/, ''))

      //所有已经应用的维度取消隐藏
      log('old orders:', dimensions_order.join(','))
      for (let dim of hideDimensionNames) {
        let used = await dataSourceService.checkDimensionUsed({
          datasourceId: druid_datasource_id,
          company_id: ds.company_id,
          dimensionNames: [dim]
        })
        if (!used) continue
        let {taken} = used
        log(`维度${dim}已经被${taken}使用，取消隐藏`)
        let index = _.findIndex(dimensions_order, d => d === `hide:${dim}`)
        log('index:', index)
        dimensions_order.splice(index, 1, dim)
      }
      log('new orders:', dimensions_order.join(','))
      await db.SugoCustomOrders.update({
        company_id: ds.company_id,
        dimensions_order,
        created_by: user_id,
        updated_by: user_id
      }, {
        where: {
          id: id
        },
        ...transaction
      })
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.5'
    }, transaction)
    
    await db.Meta.update({
      value: '0.10.5'
    }, {
      where: { name: 'version' },
      ...transaction
    })
    
  })
  
  log('update 0.10.5 done')
}
