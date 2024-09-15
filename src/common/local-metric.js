/**
 * Created by heganjie on 2017/5/20.
 */
import _ from 'lodash'
import {singleDbMetricAdapter} from './temp-metric'

export function dbMetricAdapter(metricName, localMetricModel, dbMetrics, tempMetricDict) {
  let {fromMetrics: [fromMetric], funcName, format} = localMetricModel
  let metricObj = _.find(dbMetrics, dbM => dbM.name === fromMetric)
    || (tempMetricDict[fromMetric] && singleDbMetricAdapter(fromMetric, tempMetricDict[fromMetric]))
    || {}
  return {
    name: metricName,
    title: `${metricObj.title} 的 ${funcName}`,
    pattern: format,
    type: 'local'
  }
}
