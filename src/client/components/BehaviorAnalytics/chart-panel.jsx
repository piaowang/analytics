/**
 * 行为事件分析对比图
 */
import React, { Component } from 'react'
import {Radio, message, Checkbox} from 'antd'
import moment from 'moment'
import _ from 'lodash'
import DateRangePicker from '../Common/time-picker'
import DruidDataFetcher, {DruidDataFetcherOnlyRunInViewport} from '../Fetcher/druid-data-fetcher'
import {isRelative} from '../../../common/param-transform'
import {granularityToFormat, dateFormatterGenerator} from '../../common/date-format-util'
import LineChart from '../TrafficAnalytics/line-chart'
import {getTimeRange, clearDay, getBalance} from '../TrafficAnalytics/data-box'
import checkAndFillData, {granularitys, fillData} from './check-and-fill-data'
import {getTypeFilter} from './data-table'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

const getPopupContainer = () => document.querySelector('.overscroll-y')

export function getFilters(model, countTime) {
  const {filterDict} = model.params
  let filters = []
  for(let k in filterDict) {
    if(countTime && k === 'event_type') {
      filters = filters.concat(getTypeFilter(model, true))        
    } else {
      filters = filters.concat(filterDict[k])        
    }
  }

  return filters
}

const otherOption = [
  {
    areaStyle: {normal: {
      color: '#9986ff',
      opacity: 0.3
    }},
    lineStyle: {normal: {
      width: 2
    }},
    sampling: true
  },
  {
    areaStyle: {normal: {
      color: '#ccc',
      opacity: 0.3
    }},
    lineStyle: {normal: {
      width: 2
    }},
    sampling: true
  }
]

class ChartPanel extends Component {

  state = {
    isLoadingNow: false,
    isLoadingCompare: false,
    druidData: []
  }

  componentDidMount() {
    this._otherOption = _.cloneDeep(otherOption)
    this._otherOption.forEach(o => o.tooltip = {
      formatter: this.formatter
    })
  }

  formatter = ({dataIndex, value, color, seriesIndex}) => {
    const {model} = this.props
    const {druidData} = this.state
    let {selectMetric, granularity} = _.get(model, 'params.chartBoxSetting', {})
    const modelMetrics = this.getMetrics()
    const resultSet = druidData[seriesIndex]

    let metric = modelMetrics.find(m => m.name === selectMetric) || {}
    let span = `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${color}"></span>`
    let formatStr = 'YYYY-MM-DD HH时'
    switch (granularity) {
      case 'P1D':
        formatStr = 'YYYY-MM-DD'
        break
      case 'P1W':
        formatStr = 'YYYY-MM-DD'
        break
      case 'P1M':
        formatStr = 'YYYY-MM'
        break
    }
    let time = moment(resultSet[dataIndex].__time).format(formatStr)
    return metric.title + '<br/>' + time + '<br/>' + span + value
  }

  onData = (data, name) => {
    const {model} = this.props
    let {druidData} = this.state
    druidData = druidData.concat()

    const granularity = _.get(model, 'params.chartBoxSetting.granularity', 'PT1H')
    const selectMetric = _.get(model, 'params.chartBoxSetting.selectMetric')
    const timeFilter = _.get(model, 'params.chartBoxSetting.timeFilter')
    let [since, until] = getTimeRange(timeFilter)
    let resultSet = _.get(data, '[0].resultSet', [])

    let granObj = granularitys.find(g => g.value === granularity)

    let set = []
    resultSet.forEach((d, i) => fillData(d, i, granObj, set, selectMetric))
    if(name === 'compare') {
      druidData[1] = set
    } else {
      druidData[0] = set
    }

    checkAndFillData(druidData, granObj, selectMetric, since, until)

    this.setState({druidData})
  }

  getMetrics(props) {
    const {model, metricObjs} = props || this.props
    const {eventName} = model.params
    return eventName === '浏览' ? metricObjs : metricObjs.filter(m => m.group === 0)
  }

  getNames(now) {
    const {model} = this.props
    const {timeFilter} = model.params
    const {timeFilter: timeF, selectMetric} = _.get(model, 'params.chartBoxSetting', {})
    const modelMetrics = this.getMetrics()

    let metric = modelMetrics.find(m => m.name === selectMetric) || {}
    let range = getTimeRange(now ? timeFilter : timeF)
    range = range.map(t => moment(t).format('YYYY-MM-DD'))
    if(range[0] === range[1]) range.pop()
    return range.join('-') + ' ' + metric.title
  }

  getGranularitys(props) {
    const {model} = props || this.props
    const {timeFilter} = model.params
    let [since, until] = getTimeRange(timeFilter)
    let day = (moment(until).toDate() - moment(since).toDate()) / (1000 * 60 * 60 * 24)
    
    let disabledDict = {}
    if(day <= 1) {
      disabledDict = {
        'PT1H': false,
        'P1D': true,
        'P1W': true,
        'P1M': true
      }
    } else if (day <= 7) {
      disabledDict = {
        'PT1H': true,
        'P1D': false,
        'P1W': true,
        'P1M': true
      }
    } else if (day <= 31) {
      disabledDict = {
        'PT1H': true,
        'P1D': false,
        'P1W': false,
        'P1M': true
      }
    } else if (day <= 90) {
      disabledDict = {
        'PT1H': true,
        'P1D': true,
        'P1W': false,
        'P1M': false
      }
    } else {
      disabledDict = {
        'PT1H': true,
        'P1D': true,
        'P1W': true,
        'P1M': false
      }
    }

    let newGranularitys = granularitys.map(g => Object.assign({}, g, {
      disabled: disabledDict[g.value]
    }))

    return newGranularitys
  }

