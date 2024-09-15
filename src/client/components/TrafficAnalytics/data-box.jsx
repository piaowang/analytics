/**
 * 新用户表格与统计图
 */

import React, { Component } from 'react'
import DateRangePicker from '../Common/time-picker'
import {convertDateType, isRelative, convertOldDateType} from '../../../common/param-transform'
import moment from 'moment'
import condition from './condition-definition'
import _ from 'lodash'
import FilterCol from './filter-col'
import { LoadingOutlined } from '@ant-design/icons';
import { Popover, Button, Radio, message, Checkbox, Tooltip } from 'antd';
import LineChart from './line-chart'
import {DruidDataFetcherOnlyRunInViewport} from '../Fetcher/druid-data-fetcher'
import icUser from '../../images/ic_user.svg'
import * as d3 from 'd3'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import {granularityToFormat, dateFormatterGenerator} from '../../common/date-format-util'
import HoverHelp from '../Common/hover-help'
import checkAndFillData, {granularitys, fillData} from '../BehaviorAnalytics/check-and-fill-data'
import TextFitter from '../Common/text-fitter'

let percentFormatter = d3.format('.2%')
let durationCompleteFormatter = metricValueFormatterFactory('duration-complete')

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

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

let loadingIndicator = (
  <LoadingOutlined />
)

export function getTimeRange({dateType, dateRange}) {
  let relativeTime = isRelative(dateType) ? dateType : 'custom'
  // 暂不考虑 relativeTimeType
  return relativeTime === 'custom' ? dateRange : convertDateType(relativeTime, undefined, 'tool')
}

export function clearDay([since, until]) {
  since = since.slice(0, 10) + ' 00:00:00'
  until = until.slice(0, 10) + ' 23:59:59'
  return [since, until]
}

export function getBalance(since, until) {
  return moment(until).toDate() - moment(since).toDate()
}

const getPopupContainer = () => document.querySelector('.overscroll')

class DataBox extends Component {

  state = {
    filter: {},
    timeFilter: {
      dateType: '-1 day',
      dateRange: []
    },
    isFetchingNewUserInfo: false,
    isFetchingOldUserInfo: false,
    newUser: null,
    oldUser: null
  }

