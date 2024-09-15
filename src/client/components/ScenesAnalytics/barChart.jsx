import React, { Component } from 'react'
import { Radio, Select, Spin } from 'antd'
import _ from 'lodash'
import AsyncTaskRunner from '../Common/async-task-runner'
import { doQuerySliceData } from '../../common/slice-data-transform'
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import EchartsBar from '../Charts/BarChart/two-dim-bar-chart'
import OneEchartsBar from '../Charts/BarChart/index'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import Fetch from '../../common/fetch-final'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import { immutateUpdates } from '../../../common/sugo-utils'


const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const SelectOption = Select.Option
let durationCompleteFormatter = metricValueFormatterFactory('duration')

const getPopupContainer = (key) => document.querySelector('.appuser-barChart' + key)

const CountFiledName = 'count2'
const QueryParams = {
  account: {
    measure: [
      {
        title: '日均查询次数',
        name: '_tempMetric_1',
        formula: '$main.count()',
        pattern: '.2f'
      }
    ],
    showTimePicker: true,
    filters: [{ col: 'event_name', op: 'equal', eq: '我的账户' }]
  },
  loanBrowse: {
    wrapChart: true,
    measure: [
      {
        'title': '频次',
        'name': '_tempMetric_1',
        'formula': '$main.count()',
        'pattern': '.2f'
      },
      {
        'title': '平均浏览时长',
        'name': '_tempMetric_2',
        'formula': '$main.sum($duration)/$main.count()',
        'pattern': '.2f'
      }
    ],
    showTimePicker: true,
    filters: [{
      op: 'or',
      eq: [
        { col: 'page_name', op: 'contains', eq: '贷款' },
        { col: 'event_name', op: 'contains', eq: '贷款' }
      ]
    }]
  },
  financialBrowse: {
    wrapChart: true,
    measure: [{
      title: '关注人数',
      name: '_tempMetric_1',
      'formula': '$main.filter($event_type == "浏览").countDistinct($cst_no, \'sketch\')',
      'pattern': '.2f'
    },
    {
      title: '人均浏览时长',
      name: '_tempMetric_2',
      'formula': '($main.sum($duration)).divide($main.countDistinct($cst_no, \'sketch\'))',
      'pattern': '.2f'
    }],
    dimension: 'financial_page_name',
    showTimePicker: true,
    filters: [
      { col: 'cst_no', op: 'not nullOrEmpty', eq: '空' }
    ]
  },
  financialComparison: {
    wrapChart: true,
    measure: [
      {
        title: '累计交易额',
        name: '_tempMetric_1',
        'formula': '$main.sum($pro_tran_amt)',
        'pattern': '.2f'
      },
      {
        title: '交易笔数',
        name: '_tempMetric_2',
        'formula': '$main.count()',
        'pattern': '.2f'
      },
      {
        title: '交易人数',
        name: '_tempMetric_3',
        'formula': '$main.countDistinct($cst_no, \'sketch\')',
        'pattern': '.2f'
      }
    ],
    dimension: 'pro_category',
    showTimePicker: true,
    filters: [
      { col: 'pro_tran_amt', op: 'greaterThan', eq: [0] },
      { col: 'pro_category', op: 'not nullOrEmpty', eq: '空' }
    ]
  },
  useTimes: {
    wrapChart: true,
    measure: [
      {
        title: '使用次数',
        'name': '_tempMetric_1',
        'formula': '$main.count()',
        'pattern': '.2f'
      },
      {
        'title': '单次使用时长',
        'name': '_tempMetric_2',
        'formula': '$main.sum($duration)',
        'pattern': '.2f'
      }
    ],
    statistics: [
      { title: '周平均', name: 'weekAvg' },
      { title: '指定时间段累计次数', name: 'coustomCount' }
    ]
  },
  prodAttention: {
    wrapChart: true,
    measure: [
      {
        'title': '浏览人次',
        'name': '_tempMetric_1',
        'formula': '$main.filter($event_type == "浏览").countDistinct($cst_no, \'sketch\')',
        'pattern': '.2f'
      },
      {
        'title': '单次浏览时长',
        'name': '_tempMetric_2',
        'formula': '($main.sum($duration)).divide($main.countDistinct($cst_no, \'sketch\'))',
        'pattern': '.2f'
      }
    ],
    dimension: 'group_pro_name',
    showTimePicker: true,
    filters: [
      { col: 'cst_no', op: 'not nullOrEmpty', eq: '空' },
      { col: 'group_pro_name', op: 'in', eq: ['理财', '贷款', '存款'] }
    ]
  },
  featuresUse: {
    wrapChart: true,
    measure: [
      {
        'title': '使用人数',
        'name': '_tempMetric_1',
        'formula': '$main.countDistinct($cst_no, \'sketch\')',
        'pattern': '.2f'
      },
      {
        'title': '人均使用次数',
        'name': '_tempMetric_2',
        'formula': '$main.count()/$main.countDistinct($cst_no, \'sketch\')',
        'pattern': '.2f'
      }
    ],
    dimension: 'event_name',
    statistics: [
      { title: '周平均', name: 'weekAvg' },
      { title: '指定时间段累计次数', name: 'coustomCount' }
    ],
    filters: [
      {
        col: 'event_name', op: 'in', eq: [
          '账户查询',
          '普通转账',
          '设置操作',
          '咨询文章浏览']
      }
    ]
  },
  customQueryFunc: async ({ timeRange, dimension, businessDimension, params, selectStatistics, datasourceCurrent }) => {
    let { id: druid_datasource_id, name: datasource_name } = datasourceCurrent
    let metrics = []
    const metricInfos = params.measure
    const filters = params.filters || []
    if (selectStatistics === 'weekAvg') {
      metrics = [{
        name: metricInfos[0].name,
        formula: metricInfos[0].formula + '/4'
      }]
    } else {
      metrics = metricInfos.map(p => ({ name: p.name, formula: p.formula }))
    }

    let nonNewUserCountQueryRes = await doQuerySliceData({
      druid_datasource_id,
      datasource_name,
      params: {
        dimensions: [businessDimension, dimension].filter(_.identity),
        filters: [
          { col: '__time', op: 'in', eq: timeRange },
          ...filters
        ],
        customMetrics: metrics
      }
    })
    return nonNewUserCountQueryRes
  },
  timesQueryFunc: async ({ timeRange, businessDimension, params, selectMetric, selectStatistics, datasourceCurrent }) => {
    let { id: druid_datasource_id, name: datasource_name } = datasourceCurrent
    const metricInfos = params.measure
    const filters = params.filters || []
    let metric = metricInfos.find(p => p.name === selectMetric)
    var dimensions = ['cst_no', businessDimension].filter(_.identity)
    if (metric.title === '日均查询次数') {
      metric = _.cloneDeep(metric)
      let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
      let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
      metric.formula = metric.formula + `/${Math.ceil(moment(until).diff(moment(since), 'd', true))}`
    }
    let minCount = await doQuerySliceData({
      druid_datasource_id,
      datasource_name,
      params: {
        dimensions: ['cst_no'],
        filters: [{ col: '__time', op: 'in', eq: timeRange }, ...filters],
        dimensionExtraSettings: [{
          'limit': 1,
          'sortDirect': 'asc',
          'sortCol': '_tempMetric_min'
        }],
        customMetrics: [{
          name: '_tempMetric_min',
          formula: metric.formula
        }]
      }
    })
    let maxCount = await doQuerySliceData({
      druid_datasource_id,
      datasource_name,
      params: {
        dimensions: ['cst_no'],
        filters: [{ col: '__time', op: 'in', eq: timeRange }, ...filters],
        dimensionExtraSettings: [{
          'limit': 1,
          'sortDirect': 'dasc',
          'sortCol': '_tempMetric_max'
        }],
        customMetrics: [{
          name: '_tempMetric_max',
          formula: metric.formula
        }]
      }
    })
    maxCount = _.get(maxCount, [0, 'resultSet', 0, '_tempMetric_max'], undefined)
    minCount = _.get(minCount, [0, 'resultSet', 0, '_tempMetric_min'], undefined)
    if (typeof maxCount === 'undefined' || typeof minCount === 'undefined') {
      return []
    }
    maxCount = Math.ceil(maxCount)
    minCount = Math.floor(minCount)
    if (selectStatistics === 'weekAvg') {
      maxCount = Math.ceil(maxCount / 4)
      minCount = Math.floor(minCount / 4)
    }
    const size = Math.ceil((maxCount - minCount) / 7)
    let druidQuery = await Fetch.post('/api/plyql/get-query', {
      druid_datasource_id,
      datasource_name,
      dimensions,
      filters: [{ col: '__time', op: 'in', eq: timeRange }, ...filters],
      customMetrics: [
        {
          name: 'count1',
          formula: metric.formula + (selectStatistics === 'weekAvg' ? '/ 4' : '')
        }
      ]
    })
    const newDruidQuery = {
      ..._.omit(druidQuery, ['limitSpec']),
      dimensions: [druidQuery.dimensions.find(p => p.type === 'default')],
      queryType: 'nest_groupBy',
      nestSpec: {
        nestAggregations: [
          {
            type: 'count',
            name: 'userCount'
          }
        ],
        nestGranularity: 'all',
        nestLimitSpec: {
          type: 'default',
          columns: [
            {
              dimension: CountFiledName,
              direction: 'ascending'
            }
          ]
        },
        nestDimensions: [
          druidQuery.dimensions.find(p => p.type === 'lookup'),
          {
            type: 'numericGroup',
            dimension: 'count1',
            outputName: CountFiledName,
            interval: size < 2 ? 2 : size,
            min: minCount,
            max: maxCount < 2 ? 2 : maxCount
          }
        ].filter(_.identity)
      }
    }

    let res = await Fetch.get('/app/plyql/lucene', newDruidQuery)
    res = res.map(p => p.event)
    res = res.map(p => {
      let eq = _.get(p, CountFiledName, '').split('~').map(p => _.toNumber(p)).join('~')
      return {
        ...p,
        [CountFiledName]: eq
      }
    })
    if (businessDimension) {
      res = _.groupBy(res, p => p[businessDimension])
      res = _.reduce(res, (r, v, k) => {
        r.push({ [businessDimension]: k, [`${CountFiledName}_GROUP`]: v })
        return r
      }, [])
    }
    return [{ resultSet: res }]
  }
}

