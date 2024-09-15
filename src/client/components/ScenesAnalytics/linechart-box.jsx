import React, {Component} from 'react'
import {Radio, Select} from 'antd'
import _ from 'lodash'
import TimePicker from '../Common/time-picker'
import {convertDateType, isRelative} from '../../../common/param-transform'
import LineChartAnalysis from './linechart-analysis'
import moment from 'moment'
import AsyncTaskRunner from '../Common/async-task-runner'
import {doQuerySliceData} from '../../common/slice-data-transform'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {dictBy, immutateUpdate, reductions} from '../../../common/sugo-utils'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import {findSuitableGranularity} from '../../../common/druid-query-utils'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'
import {dateFormatterGenerator, granularityToFormat} from '../../common/date-format-util'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const SelectOption = Select.Option

const getPopupContainer = () => document.querySelector('.selecter-flow-scroll')

const ssid = 'session_id'
const distinctIdDimName = 'distinct_id'
const userIdDimName = 'cst_no'

const QueryParams = {
  ScenesBrowse: {
    title:['选择指标','筛选时间'],
    wrapChart: true,
    measureFirst: [ 
      { title: '累计总人数', name: 'accumulateUserCount' },
      { title: '新增用户数', name: 'newUserCount' },
      { title: '活跃人数', name: 'activeUserCount' }
    ],
    measureTime: [
      { title: '小时', name: 'PT1H' },
      { title: '日', name: 'P1D' },
      { title: '周', name: 'P1W' },
      { title: '月', name: 'P1M' }
    ],
    selectBoxTitle: '可选维度',
    showStatisticalBottomMethod: true,
    customQueryFunc: async ({timeRange, selectHourMetric, datasourceCurrent, selectedBusinessDim}) => {
      let {id: druid_datasource_id, name: datasource_name} = datasourceCurrent

      let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
      let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)

      let nonNewUserCountQueryRes = await doQuerySliceData({
        druid_datasource_id,
        datasource_name,
        params: {
          withGlobalMetrics: !selectedBusinessDim,
          dimensions: [ _.get(selectedBusinessDim, 'name') ].filter(_.identity),
          filters: [
            { col: '__time', op: 'lessThan', eq: [since] },
            { col: 'system_name', op: 'in', eq: ['Android', 'iOS', 'iPhone OS'] }
          ],
          customMetrics: [
            { name: 'nonNewUserCount', formula: `$main.countDistinct($${userIdDimName}, "sketch")` }
          ]
        }
      })

      let newUsersQueryResult = await doQuerySliceData({
        druid_datasource_id,
        params: {
          'dimensions': [ _.get(selectedBusinessDim, 'name'), 'first_login_time' ].filter(_.identity),
          'filters': [
            { col: 'first_login_time', op: 'in', eq: timeRange },
            { col: 'system_name', op: 'in', eq: ['Android', 'iOS', 'iPhone OS'] }
          ],
          withGlobalMetrics: false,
          granularity: selectHourMetric,
          'dimensionExtraSettingDict': {
            first_login_time: {
              'sortCol': 'first_login_time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          },
          'customMetrics': [
            {
              'name': 'newUserCount',
              'formula': `$main.filter($${userIdDimName}.isnt("")).countDistinct($${userIdDimName}, "sketch")`
            }
          ],
          'splitType': 'tree'
        }
      })
      let newUserCountDict = selectedBusinessDim
        ? dictBy(_.get(newUsersQueryResult, [0, 'resultSet']),
          d => d[selectedBusinessDim.name],
          d => dictBy(d.first_login_time_GROUP, d => d.first_login_time, d => d.newUserCount))
        : dictBy(_.get(newUsersQueryResult, [0, 'resultSet']), d => d.first_login_time, d => d.newUserCount)


      let activeUsersQueryResult = await doQuerySliceData({
        druid_datasource_id,
        params: {
          withGlobalMetrics: false,
          'dimensions': [ _.get(selectedBusinessDim, 'name'), '__time' ].filter(_.identity),
          'granularity': selectHourMetric,
          'filters': [
            { 'col': '__time', 'op': 'in', 'eq': timeRange },
            { col: 'system_name', op: 'in', eq: ['Android', 'iOS', 'iPhone OS'] }
          ],
          dimensionExtraSettingDict: {
            __time: { 'sortCol': '__time', granularity: selectHourMetric, 'sortDirect': 'asc', 'limit': 100 }
          },
          'customMetrics': [
            { 'name': 'activeUserCount', 'formula': `$main.filter($${userIdDimName}.isnt("")).countDistinct($${userIdDimName}, "sketch")` }
          ],
          'splitType': 'tree'
        }
      })

      return immutateUpdate(activeUsersQueryResult, [0, 'resultSet'], arr => {
        if (selectedBusinessDim) {
          let businessDimName = selectedBusinessDim.name
          let nonNewUserCountDict = dictBy(_.get(nonNewUserCountQueryRes, [0, 'resultSet']), d => d[businessDimName], d => d.nonNewUserCount)
          return (arr || []).map(d0 => {
            return {
              ...d0,
              __time_GROUP: d0.__time_GROUP.map(d1 => ({
                ...d1,
                // 合并新增用户数
                newUserCount: _.get(newUserCountDict, [d0[businessDimName], d1.__time]) || 0
              }))
            }
          }).map(d0 => {
            let newUserCountSumReductions = _.drop(reductions(d0.__time_GROUP, (acc, d1) => acc + d1.newUserCount, 0), 1)
            return ({
              ...d0,
              // 算出累计用户
              __time_GROUP: d0.__time_GROUP.map((d1, idx) => ({
                ...d1,
                // 算出累计用户
                accumulateUserCount: (nonNewUserCountDict[d0[businessDimName]] || 0) + newUserCountSumReductions[idx]
              }))
            })
          })
        }
        let nonNewUserCount = _.get(nonNewUserCountQueryRes, [0, 'nonNewUserCount']) || 0
        return (arr || [])
          .map(o => {
            // 合并新增用户数
            return {...o, newUserCount: newUserCountDict[o.__time] || 0}
          })
          .reduce((acc, o, idx) => {
            // 算出累计用户
            const accumulateUserCount = idx === 0
              ? nonNewUserCount + o.newUserCount
              : _.last(acc).accumulateUserCount + o.newUserCount
            acc.push({...o, accumulateUserCount})
            return acc
          }, [])
      })
    },
    showTimePicker: true
  },
  loanBrowse: {
    title:['选择指标','选择时间'],
    wrapChart: true,
    measureFirst: [
      { title: '申请件数', name: 'loanCount' },
      { title: '申请人数', name: 'loanUserCount' }
    ],
    measureTime:[
      // { title: '小时', name: 'PT1H' },
      { title: '日', name: 'P1D' },
      { title: '周', name: 'P1W' },
      { title: '月', name: 'P1M' }
    ],
    showTimePicker: true,
    customQueryFunc: async ({timeRange, selectHourMetric, datasourceCurrent}) => {
      const res = await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          dimensions: ['__time'],
          granularity: selectHourMetric,
          withGlobalMetrics: false,
          'dimensionExtraSettings': [
            { 'sortCol': '__time', granularity: selectHourMetric, 'sortDirect': 'asc', 'limit': 100 }
          ],
          'filters': [
            { 'col': '__time', 'op': 'in', 'eq': timeRange },
            { 'col': 'event_name', 'op': 'in', 'eq': [ '预约成功' ] },
            { 'col': 'page_name','op': 'in','eq': ['遂心贷']},
            { 'col': 'system_name','op': 'in','eq': ['Android', 'iOS', 'iPhone OS']}
          ],
          'customMetrics': [
            { name: 'loanCount', formula: '$main.filter($cst_no.isnt("")).count()' },
            { name: 'loanUserCount', formula: '$main.countDistinct($cst_no, "sketch")' }
          ]
        }
      })
      return res
    }
  },
  financialBrowse: {
    title:['选择指标','筛选时间'],
    wrapChart: true,
    measureFirst: [
      { title: '累计交易额', name: 'accumulateTradeAmount' },
      { title: '交易笔数', name: 'tradeCount' },
      { title: '交易人数', name: 'tradeUserCount' }
    ],
    measureTime:[
      { title: '小时', name: 'PT1H' },
      { title: '日', name: 'P1D' },
      { title: '周', name: 'P1W' },
      { title: '月', name: 'P1M' }
    ],
    compareOptions: [
      {name: '所有理财存款产品'},
      {name: '金荷花'},
      {name: '幸福存'},
      {name: '定存'}
    ],
    selectBoxTitle: '可选产品',
    showTimePicker: true,
    showStatisticalBottomMethod: true,
    customQueryFunc: async ({timeRange, selectHourMetric, datasourceCurrent, compareOptionValue}) => {
      //TODO 需要优化
      let accumulateTradeAmountCustomMetricsFormula,
        tradeAcountFormula,
        tradeUserCountFormula
      const proCategory_DingCun = '定存'
      if(compareOptionValue === '所有理财存款产品') {
        accumulateTradeAmountCustomMetricsFormula = `$main
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "金荷花" or $pro_category == "幸福存")
        .sum($pro_tran_amt)
         +
         $main
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "${proCategory_DingCun}")
        .sum($pro_tran_amt)`
        tradeAcountFormula = `$main
        .filter($cst_no.isnt(("")))
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "${proCategory_DingCun}")
        .count()+$main
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "金荷花" or $pro_category == "幸福存")
        .count()`
        tradeUserCountFormula = `$main
        .filter($cst_no.isnt(("")))
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "金荷花" or $pro_category == "幸福存")
        .countDistinct($cst_no, "sketch")
        +
        $main
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "${proCategory_DingCun}")
        .countDistinct($cst_no, "sketch")
        `
      } else if (compareOptionValue === '定存') {
        accumulateTradeAmountCustomMetricsFormula = `$main
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "${proCategory_DingCun}")
        .sum($pro_tran_amt)`
        tradeAcountFormula =  `$main
        .filter($cst_no.isnt(("")))
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "${proCategory_DingCun}")
        .count()`
        tradeUserCountFormula = `$main
        .filter($pro_tran_amt.isnt(null))
        .filter($pro_sts == "交易成功")
        .filter($pro_category == "${proCategory_DingCun}")
        .countDistinct($cst_no, "sketch")`
      } else {
        accumulateTradeAmountCustomMetricsFormula = `$main
       .filter($pro_sts == "交易成功")
       .filter($pro_category == "${compareOptionValue}")
       .sum($pro_tran_amt)`
        tradeAcountFormula = `$main
       .filter($pro_tran_amt.isnt(null))
       .filter($pro_sts == "交易成功")
       .filter($pro_category == "${compareOptionValue}")
       .count()`
        tradeUserCountFormula = `$main
       .filter($pro_tran_amt.isnt(("")))
       .filter($pro_tran_amt.isnt(null))
       .filter($pro_sts == "交易成功")
       .filter($pro_category == "${compareOptionValue}")
       .countDistinct($cst_no, "sketch")`
      }
      let accumulateTradeAmountQueryResult = await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          dimensions: [ '__time' ],
          withGlobalMetrics: false,
          'granularity': selectHourMetric,
          'filters': [
            { 'col': '__time', 'op': 'in', 'eq': timeRange }
          ],
          'dimensionExtraSettings': [
            {
              'sortCol': '__time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          ],
          'customMetrics': [
            {
              'name': 'tradeAmount',
              'formula': accumulateTradeAmountCustomMetricsFormula
            }
          ],
          'splitType': 'tree',
          'queryEngine': 'tindex'
        }
      })
      let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
      let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
      let accumulateTradeAmountBeforeSinceQueryResult = await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          'filters': [
            { 'col': '__time', 'op': 'lessThan', 'eq': [since] }
          ],
          'customMetrics': [
            {
              'name': 'tradeAmount',
              'formula': accumulateTradeAmountCustomMetricsFormula
            }
          ]
        }
      })
      let tradeCountQueryResult = await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          'dimensions': [ '__time' ],
          withGlobalMetrics: false,
          'granularity': selectHourMetric,
          'filters': [
            { 'col': '__time', 'op': 'in', 'eq': timeRange }
          ],
          'dimensionExtraSettings': [
            {
              'sortCol': '__time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          ],
          'customMetrics': [
            { 'name': 'tradeCount', 'formula': tradeAcountFormula }
          ],
          'splitType': 'tree',
          'queryEngine': 'tindex'
        }
      })
      let tradeCountDict = _(tradeCountQueryResult)
        .chain()
        .get([0, 'resultSet'])
        .keyBy('__time')
        .mapValues(v => v.tradeCount)
        .value()

      let tradeUserCountQueryResult = await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          'dimensions': [ '__time' ],
          withGlobalMetrics: false,
          'granularity': selectHourMetric,
          'filters': [
            { 'col': '__time', 'op': 'in', 'eq': timeRange }
          ],
          'dimensionExtraSettings': [
            {
              'sortCol': '__time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          ],
          'customMetrics': [
            { 'name': 'tradeUserCount', 'formula': tradeUserCountFormula }
          ],
          'splitType': 'tree',
          'queryEngine': 'tindex'
        }
      })
      let tradeUserCountDict = _(tradeUserCountQueryResult)
        .chain()
        .get([0, 'resultSet'])
        .keyBy('__time')
        .mapValues(v => v.tradeUserCount)
        .value()
        //所有理财存款产品交易人数会出现小数 其他选项不会 此处防止
      return immutateUpdate(accumulateTradeAmountQueryResult, [0, 'resultSet'], arr => {
        let accumateTradeAmountBeforeSince = _.get(accumulateTradeAmountBeforeSinceQueryResult, [0, 'tradeAmount']) || 0
        return (arr || []).reduce((acc, curr, idx) => {
          // 计算累计交易额
          let accumulateTradeAmount = idx === 0
            ? accumateTradeAmountBeforeSince + curr.tradeAmount
            : _.last(acc).accumulateTradeAmount + curr.tradeAmount
          acc.push({...curr, accumulateTradeAmount})
          return acc
        }, [])
          .map(o => {
            // 合并交易笔数、交易用户数
            return {...o, tradeCount: tradeCountDict[o.__time], tradeUserCount: ~~(tradeUserCountDict[o.__time])}
            //~~ 取整 ES6
          })
      })
    }
  },
  lifePay: {
    title:['选择指标','选择时间'],
    measureFirst: [
      { title: '点击量', name: 'clickCount' },
      { title: '点击人数', name: 'clickUserCount' }
    ],
    measureTime:[
      { title: '小时', name: 'PT1H' },
      { title: '日', name: 'P1D' },
      { title: '周', name: 'P1W' },
      { title: '月', name: 'P1M' }
    ],
    selectBoxTitle: '缴费类型',
    compareOptions: [
      { 'name': '话费充值' },
      { 'name': '游戏充值' },
      { 'name': '火车票' },
      { 'name': '交通罚款' },
      { 'name': '固话宽带' },
      { 'name': '流量充值' },
      { 'name': '飞机票' },
      { 'name': '艾普宽带' },
      { 'name': '有线电视费' },
      { 'name': 'Q币充值' }
    ],
    showTimePicker: true,
    showStatisticalTopMethod: true,
    customQueryFunc: async ({timeRange, selectHourMetric, datasourceCurrent, compareOptionValue}) => {
      // 生活缴费
      return await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          withGlobalMetrics: false,
          dimensions: ['__time'],
          dimensionExtraSettings: [
            {
              'sortCol': '__time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          ],
          granularity: selectHourMetric,
          'filters': [
            {'col': '__time', 'op': 'in', 'eq': timeRange},
            {'col':'event_type','op':'in','eq':['点击']},
            {'col': 'event_name', 'op': 'in', 'eq': [compareOptionValue]}
          ],
          customMetrics: [
            {name: 'clickCount', formula: '$main.count()'},
            {name: 'clickUserCount', formula: `$main.countDistinct($${userIdDimName}, "sketch")`}
          ]
        }
      })
    }
  }, transfer: {
    title:['选择指标','选择时间'],
    measureFirst: [
      { title: '交易量', name: 'investCount' },
      { title: '交易金额', name: 'investAmount' },
      { title: '使用人数', name: 'investorCount' }
    ],
    measureTime:[
      { title: '小时', name: 'PT1H' },
      { title: '日', name: 'P1D' },
      { title: '周', name: 'P1W' },
      { title: '月', name: 'P1M' }
    ],
    selectBoxTitle: '转账类型',
    showTimePicker: true,
    showStatisticalTopMethod: false,
    customQueryFunc: async ({timeRange, selectHourMetric, datasourceCurrent}) => {
      // 提取交易成功的记录进行计算	个人转账交易流水表（PB_TRANSFER）
      return await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          withGlobalMetrics: false,
          dimensions: ['__time'],
          dimensionExtraSettings: [
            {
              'sortCol': '__time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          ],
          granularity: selectHourMetric,
          'filters': [
            {'col': '__time', 'op': 'in', 'eq': timeRange},
            {'col': 'pro_sts', 'op': 'in', 'eq': ['交易成功']},
            {'col': 'pro_category', 'op': 'in', 'eq': ['普通转账']},
            {'col': 'pro_tran_amt', 'op': 'not nullOrEmpty', 'eq': [EMPTY_VALUE_OR_NULL]}
          ],
          customMetrics: [
            {name: 'investCount', formula: '$main.count()'},
            {name: 'investAmount', formula: '$main.sum($pro_tran_amt)'},
            {name: 'investorCount', formula: `$main.countDistinct($${userIdDimName}, "sketch")`}
          ]
        }
      })
  
    }
  }, assistant: {
    title:['选择指标','选择时间'],
    measureFirst: [
      { title: '使用人数', name: 'usageUserCount' },
      { title: '使用次数', name: 'usageCount' }
    ],
    measureTime:[
      { title: '小时', name: 'PT1H' },
      { title: '日', name: 'P1D' },
      { title: '周', name: 'P1W' },
      { title: '月', name: 'P1M' }
    ],
    compareOptions: [
      { 'name': '贷款计算器' },
      { 'name': '存款计算器' }
    ],
    selectBoxTitle: '可选功能',
    showTimePicker: true,
    showStatisticalTopMethod: true,
    customQueryFunc: async ({timeRange, selectHourMetric, datasourceCurrent, compareOptionValue}) => {
      return await doQuerySliceData({
        druid_datasource_id: datasourceCurrent.id,
        params: {
          withGlobalMetrics: false,
          dimensions: ['__time'],
          dimensionExtraSettings: [
            {
              'sortCol': '__time',
              'sortDirect': 'asc',
              'limit': 100,
              'granularity': selectHourMetric
            }
          ],
          granularity: selectHourMetric,
          'filters': [
            {'col': '__time', 'op': 'in', 'eq': timeRange},
            {'col': 'event_name', 'op': 'in', 'eq': [compareOptionValue]}
          ],
          customMetrics: [
            {name: 'usageUserCount', formula: `$main.countDistinct($${userIdDimName}, "sketch")`},
            {name: 'usageCount', formula: '$main.count()'}
          ]
        }
      })
  
    }
  }
}