  timeChange = timeF => {
    const {dateType} = timeF
    let [since0, until0] = getTimeRange(timeF)
    if(dateType === 'custom') {
      [since0, until0] = timeF.dateRange = clearDay([since0, until0])
    }

    const {model} = this.props
    const {timeFilter} = model.params
    let [since, until] = getTimeRange(timeFilter)
    let mainBalance = getBalance(since, until)

    if(mainBalance !== getBalance(since0, until0)) {
      until0 = moment(since0).add(mainBalance, 'milliseconds').format('YYYY-MM-DD HH:mm:ss')
      timeF.dateRange = [since0, until0]
      timeF.dateType = 'custom'
      message.warning('选择的对比时间段应与主时间段保持一致')
    }
    
    this.setStateData({timeFilter: timeF})
  }

  getFilters(now, metric) {
    const {model} = this.props
    const {timeFilter} = model.params
    const {timeFilter: timeF} = _.get(model, 'params.chartBoxSetting', {})
    let filters = getFilters(model, metric.group === 1)

    filters.push({
      col: '__time',
      op: 'in', 
      eq: getTimeRange(now ? timeFilter : timeF)
    })

    return filters
  }

  setStateData(state) {
    const {model, onChange} = this.props
    const setting = _.get(model, 'params.chartBoxSetting', {})
    let newSetting = Object.assign({}, setting, state)
    onChange('params.chartBoxSetting', newSetting)
  }

  render() {
    const {model, isFetchingModels} = this.props
    const {druidData, isLoadingNow, isLoadingCompare} = this.state
    let {timeFilter, selectMetric, granularity, selectTime} = _.get(model, 'params.chartBoxSetting', {})
    const {dateType} = timeFilter

    let relativeTime = isRelative(dateType) ? dateType : 'custom'
    let [since, until] = getTimeRange(timeFilter)

    let _druidData = selectTime ? druidData : druidData.slice(0, 1)

    const modelMetrics = this.getMetrics()
    let metric = modelMetrics.find(m => m.name === selectMetric) || {}
    let dsId = model && model.druid_datasource_id || ''
    let names = [this.getNames(true), this.getNames()]
    let granularitys = this.getGranularitys()
    if(granularitys.find(g => g.value === granularity).disabled){
      let g = granularitys.find(g => !g.disabled)
      granularity = g.value
      this.setStateData({granularity})
    }

    return (
      <section className="pd2">
        <div className="mg2y borderl2 line-height30">
          <span className="mg2x iblock">选择分析指标：</span>
          
          <RadioGroup onChange={e => this.setStateData({selectMetric: e.target.value})} value={selectMetric} className="iblock">
            {modelMetrics.map(m => (
              <RadioButton value={m.name} key={m.name} className="noradius mg2r borderl height29">
                {m.title}
              </RadioButton>
            ))}
          </RadioGroup>
        </div>
        <div className="mg2y borderl2 line-height30">
          <span className="mg2x iblock">选择对比形式：</span>
          <RadioGroup onChange={e => this.setStateData({granularity: e.target.value})} value={granularity}>
            {granularitys.map(g => (
              <RadioButton value={g.value} key={g.value} className="noradius width100 aligncenter height29" disabled={g.disabled}>
                {g.title}
              </RadioButton>
            ))}
          </RadioGroup>
          <div className="fright">
            <Checkbox onChange={e => this.setStateData({selectTime: e.target.checked})} checked={selectTime}>选择对比时间</Checkbox>
            <DateRangePicker
              getPopupContainer={getPopupContainer}
              className={'height-100 width200' + (selectTime ? '' : ' hide')}
              prefix={''}
              alwaysShowRange
              hideCustomSelection
              dateType={relativeTime}
              dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
              onChange={this.timeChange}
            />
          </div>
        </div>
        <div className="pd2y pd2l radius shadow12">
          <DruidDataFetcherOnlyRunInViewport
            debounce={500}
            dataSourceId={dsId}
            doFetch={!!(dsId && !isFetchingModels)}
            filters={this.getFilters(true, metric)}
            dimensions={['__time']}
            customMetrics={[metric]}
            dimensionExtraSettingDict={{'__time': {granularity, sortCol: '__time', sortDirect: 'asc', limit: 999}}}
            onData={data => this.onData(data)}
            onFetchingStateChange={isFetching => this.setState({isLoadingNow: isFetching})}
          />
          <DruidDataFetcherOnlyRunInViewport
            debounce={500}
            dataSourceId={dsId}
            doFetch={!!(selectTime && dsId && !isFetchingModels)}
            filters={this.getFilters(false, metric)}
            dimensions={['__time']}
            customMetrics={[metric]}
            dimensionExtraSettingDict={{'__time': {granularity, sortCol: '__time', sortDirect: 'asc', limit: 999}}}
            onData={data => this.onData(data, 'compare')}
            onFetchingStateChange={isFetching => this.setState({isLoadingCompare: isFetching})}
          />
          <LineChart
            isLoading={isLoadingNow || isLoadingCompare}
            data={_druidData}
            dimension="time"
            metric={metric.name}
            metricsFormatDict={{}}
            translationDict={{[metric.name]: metric.title}}
            names={names}
            dimensionColumnFormatterGen={() => dateFormatterGenerator( granularityToFormat(granularity) )}
            other={this._otherOption}
          />
        </div>
      </section>
    )
  }
}

export default ChartPanel

