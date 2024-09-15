/**
 * 默认可选指标定义
 */
import _ from 'lodash'
import {immutateUpdate} from '../../../common/sugo-utils'

let browserFilter = '($event_type == "浏览") and $page_name != "" and $page_name != null'
let browserDepthFormula = '$main.split($session_id, \'sid\').apply(\'cnt\', $main.countDistinct($page_name))'

const descriptionDict = {
  uv: '进行访问的用户数',
  ip: '用户访问时使用的IP地址数',
  pv: '页面的浏览总量',
  vv: '所有访客访问的次数',

  passengerRate: '单次会话中只访问过一个页面的次数/总访问次数',
  clickSum: '所有访客在访问中进行操作点击的总次数',
  durationSum: '所有访客访问页面浏览总时长',

  pageMean: '平均每个会话的浏览量',
  clickMean: '平均每个会话的点击量',
  durationMean: '平均每个会话的页面浏览时长',
  browserDepthMean: '平均每个会话的浏览页面数',

  pvUserMean: '平均每人的浏览量',
  userClickMean: '平均每人的点击量',
  userDurationMean: '平均每人的页面浏览时长',
  browserDepthUserMean: '平均每人的浏览页面数量'
}

const getMetrics = userIdDimName => {
  userIdDimName = userIdDimName || 'distinct_id'
  let metrics = [
    {
      title: '访客数（UV）',
      name: 'uv',
      formula: `$main.countDistinct($${userIdDimName})`,
      pattern: '.0f',
      group: 0
    },
    {
      title: 'IP 数',
      name: 'ip',
      formula: '$main.countDistinct($sugo_ip)',
      pattern: '.0f',
      group: 0
    },
    {
      title: '浏览量(PV)',
      name: 'pv',
      formula: `$main.filter(${browserFilter}).count()`,
      pattern: '.0f',
      group: 0
    },
    {
      title: '访问次数(VV)',
      name: 'vv',
      formula: '$main.countDistinct($session_id)',
      pattern: '.0f',
      group: 0
    },
    {
      title: '跳出率',
      name: 'passengerRate',
      preMetrics: [
        {name: 'vv'},
        {
          name: 'passengerList',
          formula: '$main.split($session_id, "sid").apply("cnt", $main.countDistinct($page_name)).filter(0 < $cnt and $cnt < 2)',
          suppress: true
        }
      ],
      formula: '$passengerList.count()/$vv',
      pattern: '.1%',
      group: 1
    },
    {
      title: '总点击量',
      name: 'clickSum',
      formula: '$main.filter($event_type.is("点击")).count()',
      pattern: '.0f',
      group: 1
    },
    /*{
      title: '总访问时长',
      name: 'durationSum',
      formula: `$main.filter(${browserFilter}).sum($duration)`,
      pattern: 'duration',
      group: 1
    },*/
    {
      title: '平均浏览页数',
      name: 'pageMean',
      preMetrics: [{name: 'pv'}, {name: 'vv'}],
      formula: '$pv/$vv',
      pattern: '.0f',
      group: 2
    },
    {
      title: '平均点击量',
      name: 'clickMean',
      preMetrics: [{name: 'clickSum'}, {name: 'vv'}],
      formula: '$clickSum/$vv',
      pattern: '.0f',
      group: 2
    },
    /*    {
     title: '平均访问时长',
     name: 'durationMean',
     formula: '@durationSum/@vv',
     pattern: 'duration',
     group: 2
     },*/
    {
      title: '平均访问深度',
      name: 'browserDepthMean',
      preMetrics: [
        { name: 'browserDepthList', formula: browserDepthFormula, suppress: true},
        {name: 'vv'}
      ],
      formula: '$browserDepthList.sum($cnt)/$vv',
      pattern: '.0f',
      group: 2
    },
    {
      title: '人均浏览页数',
      name: 'pvUserMean',
      preMetrics: [{name: 'pv'}, {name: 'uv'}],
      formula: '$pv/$uv',
      pattern: '.0f',
      group: 3
    },
    {
      title: '人均点击量',
      name: 'userClickMean',
      preMetrics: [{name: 'clickSum'}, {name: 'uv'}],
      formula: '$clickSum/$uv',
      pattern: '.0f',
      group: 3
    },
    /*    ,{
     title: '人均访问时长',
     name: 'userDurationMean',
     formula: '@durationSum/@uv',
     pattern: 'duration',
     group: 3
     },*/
    {
      title: '人均访问深度',
      name: 'browserDepthUserMean',
      preMetrics: [{name: 'browserDepthList', formula: browserDepthFormula, suppress: true}, {name: 'uv'}],
      formula: '$browserDepthList.sum($cnt)/$uv',
      pattern: '.0f',
      group: 3
    }
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

  return metrics.map(fillPreMetrics).map(mo => ({...mo, description: descriptionDict[mo.name]}))
}



export default getMetrics