const Statistics = [
  { title: '周平均', name: 'time' },
  { title: '累计次数', name: 'count' }
]

const Particle = {
  count: [1, 5, 10],
  time: [30, 60, 120]
}


@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class LineChartBox extends Component {

  state = {
    selectMetric: 'count',
    selectHourMetric: 'P1D',
    selectStatistics: 'time',
    compareOptionValue: null,
    timeRange: '-7 day',
    suitableTimeRange: findSuitableGranularity('-7 day')
  }

  componentWillMount() {
    let { type = 'useTimes' } = this.props
    const chartParams = _.get(QueryParams, type, {})
    let compareOptionValue = chartParams.compareOptions ? _.get(chartParams,'compareOptions[0].name') : null
    this.setState({
      selectMetric: _.get(chartParams.measureFirst, [0, 'name']),
      compareOptionValue
    })
  }

  render() {
    let { type = 'useTimes', datasourceCurrent, mainTimeDimName, businessDims} = this.props
    let {
      selectMetric,
      selectHourMetric,
      timeRange,
      suitableTimeRange,
      compareOptionValue
    } = this.state
    
    const chartParams = _.get(QueryParams, type, {})
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    const translationDict = _(chartParams.measureFirst).keyBy(m => m.name).mapValues(m => m.title).value()
    const selectedBusinessDim = _.find(businessDims, {name: compareOptionValue})
    return (
      <div>
        <div className="borderl2 mg2t">
          <span className="mg2x iblock">{chartParams.title[0]}:</span>
          <RadioGroup onChange={e => this.setState({ selectMetric: e.target.value })} value={selectMetric} className="iblock">
            {chartParams.measureFirst.map(m => (
              <RadioButton value={m.name} key={m.name} className="noradius mg2r borderl height29" style={{textAlign:'center'}}>
                {m.title}
              </RadioButton>
            ))}
          </RadioGroup>
          {
            chartParams.showStatisticalTopMethod
              ? (
                <div className="fright selecter-flow-scroll">
                  {chartParams.selectBoxTitle}：
                  <Select
                    className="min-width200"
                    onChange={v => this.setState({ compareOptionValue: v })}
                    value={compareOptionValue}
                    getPopupContainer={getPopupContainer}
                  >
                    {(_.get(chartParams, 'compareOptions') || [])
                      .map((p, i) => <SelectOption value={p.name} key={i} >{p.title || p.name}</SelectOption>)}
                  </Select>
                </div>
              )
              : null
          }
        </div>
        <div className="borderl2 mg2t">
          <span className="mg2x iblock">{chartParams.title[1]} :</span>
          <RadioGroup
            onChange={e => this.setState({ selectHourMetric: e.target.value })}
            value={selectHourMetric}
            className="iblock"
          >
            {chartParams.measureTime.map(m => (
              <RadioButton
                value={m.name}
                key={m.name}
                className="noradius width80 borderl height29"
                style={{textAlign:'center'}}
                disabled={!_.includes(suitableTimeRange, m.name)}
              >{m.title}</RadioButton>
            ))}
          </RadioGroup>
          {
            chartParams.showStatisticalBottomMethod
              ?
              <div className="fright selecter-flow-scroll">
                {chartParams.selectBoxTitle}：
                <Select className="width200"
                  onChange={v => this.setState({ compareOptionValue: v })}
                  defaultValue={compareOptionValue || '无'}
                  getPopupContainer={getPopupContainer}
                >
                  {(_.get(chartParams,'compareOptions') || businessDims || [])
                    .map((p, i) =><SelectOption value={p.name} key={i}>{p.title || p.name}</SelectOption>)}
                  { businessDims ? <SelectOption value={''}>无</SelectOption> : null }
                </Select>
              </div>
              : null
          }
        </div>
        {
          chartParams.showTimePicker
            ? <div className="borderl2 mg2t selecter-flow-scroll">
              <span className="mg2x iblock">筛选时间：</span>
              <TimePicker
                className="width280"
                dateType={relativeTime}
                dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
                getPopupContainer={getPopupContainer}
                onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
                  const nextTimeRange = relativeTime === 'custom' ? [since, until] : relativeTime
                  const nextSuitableTimeRange = findSuitableGranularity(nextTimeRange).filter(v => v !== 'PT1M' && v !== 'PT1S')
                  this.setState({
                    timeRange: nextTimeRange,
                    suitableTimeRange: nextSuitableTimeRange,
                    selectHourMetric: _.includes(nextSuitableTimeRange, selectHourMetric)
                      ? selectHourMetric
                      : _.first(nextSuitableTimeRange)
                  })
                }}
              />
              <BoundaryTimeFetcher
                timeDimName={mainTimeDimName}
                dataSourceId={datasourceCurrent && datasourceCurrent.id || ''}
                doQueryMinTime={false}
                doFetch={!_.isEmpty(datasourceCurrent)}
                onTimeLoaded={data => {
                  let {maxTime} = data || {}
                  if (!maxTime) {
                    return
                  }
                  this.setState({
                    timeRange: [
                      moment(maxTime).add(-7, 'day').startOf('second').toISOString(),
                      moment(maxTime).add(1, 's').startOf('second').toISOString() // 上边界为开区间，需要加 1 s
                    ]
                  })
                }}
              />
            </div>
            : null
        }
        <div>
          <AsyncTaskRunner
            args={[
              { timeRange, selectHourMetric, compareOptionValue, selectedBusinessDim },
              datasourceCurrent
            ]}
            doRun={!_.isEmpty(datasourceCurrent)}
            task={async (state, dsCurr) => {
              return chartParams.customQueryFunc ? await chartParams.customQueryFunc({...state, datasourceCurrent: dsCurr}) : null
            }}
          >
            {({result, isRunning}) => {
              let data = _.get(result, [0, 'resultSet']) || []
              const chartData = selectedBusinessDim
                ? data.map(d0 => _.find(d0, (v, k) => _.endsWith(k, '_GROUP') && _.isArray(v))).filter(_.identity)
                : [data].filter(_.identity)
              const legends = selectedBusinessDim
                ? (data || []).map(d0 => `${d0[selectedBusinessDim.name]} ${translationDict[selectMetric]}`)
                : [selectMetric].map(m => translationDict[m])
              const lineChartAnalysis = (
                <LineChartAnalysis
                  isLoading={isRunning}
                  dimension="__time"
                  metric={selectMetric}
                  metricsFormatDict={{}}
                  translationDict={translationDict}
                  names={legends}
                  dimensionColumnFormatterGen={() => dateFormatterGenerator( granularityToFormat(selectHourMetric) )}
                  data={chartData}
                />
              )
              return chartParams.wrapChart
                ? <div className="shadow15-ddd corner pd2 mg1x mg2y">{lineChartAnalysis}</div>
                : lineChartAnalysis
            }}
          </AsyncTaskRunner>
        </div>
      </div>
    )
  }
}