  componentWillReceiveProps(nextProps) {
    const {model} = nextProps
    let newState = {
      filter: _.get(model, 'params.filters', {}),
      timeFilter: _.get(model, 'params.timeFilter', { dateType: '-1 day', dateRange: [] })
    }
    this.setState(newState)
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.props, nextProps) || !_.isEqual(this.state, nextState)
  }

  renderNewOldUserFetcher() {
    const {filter: filterOfCond, timeFilter} = this.state
    const {
      model,
      metricObjs,
      isFetchingTrafficAnalyticModels
    } = this.props
    let {dateType} = timeFilter

    let [since, until] = getTimeRange(timeFilter)

    let sliceFilters = _.flatMap(_.keys(filterOfCond), condName => filterOfCond[condName])

    if (isRelative(dateType) && _.isString(dateType)) {
      dateType = convertOldDateType(dateType)
    }

    // 新用户: since <= first_visit_time; 老用户： not 新用户
    // 按照用户设定的时间查询
    let commonFilters = [
      {
        col: '__time',
        op: 'in',
        eq: isRelative(dateType) ? dateType : [since, until]
      },
      ...sliceFilters
    ]
    let metricalField = _.get(model, 'params.metricalField') || 'distinct_id'
    let dsId = model && model.druid_datasource_id || ''

    return [
      <DruidDataFetcherOnlyRunInViewport
        key="newUserInfoFetcher"
        debounce={500}
        dataSourceId={dsId}
        doFetch={!!(dsId && !isFetchingTrafficAnalyticModels)}
        filters={[
          ...commonFilters,
          {
            col: 'first_visit_time',
            op: 'in',
            eq: [since, '3000']
          }
        ]}
        onFetchingStateChange={isFetching => {
          this.setState({ isFetchingNewUserInfo: isFetching })
        }}
        customMetrics={[
          {
            name: 'newUserCount',
            formula: `$main.countDistinct($${metricalField})`
          },
          ...metricObjs
        ]}
        onData={result => {
          this.setState({newUser: result && result[0] || {}})
        }}
      />,
      <DruidDataFetcherOnlyRunInViewport
        key="oldUserInfoFetcher"
        debounce={500}
        dataSourceId={dsId}
        doFetch={!!(dsId && !isFetchingTrafficAnalyticModels)}
        filters={[
          ...commonFilters,
          {
            op: 'not',
            eq: [
              {
                col: 'first_visit_time',
                op: 'in',
                eq: [since, '3000']
              }
            ]
          }
        ]}
        onFetchingStateChange={isFetching => {
          this.setState({ isFetchingOldUserInfo: isFetching })
        }}
        customMetrics={[
          {
            name: 'oldUserCount',
            formula: `$main.countDistinct($${metricalField})`
          },
          ...metricObjs
        ]}
        onData={result => {
          this.setState({oldUser: result && result[0] || {}})
        }}
      />
    ]
  }

  renderNewOldUserPanel() {
    const {metricObjs} = this.props

    let {newUser, oldUser, isFetchingNewUserInfo, isFetchingOldUserInfo} = this.state
    let newUserCount = _.get(newUser, 'newUserCount') || 0
    let oldUserCount = _.get(oldUser, 'oldUserCount') || 0

    let newUserPercent = newUserCount / (newUserCount + oldUserCount)
    let oldUserPercent = oldUserCount / (newUserCount + oldUserCount)
    return (
      <div className="border mg2t mg3b">
        <div style={{width: '250px'}} className="bg-gray-blue itblock aligncenter borderr">
          <div className="height100 relative">
            <img src={icUser} alt="" className="center-of-relative"/>
          </div>

          <div className="height120 relative color-purple-blue">
            <div className="center-of-relative">
              <p className="font16">
                新用户
                <HoverHelp content="首次访问的用户" className="mg1l" />
              </p>
              <p className="font30">
                {isFetchingNewUserInfo
                  ? loadingIndicator
                  : (
                    <Tooltip overlay={`新用户数：${newUserCount}`} >
                      {percentFormatter(isFinite(newUserPercent) ? newUserPercent : 0)}
                    </Tooltip>
                  )}
              </p>
            </div>
          </div>

          <div className="height120 relative">
            <div className="center-of-relative color-999">
              <p className="font16">
                老用户
                <HoverHelp content="非首次访问的用户" className="mg1l" />
              </p>
              <p className="font30">
                {isFetchingOldUserInfo
                  ? loadingIndicator
                  : (
                    <Tooltip overlay={`老用户数：${oldUserCount}`} >
                      {percentFormatter(isFinite(oldUserPercent) ? oldUserPercent : 0)}
                    </Tooltip>
                  )}
              </p>
            </div>
          </div>
        </div>

        <div style={{width: 'calc(100% - 250px)'}} className="itblock">
          {_.orderBy(metricObjs, 'group').map(mo => {
            let formatter = metricValueFormatterFactory(mo.pattern)
            let newUserMetricVal = _.get(newUser, mo.name, '--') || 0
            let oldUserMetricVal = _.get(oldUser, mo.name, '--') || 0
            return (
              <div style={{width: `calc(100% / ${metricObjs.length})`}} className="itblock bg-white aligncenter" key={mo.name}>
                <div className="height100 line-height100 color-purple-blue font16">
                  <HoverHelp addonBefore={`${mo.title} `} content={mo.description} />
                </div>
                <div className="height120 bordert line-height120 font30">
                  <TextFitter
                    fontFamily="microsoft Yahei"
                    maxFontSize={30}
                    text={formatter(isFinite(newUserMetricVal) ? newUserMetricVal : 0)}
                    title={mo.pattern === 'duration' ? durationCompleteFormatter(newUserMetricVal) : undefined}
                  />
                </div>
                <div className="height120 bordert line-height120 font30 color-999">
                  <TextFitter
                    fontFamily="microsoft Yahei"
                    maxFontSize={30}
                    text={formatter(isFinite(oldUserMetricVal) ? oldUserMetricVal : 0)}
                    title={mo.pattern === 'duration' ? durationCompleteFormatter(oldUserMetricVal) : undefined}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  renderCondition() {
    const {model, onChange, dataSourceDimensions} = this.props
    let {filterCols} = model && model.params || {}
    let selectedFilterColSet = new Set(filterCols)
    let conditionDom = []
    let group = 0

    // 修正没有 condition 中的维度时，点击条件报错的 bug
    let dbNameSet = new Set(dataSourceDimensions && dataSourceDimensions.map(d => d.name) || [])
    condition.filter(c => _.every(c.dimensions, dimName => dbNameSet.has(dimName))).forEach((co, i) => {
      if(group !== co.group) {
        group = co.group
        conditionDom.push(<br key={i}/>)
      }
      conditionDom.push(
        <Checkbox
          onChange={ev => {
            if (ev.target.checked) {
              if(filterCols.length < 6) {
                onChange('params.filterCols', prevMetrics => [...prevMetrics, co.name])                
              } else {
                message.error('最多可同时选择 6 个')
              }
            } else {
              onChange('params.filterCols', prevMetrics => prevMetrics.filter(m => m !== co.name))
            }
          }}
          key={co.name}
          checked={selectedFilterColSet.has(co.name)}
        >{co.title}</Checkbox>
      )
    })

    return <div className="line-height30">{conditionDom}</div>
  }

  timeChange = timeFilter => {
    const {dateType} = timeFilter
    let [since, until] = getTimeRange(timeFilter)
    if(dateType === 'custom') {
      [since, until] = timeFilter.dateRange = clearDay([since, until])
    }
    
    this.props.onChange('params.timeFilter', timeFilter)
  }

  render() {
    const {filter, timeFilter} = this.state
    const {model, dataSourceDimensions, datasourceCurrent, onChange} = this.props
    const {dateType, dateRange} = timeFilter
    let relativeTime = isRelative(dateType) ? dateType : 'custom'
    let [since, until] = getTimeRange(timeFilter)

    // 修正没有 condition 中的维度时，点击条件报错的 bug
    let dbNameSet = new Set(dataSourceDimensions && dataSourceDimensions.map(d => d.name) || [])
    let condNameDict = _.keyBy(condition.filter(c => _.every(c.dimensions, dimName => dbNameSet.has(dimName))), 'name')
    let conditions = _.get(model, 'params.filterCols', []).map(name => condNameDict[name]).filter(_.identity)
    let dataSource = datasourceCurrent
    
    return (
      <section className="pd3">
        <div>
          <DateRangePicker
            getPopupContainer={getPopupContainer}
            className="height-100 width250 mg2r mg1b"
            prefix={''}
            alwaysShowRange
            hideCustomSelection
            dateType={relativeTime}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            onChange={this.timeChange}
          />
          <Popover
            getPopupContainer={getPopupContainer}
            content={this.renderCondition()} 
            title="提示：可同时选择6项"
            trigger="click"
            placement="bottom"
            overlayClassName="condition"
          >
            <Button
              className="color-purple border-purple noradius mg2r"
              style={{verticalAlign: 'top'}}
            >自定义筛选条件</Button>
          </Popover>
          {conditions.map(con => (
            <FilterCol 
              key={con.name}
              condition={con} 
              value={filter[con.name]}
              dbDimensions={dataSourceDimensions}
              dataSource={dataSource}
              topNFilters={[{col: '__time', op: 'in', eq: dateRange}]}
              onChange={filters => {
                onChange('params.filters', Object.assign({}, filter, {[con.name]: filters}))
              }}
            />)
          )}
        </div>
        {this.renderNewOldUserFetcher()}
        {this.renderNewOldUserPanel()}
        <ChartBox {...this.props} {...this.state}/>
      </section>
    )
  }
}


class ChartBox extends Component {
  
  state = {
    timeFilter: {
      dateType: ['-1 days startOf day', 'startOf day -1 ms'],
      dateRange: []
    },
    granularity: 'PT1H',
    druidData: [],
    selectMetric: '',
    selectTime: false,
    isLoadingNow: false,
    isLoadingCompare: false
  }

  componentDidMount() {
    this._otherOption = _.cloneDeep(otherOption)
    this._otherOption.forEach(o => o.tooltip = {
      formatter: this.formatter
    })
  }

  componentWillReceiveProps(nextProps) {
    const modelMetrics = this.getMetrics(nextProps)
    const {selectMetric, granularity} = this.state
    const {model} = nextProps
    let newState = _.get(model, 'params.chartBoxState', {})
    if(modelMetrics.length && !modelMetrics.find(m => m.name === selectMetric)) {
      newState.selectMetric = modelMetrics[0].name
    }

    let granularitys = this.getGranularitys(nextProps)
    if(granularitys.find(g => g.value === granularity).disabled){
      let g = granularitys.find(g => !g.disabled)
      newState.granularity = g.value
    }

    this.setState(newState)
  }

  setStateData(state) {
    let newSatae = Object.assign({}, this.state, state)
    delete newSatae.druidData
    this.props.onChange('params.chartBoxState', newSatae)
  }

  formatter = ({dataIndex, value, color, seriesIndex}) => {
    const {selectMetric, druidData, granularity} = this.state
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
    let {druidData, granularity, selectMetric, timeFilter} = this.state
    let [since, until] = getTimeRange(timeFilter)
    druidData = druidData.concat()
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

  getFilters(now) {
    const {filter, timeFilter} = this.props
    const {timeFilter: timeF} = this.state
    let filters = []
    for(let k in filter) {
      filters = filters.concat(filter[k])
    }

    const {dateType, dateRange} = now ? timeFilter : timeF

    filters.push({
      col: '__time',
      op: 'in', 
      eq: isRelative(dateType) ? dateType : dateRange
    })

    return filters
  }

  getNames(now) {
    const {timeFilter} = this.props
    const {timeFilter: timeF, selectMetric} = this.state
    const modelMetrics = this.getMetrics()

    let metric = modelMetrics.find(m => m.name === selectMetric) || {}
    let range = getTimeRange(now ? timeFilter : timeF)
    range = range.map(t => moment(t).format('YYYY-MM-DD'))
    if(range[0] === range[1]) range.pop()
    return range.join('-') + ' ' + metric.title
  }

  getMetrics(props) {
    const {metricObjs} = props || this.props
    return metricObjs
  }

  getGranularitys(props) {
    const {timeFilter} = props || this.props
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

    const {timeFilter} = this.props
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

  render() {
    const {model, isFetchingTrafficAnalyticModels} = this.props
    const {timeFilter, selectMetric, granularity, druidData, selectTime, isLoadingNow, isLoadingCompare} = this.state
    const {dateType} = timeFilter

    let relativeTime = isRelative(dateType) ? dateType : 'custom'
    let [since, until] = getTimeRange(timeFilter)
    let _druidData = selectTime ? druidData : druidData.slice(0, 1)
    const modelMetrics = this.getMetrics()
    let metric = modelMetrics.find(m => m.name === selectMetric) || {}
    let dsId = model && model.druid_datasource_id || ''
    let names = [this.getNames(true), this.getNames()]
    let granularitys = this.getGranularitys()
    return (
      <div className="mg1t">
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
        <div>
          <DruidDataFetcherOnlyRunInViewport
            dataSourceId={dsId}
            debounce={500}
            doFetch={!!(dsId && !isFetchingTrafficAnalyticModels)}
            filters={this.getFilters(true)}
            dimensions={['__time']}
            customMetrics={[metric]}
            dimensionExtraSettingDict={{'__time': {granularity, sortCol: '__time', sortDirect: 'asc', limit: 999}}}
            onData={data => this.onData(data)}
            onFetchingStateChange={isFetching => this.setState({isLoadingNow: isFetching})}
          />
          <DruidDataFetcherOnlyRunInViewport
            dataSourceId={dsId}
            debounce={500}
            doFetch={!!(selectTime && dsId && !isFetchingTrafficAnalyticModels)}
            filters={this.getFilters(false)}
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
      </div>
    )
  }
}

export default DataBox