const otherOption = [
  {
    areaStyle: {
      normal: {
        color: '#9986ff',
        opacity: 0.3
      }
    },
    lineStyle: {
      normal: {
        width: 2
      }
    },
    sampling: true
  },
  {
    areaStyle: {
      normal: {
        color: '#ccc',
        opacity: 0.3
      }
    },
    lineStyle: {
      normal: {
        width: 2
      }
    },
    sampling: true
  }
]
@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class BarChart extends Component {

  state = {
    selectMetric: '_tempMetric_1',
    selectStatistics: 'weekAvg',
    selectDim: '',
    timeRange: '-30 day',
    chartData: [],
    isLoading: false
  }

  constructor(props) {
    super(props)
  }

  optionsOverwriter = (option, type, selectMetric) => {
    let nextOption = _.cloneDeep(option)
    let name = _.get(QueryParams, type, { measure: [] })
    name = name.measure.find(p => p.name === selectMetric)|| {}
    name = name.title
    if ((type === 'loanBrowse' || type === 'useTimes') && selectMetric === '_tempMetric_2') {
      nextOption = immutateUpdates(option,
        'xAxis.axisLabel', axisLabel => ({
          ...axisLabel,
          formatter: function (value) {
            const [start, end] = value.split('~').map(p => _.toNumber(p))
            return `${durationCompleteFormatter(start)}~${durationCompleteFormatter(end)}`
          }
        }))
      nextOption = immutateUpdates(nextOption,
        'tooltip', tooltip => ({
          ...tooltip,
          formatter: function (params) {
            return params.map(p => {
              const [start, end] = p.axisValueLabel.split('~').map(v => _.toNumber(v))
              const label = `${durationCompleteFormatter(start)}~${durationCompleteFormatter(end)}<br />`
              return `${label}${name}: ${p.data}人`
            }).join('<br />')
          }
        }))
    } else if ((type === 'loanBrowse' || type === 'useTimes') && selectMetric === '_tempMetric_1') {
      nextOption = immutateUpdates(option,
        'xAxis.axisLabel', axisLabel => ({
          ...axisLabel,
          formatter: function (value) {
            return `${value}次`
          }
        }))
      nextOption = immutateUpdates(nextOption,
        'tooltip', tooltip => ({
          ...tooltip,
          formatter: function (params) {
            return params.map(p => {
              const label = `${p.axisValueLabel}次<br />`
              return `${label}${name}: ${p.data}人`
            }).join('<br />')
          }
        }))
    } else if (type === 'account') {
      nextOption = immutateUpdates(option,
        'xAxis.axisLabel', axisLabel => ({
          ...axisLabel,
          formatter: function (value) {
            return `${value}次`
          }
        }))
      nextOption = immutateUpdates(nextOption,
        'tooltip', tooltip => ({
          ...tooltip,
          formatter: function (params) {
            return params.map(p => {
              const label = `${p.axisValueLabel}次<br />`
              return `${label}${name}: ${p.data}人`
            }).join('<br />')
          }
        }))
    } else {
      nextOption = immutateUpdates(nextOption,
        'tooltip', tooltip => ({
          ...tooltip,
          formatter: function (params) {
            return params.map(p => {
              const label = `${p.axisValueLabel}<br />`
              return `${label}${name}: ${p.data.toString().indexOf('.') > 0 ? p.data.toFixed(2) : p.data}`
            }).join('<br />')
          }
        }))
    }
    if (!(type === 'financialComparison' && (selectMetric === '_tempMetric_1' || selectMetric === '_tempMetric_2'))
      && !(type === 'financialBrowse' && selectMetric === '_tempMetric_2')
      && !(type === 'featuresUse' && selectMetric === '_tempMetric_2')
      && !(type === 'prodAttention' && selectMetric === '_tempMetric_2'))
      nextOption = immutateUpdates(nextOption,
        'yAxis', yAxis => ({
          ...yAxis,
          minInterval: 1,
          axisLabel: {
            ...yAxis.axisLabel,
            formatter: function (value) {
              return value + '人'
            }
          }
        }))

    return nextOption
  }

  render() {
    let { type = 'useTimes', datasourceCurrent, businessDim = [] } = this.props
    let {
      selectMetric,
      selectStatistics,
      timeRange,
      selectDim,
      chartData,
      isLoading
    } = this.state
    const params = _.get(QueryParams, type, {})
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    let runnerArgs = {
      timeRange,
      selectDim
    }
    var isTimesQuery = type === 'useTimes' || type === 'account' || type === 'loanBrowse'
    if (isTimesQuery) {
      runnerArgs = { ...runnerArgs, selectMetric }
    }
    if (type === 'useTimes') {
      runnerArgs = { ...runnerArgs, selectStatistics }
    }
    const EchartsBarControl = selectDim ? EchartsBar : OneEchartsBar

    const echartsBar = (
      <EchartsBarControl
        isLoading={isLoading}
        dimensions={[selectDim, isTimesQuery ? CountFiledName : params.dimension].filter(_.identity)}
        metrics={[isTimesQuery ? 'userCount' : selectMetric]}
        metricsFormatDict={{}}
        translationDict={{}}
        names={[selectMetric]}
        other={otherOption}
        data={chartData}
        style={{ height: 300, marginTop: 50 }}
        optionsOverwriter={option => {
          return this.optionsOverwriter(option, type, selectMetric)
        }}
      />
    )
    return (
      <div>
        <div className="borderl2 mg2t">
          <span className="mg2x iblock">选择指标：</span>
          <RadioGroup onChange={e => {
            if (e.target.value === '_tempMetric_2' && selectStatistics === 'weekAvg') {
              this.setState({ selectMetric: e.target.value, selectStatistics: 'coustomCount' })
            } else {
              this.setState({ selectMetric: e.target.value })
            }
          }}
          value={selectMetric}
          className="iblock"
          >
            {params.measure.map(m => (
              <RadioButton value={m.name} key={m.name} className="noradius mg2r borderl height29">
                {m.title}
              </RadioButton>
            ))}
          </RadioGroup>
        </div>
        {
          params.statistics
            ? <div className="borderl2 mg2t">
              <span className="mg2x iblock">统计方式：</span>
              <RadioGroup
                onChange={e => {
                  if (e.target.value === 'weekAvg') {
                    this.setState({ timeRange: '-30 day', selectStatistics: e.target.value })
                  } else {
                    this.setState({ selectStatistics: e.target.value })
                  }
                }}
                value={selectStatistics}
                className="iblock"
              >
                {params.statistics.map(m => (
                  <RadioButton
                    disabled={selectMetric === '_tempMetric_2' && m.name === 'weekAvg'}
                    value={m.name}
                    key={m.name}
                    className="noradius mg2r borderl height29"
                  >
                    {m.title}
                  </RadioButton>
                ))}
              </RadioGroup>
              {
                !params.showTimePicker && selectStatistics !== 'coustomCount'
                  ? <div className={`fright appuser-barChart${type}`}>
                    可选维度：<Select
                      value={selectDim}
                      className="width100"
                      onChange={v => this.setState({ selectDim: v })}
                      getPopupContainer={() => getPopupContainer(type)}
                    >
                      <SelectOption value="" key={'select-option-dmall'}>无</SelectOption>
                      {
                        businessDim.map((p, i) => <SelectOption value={p.name} key={`select-option-dm${i}`}>{p.title || p.name}</SelectOption>)
                      }
                    </Select>
                  </div>
                  : null
              }
            </div>
            : null
        }
        {
          params.showTimePicker || selectStatistics === 'coustomCount'
            ? <div className={`borderl2 mg2t appuser-barChart${type}-time`}>
              <span className="mg2x iblock">筛选时间：</span>
              <TimePicker
                className="width280"
                dateType={relativeTime}
                dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
                getPopupContainer={() => getPopupContainer(`${type}-time`)}
                onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
                  this.setState({
                    timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
                  })
                }}
              />
              <BoundaryTimeFetcher
                dataSourceId={datasourceCurrent && datasourceCurrent.id || ''}
                doQueryMinTime={false}
                doFetch={!_.isEmpty(datasourceCurrent)}
                onTimeLoaded={data => {
                  let { maxTime } = data || {}
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
              {
                type === 'account'
                  ? null
                  : <div className={`fright appuser-barChart${type}-2`}>
                    可选维度：<Select
                      className="width100"
                      value={selectDim}
                      onChange={v => this.setState({ selectDim: v })}
                      getPopupContainer={() => getPopupContainer(type + '-2')}
                    >
                      <SelectOption value="" key={'select-option-dmall'}>无</SelectOption>
                      {
                        businessDim.map((p, i) => <SelectOption value={p.name} key={`select-option-dm${i}`}>{p.title || p.name}</SelectOption>)
                      }
                    </Select>
                  </div>
              }
            </div>
            : null
        }
        <div>
          <AsyncTaskRunner
            args={[runnerArgs, datasourceCurrent]}
            doRun={!_.isEmpty(datasourceCurrent)}
            task={async (state, dsCurr) => {
              this.setState({ isLoading: true })
              const queryFunc = isTimesQuery ? QueryParams.timesQueryFunc : QueryParams.customQueryFunc
              return queryFunc ? await queryFunc({
                ...state,
                params,
                selectMetric: state.selectMetric || '', selectStatistics: state.selectStatistics,
                dimension: params.dimension,
                businessDimension: state.selectDim,
                datasourceCurrent: dsCurr
              }) : null
            }}
            onResult={result => {
              this.setState({ isLoading: false, chartData: _.get(result, [0, 'resultSet']).filter(p => p.financial_page_name !== '未分组') || [] })
            }}
          />
          <Spin spinning={isLoading}>
            {params.wrapChart ? <div className="shadow15-ddd corner pd2 mg1x mg2y">{echartsBar}</div> : echartsBar}
          </Spin>
        </div>
      </div>
    )
  }
}
