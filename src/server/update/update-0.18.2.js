import { log } from '../utils/log'
import _ from 'lodash'
import {mapAwaitAll} from '../../common/sugo-utils'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {
  // 升级 SugoMonitorAlarms.metric_rules 的数据结构
  /**
   * {
       *  metric: '',     // 指标ID
       *  opearator: '',  // 操作符
       *  threshold: 0,   // 阀值
       *  thresholdEnd: 1 // 阀值（end)
       * }
   */
  // to
  /**
   * {
       *  metric: '',     // 指标ID
       *  rules: [{
       *    operator: '',  // 操作符: greaterThan、lessThan、between、exclude
       *    threshold: 0,   // 阀值
       *    thresholdEnd: 1, // 阀值（end)
       *    level: ''       // 等级: info, warning, fatal
       *  }]
       * }
   */

  const version = '0.18.2'
  const arr = [
    'ALTER TABLE sugo_monitor_alarms_histories ADD COLUMN alarm_level varchar(10);'
  ]

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    // 插入 告警等级 到异常记录表
    await rawQueryWithTransaction(db, arr, t)

    // 升级 SugoMonitorAlarms.metric_rules 的数据结构
    let allMonitorAlarms = await db.SugoMonitorAlarms.findAll(transaction)

    await mapAwaitAll(allMonitorAlarms.filter(ma => _.isEmpty(ma.metric_rules.rules)), ma => {
      let {operator, threshold, thresholdEnd, ...rest} = ma.metric_rules
      ma.metric_rules = {
        ...rest,
        rules: [{
          operator,
          threshold,
          thresholdEnd,
          level: 'warning'
        }]
      }
      return ma.save()
    })

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
