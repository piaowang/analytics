/**
 * 默认可选指标定义
 */
import _ from 'lodash'
import {immutateUpdate} from '../../../common/sugo-utils'

const eventDescDictGen = eventName => ({
  eventCount: `${eventName}事件总量`,
  eventMeanBySession: `平均每个会话的${eventName}量`,
  eventMeanByUser: `平均每人的${eventName}量`,
  durationCount: '总浏览时长',
  durationMeanBySession: '平均每次访问时长',
  durationMeanByUser: '平均每人访问时长'
})

const getMetrics = (userIdDimName = 'distinct_id', eventType) => {
  let metrics = [
    {
      title: `${eventType}量`,
      name: 'eventCount',
      formula: '$main.count()',
      pattern: '.0f',
      group: 0
    },
    {
      title: `平均${eventType}量`,
      name: 'eventMeanBySession',
      preMetrics: [{name: 'eventCount'}],
      formula: '$eventCount/$main.countDistinct($session_id)',
      pattern: '.0f',
      group: 0
    },
    {
      title: `人均${eventType}量`,
      name: 'eventMeanByUser',
      preMetrics: [{name: 'eventCount'}],
      formula: `$eventCount/$main.countDistinct($${userIdDimName})`,
      pattern: '.0f',
      group: 0
    }
    /*    , {
      title: '页面浏览时长',
      name: 'durationCount',
      formula: '$main.sum($duration)',
      pattern: 'duration',
      group: 1
    },
    {
      title: '平均浏览时长',
      name: 'durationMeanBySession',
      formula: '@durationCount/$main.countDistinct($session_id)',
      pattern: 'duration',
      group: 1
    },
    {
      title: '人均浏览时长',
      name: 'durationMeanByUser',
      formula: `@durationCount/$main.countDistinct($${userIdDimName})`,
      pattern: 'duration',
      group: 1
    }*/
  ]

  let metricObjNameDict = _.keyBy(metrics, 'name')

  let fillPreMetrics = metricObj => {
    if (!metricObj.preMetrics) {
      return metricObj
    }
    return immutateUpdate(metricObj, 'preMetrics', prevPreMetrics => {
      return prevPreMetrics.map(mo => {
        return mo.formula
          ? mo
          : _.pick(fillPreMetrics(metricObjNameDict[mo.name]), ['name', 'formula', 'preMetrics'])
      })
    })
  }

  let descDict = eventDescDictGen(eventType)
  return metrics.map(fillPreMetrics).map(mo => ({...mo, description: descDict[mo.name]}))
}



export default getMetrics
