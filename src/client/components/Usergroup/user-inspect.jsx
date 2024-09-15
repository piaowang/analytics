import React from 'react'
import _ from 'lodash'
import {convertDateType, defaultFormat, isRelative} from '../../../common/param-transform'
import {isNumberDimension, isTimeDimension} from '../../../common/druid-column-type'
import moment from 'moment'
import {Card, message, Popover, Select} from 'antd'
import {immutateUpdate, immutateUpdates, isDiffByPath} from '../../../common/sugo-utils'
import {findSuitableGranularity, formatUseOriginalPattern} from '../../../common/druid-query-utils'
import DateRangePicker from '../Common/time-picker'
import {Button2 as Button} from '../Common/sugo-icon'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import {GranularityEnum, GranularityEnumTranslate, SmallerGranularityDict} from '../SourceDataAnalytic'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import classNames from 'classnames'
import SliceChartFacade from '../Slice/slice-chart-facade'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import AsyncTaskRunner from '../Common/async-task-runner'
import {doQuerySliceData} from '../../common/slice-data-transform'
import setStatePromiseDec from '../../common/set-state-promise'

const {Option} = Select
const defaultDateFormat = defaultFormat()
const analyticDefaultTime = '-7 days'

const changelessDims = [
  'event_time', 'sugo_nation', 'sugo_province', 'sugo_city', 'sugo_area', 'sugo_latitude', 'sugo_longitude',
  'system_name', 'system_version', 'screen_dpi', 'screen_height', 'screen_width', 'browser',
  'browser_version', 'sugo_operator', 'carrier', 'sugo_ip', 'device_brand', 'device_model'
]
const changelessDimsSet = new Set(changelessDims)
const changelessDimsIndexDict = changelessDims.reduce((acc, curr, idx) => {
  acc[curr] = idx
  return acc
}, {})
const bounderyEventNameSet = new Set(['浏览', '启动', '停留', '后台'])
const rowLastCellStyle = {width: 'calc(100% - 240px - 30px)'}

const {
  sourceDataAnalyticTimeQueryUnit = 'PT5M'
} = window.sugo

const selectSessionLimit = 500

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withDbDims(({datasourceCurrent}) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true
  })
})
@setStatePromiseDec
export default class UserInspect extends React.Component {
  state = {
    actionsFilters: [],
    actionTrendsChartGranularity: 'P1D',
    // [{sessionId: 'xxx', data: [...], byCursor: 'YYYY-MM-DD HH:mm'}, ...]
    loadingSessionInfo: null,
    loadedSessions: [],
    loadedCompleted: false,
    barChartData: [],
    loadCursor: null
  }
  
  // 用户选择了最近 5 分钟时，不应该由于时间流逝而看到不一样的数据，除非他点了刷新，所以需要一个变量记录什么时候开始查询
  beginQueryTime = null
  
  componentDidMount() {
    let {userDimName, userId, datasourceCurrent} = this.props
    let uidDimName = userDimName || _.get(datasourceCurrent, 'params.commonMetric[0]')
    this.setState({
      actionsFilters: [
        {col: this.getTimeDimName(), op: 'in', eq: '-30 days', _willChange: true},
        uidDimName && {col: uidDimName, op: 'equal', eq: [userId]}
      ].filter(_.identity)
    })
  }
  
  getTimeDimName(props = this.props) {
    return _.isObject(props.dimNameDict) && ('event_time' in props.dimNameDict) ? 'event_time' : '__time'
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    let prevTimeDimName = this.getTimeDimName(prevProps)
    if (isDiffByPath(prevProps, this.props, 'dimNameDict.event_time')) {
      let {actionsFilters} = prevState
      let nextTimeDimName = this.getTimeDimName(this.props)
      // 时间列名称变更
      this.setState({
        actionsFilters: actionsFilters.map(flt => flt.col === prevTimeDimName ? {...flt, col: nextTimeDimName} : flt)
      })
    } else {
      // 修改了时间，不应和修改时间列同时发生
      let prevTimeFlt = _.find(prevState.actionsFilters, flt => flt.col === prevTimeDimName && flt.op === 'in')
      let nextTimeFlt = _.find(this.state.actionsFilters, flt => flt.col === prevTimeDimName && flt.op === 'in')
      if (isDiffByPath(prevTimeFlt, nextTimeFlt, 'eq')) {
        this.beginQueryTime = null
        this.setState({
          loadedSessions: []
        })
      }
    }
  }
  
  renderTimeRangeInitializer() {
    let {datasourceCurrent} = this.props
    let {actionsFilters} = this.state
    let timeDimName = this.getTimeDimName()
    
    let dsId = datasourceCurrent && datasourceCurrent.id || ''
    
    return (
      <BoundaryTimeFetcher
        dataSourceId={dsId}
        doFetch={!!(dsId && timeDimName && _.some(actionsFilters, flt => flt.col === timeDimName && flt._willChange))}
        filters={actionsFilters.filter(flt => flt.col !== timeDimName)}
        timeDimName={timeDimName}
        doQueryMinTime={false}
        onTimeLoaded={(info) => {
          let {maxTime} = info || {}
          if (!maxTime) {
            let timeFltIdx = _.findIndex(actionsFilters, flt => flt.col === timeDimName)
            this.setState({
              actionsFilters: immutateUpdate(actionsFilters, [timeFltIdx], flt => _.omit(flt, '_willChange'))
            })
            return
          }
          let timeFltIdx = _.findIndex(actionsFilters, flt => flt.col === timeDimName && flt.op === 'in')
          
          // 如果 maxTime 在 analyticDefaultTime 时间范围内，则无须偏移
          let timeFlt = actionsFilters[timeFltIdx]
          let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
          let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)
          if (moment(maxTime).isAfter(since) && moment(maxTime).isBefore(until)) {
            this.setState({
              actionsFilters: immutateUpdate(actionsFilters, [timeFltIdx], flt => _.omit(flt, '_willChange'))
            })
            return
          }
          
          let newTimeFilter = {
            col: timeDimName,
            op: 'in',
            eq: [
              moment(maxTime).add(..._.trim(analyticDefaultTime).split(/\s+/)).startOf('second').toISOString(),
              moment(maxTime).add(1, 's').startOf('second').toISOString() // 上边界为开区间，需要加 1 s
            ]
          }
          
          this.setState({
            actionsFilters: immutateUpdate(actionsFilters, [timeFltIdx], () => newTimeFilter),
            actionTrendsChartGranularity: findSuitableGranularity(newTimeFilter.eq)[0]
          })
        }}
      />
    )
  }
  
  onBarClick = (obj) => {
    let { actionsFilters: filters, actionTrendsChartGranularity: granularity} = this.state
    let timeDimName = this.getTimeDimName()
    let startTime = obj.name
    // 缩小时间范围、时间粒度
    let nextTimeRange = [startTime, formatUseOriginalPattern(moment(startTime).add(moment.duration(granularity)))]
    let timeFlt = _.find(filters, flt => flt.col === timeDimName)
    if (timeFlt && _.isEqual(nextTimeRange, timeFlt.eq)) {
      message.warn('已经是最小的时间范围了')
      return
    }
    this.setState({
      actionsFilters: filters.map(flt => flt.col === timeDimName ? {...flt, eq: nextTimeRange} : flt),
      actionTrendsChartGranularity: SmallerGranularityDict[granularity]
    })
  }
  
  optionsOverwriter = option => {
    let { actionTrendsChartGranularity: granularity} = this.state
    if (!granularity) {
      granularity = 'P1D'
    }
    
    let nextOption = immutateUpdates(option,
      'grid', grid => ({
        ...grid,
        left: '4%',
        top: '15px',
        bottom: granularity === 'PT1H' || granularity === 'PT1M' ? '30px' : '10px'
      }))
    
    return nextOption
  }

  renderTrendsChart() {
    let {datasourceCurrent} = this.props
    let {
      isFetchingBarChartData, barChartData, actionsFilters: filters, actionTrendsChartGranularity: granularity,
      loadedSessions
    } = this.state
    let timeDimName = this.getTimeDimName()
    
    let timeFlt = _.find(filters, flt => flt.col === timeDimName && flt.op === 'in') || {col: '__time', op: 'in', eq: '-30 days'}
    let {eq, _willChange} = timeFlt
    let relativeTime = isRelative(eq) ? eq: 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : this.convertDateType0(relativeTime)
    
    let suitableGranularitySet = new Set(findSuitableGranularity(eq))
    return (
      <div className={'viz-panel height240 pd2t bg-white corner relative'} >
        <div className="bg-light-grey pd1y pd2x absolute itblock left2 top2 corner">
          总记录数：{_.get(barChartData, '[0]._tempMetric_rowCount') || 0}
        </div>
        <div className="aligncenter">
          <div className="itblock width500 line-height30">
            {`${moment(since).format(defaultDateFormat)} ~ ${moment(until).format(defaultDateFormat)}`}
            <Select
              className="mg2l"
              dropdownMatchSelectWidth={false}
              value={granularity || 'P1D'}
              onChange={val => {
                this.setState({actionTrendsChartGranularity: val})
              }}
            >
              {Object.keys(GranularityEnum).map(gr => {
                return (
                  <Option
                    key={gr}
                    value={gr}
                    disabled={!suitableGranularitySet.has(gr)}
                  >{GranularityEnumTranslate[GranularityEnum[gr]]}</Option>
                )
              })}
            </Select>
          </div>
        </div>
        
        <SliceChartFacade
          innerRef={ref => this._trendsChart = ref}
          rotateXAxis={false}
          showLegend={false}
          wrapperClassName="bg-white corner"
          wrapperStyle={{
            padding: '0 10px',
            height: 'calc(100% - 33px - 20px)'
          }}
          style={{height: '100%'}}
          slice={_willChange || !datasourceCurrent ? null : {
            druid_datasource_id: datasourceCurrent.id,
            params: {
              dimensions: [timeDimName],
              customMetrics: [{name: '_tempMetric_rowCount', title: '总记录数', formula: '$main.count()'}],
              metrics: ['_tempMetric_rowCount'],
              filters: [
                ...filters.filter(flt => !flt.disabled && flt.col !== timeDimName),
                {...timeFlt, eq: [since, until]} // 使用取整了的时间范围
              ],
              dimensionExtraSettingDict: {
                [timeDimName]: {
                  limit: 100,
                  sortDirect: 'asc',
                  sortCol: timeDimName,
                  granularity: granularity || 'P1D'
                }
              },
              vizType: 'dist_bar'
            }
          }}
          isThumbnail={false}
          onLoadingStateChange={isFetching => {
            if (isFetching !== isFetchingBarChartData) {
              this.setState({isFetchingBarChartData: isFetching})
            }
          }}
          onDruidData={async barChartData => {
            // 查询最后一天的 session 信息
            const resultSet = _.map(_.get(barChartData, [0, 'resultSet']), info => moment(info[timeDimName]).format('YYYY-MM-DD'))
            let lastDay = _.last(_.uniq(resultSet))
            if (_.isEmpty(lastDay)) {
              this.setState({
                barChartData,
                isFetchingBarChartData: false,
                loadingSessionInfo: null,
                loadedCompleted: true,
                loadCursor: null
              })
              return
            }
            // 从该时间节点开始往后查询，如果时间粒度小于 1 天，则从前往后加载
            let unloadedSessionInfo = await this.getFirstUnloadedSessionInfo(lastDay)
            
            this.setState({
              barChartData,
              loadCursor: lastDay,
              isFetchingBarChartData: false,
              loadingSessionInfo: unloadedSessionInfo || null,
              loadedCompleted: false
            })
          }}
          onEvents={{click: this.onBarClick}}
          optionsOverwriter={option => this.optionsOverwriter(option) /* 为了触发刷新，需要包一层 */}
        />
      </div>
    )
  }
  
  onRowDetailPopoverVisibleChange = visible => {
    if (!visible) {
      this.setState({visiblePopoverKey: null})
    } else if (visible !== true) {
      let ev = visible
      let popoverKey = ev.currentTarget.getAttribute('data-pop-key')
      this.setState({visiblePopoverKey: popoverKey})
    }
  }
  
  convertDateType0 = (timeRange) => {
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime, 'iso', 'business')
    
    // 初始化 beginQueryTime
    if (!this.beginQueryTime) {
      this.beginQueryTime = until
    }
    // 根据 until(now) 与 beginQueryTime 的偏差进行偏移
    let delta = moment(until).diff(this.beginQueryTime, 'ms')
    since = moment(since).subtract(delta, 'ms').toISOString()
    until = moment(until).subtract(delta, 'ms').toISOString()
    
    // 只要是相对时间就取整分钟，避免由于 setState 引起的刷新
    if (relativeTime !== 'custom' && moment(until).endOf('minute').valueOf() !== moment(until).valueOf()) {
      since = moment(since).startOf('minute').toISOString()
      until = moment(until).endOf('minute').toISOString()
    }
    
    return [since, until]
  }
  
  async getFirstUnloadedSessionInfo(minTime = null, extraFilters = [], offset = 0) {
    let {datasourceCurrent} = this.props
    let { actionsFilters } = this.state
    let dsId = datasourceCurrent && datasourceCurrent.id || ''
    let timeDimName = this.getTimeDimName()
    let sessionIdDimName = _.get(datasourceCurrent, 'params.commonSession')
    
    const filters = [
      ...actionsFilters,
      minTime && {col: timeDimName, op: 'greaterThanOrEqual', eq: [minTime]},
      // minTime && {col: timeDimName, op: 'in', eq: [moment(minTime).startOf('day').toISOString(), moment(maxTime).add(1, 'ms').toISOString()]},
      ...extraFilters
    ].filter(_.identity)
    
    let records = await doQuerySliceData({
      druid_datasource_id: dsId,
      params: {
        filters: filters,
        select: [timeDimName, sessionIdDimName],
        selectLimit: 1,
        selectOrderBy: '__time',
        selectOrderDirection: 'asc',
        selectOffset: offset
      }
    })
    return _.get(records, [0])
  }
  
  async querySessionDataBySessionId(sessionId, timeRange, offset) {
    let {datasourceCurrent} = this.props
    let { actionsFilters } = this.state
    let dsId = datasourceCurrent && datasourceCurrent.id || ''
    let timeDimName = this.getTimeDimName()
    let sessionIdDimName = _.get(datasourceCurrent, 'params.commonSession')
    
    return await doQuerySliceData({
      druid_datasource_id: dsId,
      params: {
        filters: [
          ...actionsFilters,
          {col: timeDimName, op: 'in', eq: timeRange},
          {col: sessionIdDimName, op: 'equal', eq: [sessionId]}
        ],
        select: ['*'],
        selectLimit: selectSessionLimit,
        selectOrderBy: '__time', /* select 只能根据 __time 排序 */
        selectOrderDirection: 'asc',
        selectOffset: offset
      }
    })
  }
  
  getCurrentTimeBound() {
    let timeDimName = this.getTimeDimName()
  
    let timeFlt = _.find(this.state.actionsFilters, flt => flt.col === timeDimName && flt.op === 'in') || {col: '__time', op: 'in', eq: '-30 days'}
    let {eq, _willChange} = timeFlt
    let relativeTime = isRelative(eq) ? eq: 'custom'
    return relativeTime === 'custom' ? eq : this.convertDateType0(relativeTime) // [since, until]
  }
  
  async getSessionDataById(sessionId, minTime, offset = 0) {
    let {datasourceCurrent} = this.props
    let timeDimName = this.getTimeDimName()
    // 限制只查上一个时间范围之前的数据
    let { actionTrendsChartGranularity: granularity, barChartData, loadCursor } = this.state
    let validDates = _.get(barChartData, [0, 'resultSet'], []).map(d => d[timeDimName])
    let prevCursor = _.find(validDates, d => moment(d).isAfter(loadCursor, 'day')) || this.getCurrentTimeBound()[1]
    
    let queryBucket = moment.duration(sourceDataAnalyticTimeQueryUnit)
  
    // 加载顺序为从一天的起始时间开始加载
    let partialTimeRange = [minTime, moment(Math.min(+moment(minTime).add(queryBucket), +moment(prevCursor))).toISOString()]
    let partialData = await this.querySessionDataBySessionId(sessionId, partialTimeRange, offset)
    // 因为 select 只能根据 __time 排序，所以这里要在前端根据 timeDim 排序
    partialData = _.orderBy(partialData, timeDimName, 'asc')
    let sessionIdDimName = _.get(datasourceCurrent, 'params.commonSession')
    
    if (_.size(partialData) < selectSessionLimit) {
      let maxTimeRecord = await this.getFirstUnloadedSessionInfo(partialTimeRange[1], [
        {col: sessionIdDimName, op: 'equal', eq: [sessionId]},
        {col: timeDimName, op: 'lessThan', eq: [prevCursor]}
      ])
      if (!maxTimeRecord) {
        return partialData
      }
      return [...partialData, ...await this.getSessionDataById(sessionId, maxTimeRecord[timeDimName])]
    }
  
    let lastTime = _(partialData).chain().last().get(timeDimName).value()
    let offsetArr = _.takeRightWhile(partialData, d => d[timeDimName] === lastTime)
    return [...partialData, ...await this.getSessionDataById(sessionId, lastTime, _.size(offsetArr))]
  }
  
  // 假设每次加载数据的时间范围是 1h （实际情况根据配置）
  // 1. 排除已经加载过的 session，加载最后一条带 sessionId 的数据（可根据柱状图的情况，从最近有数据的一条柱子）
  // 2. 存在未加载过的 sessionId，则开始加载该 session 的数据，到第 4 步
  // 3. 不存在未加载过的 sessionId，则停止加载，不允许加载更多，流程结束
  // 4. 从最后一条 session 数据开始往前加载，每次取一个小时， limit 根据配置，直到完全加载完毕，允许加载更多 sessionId
  
  // 上述第 4 步的具体流程
  // 1. 在最后一小时内加载同一 session 的数据， limit 500
  // 2. 没有数据，加载 maxTime，到第 4 步
  // 3. 存在数据，则继续加载下 500 条数据，到第 2 步
  // 4. 存在 maxTime 则继续加载，到第 2 步
  // 5. 不存在 maxTime 则停止加载，完成加载
  renderSessionDataFetcher() {
    let {datasourceCurrent, dimNameDict} = this.props
    let {
      actionsFilters, loadedSessions, barChartData, actionTrendsChartGranularity, loadedCompleted, loadingSessionInfo
    } = this.state
  
    return (
      <AsyncTaskRunner
        args={[loadingSessionInfo, actionsFilters, actionTrendsChartGranularity]}
        doRun={!_.isEmpty(dimNameDict) && !_.isEmpty(barChartData) && !loadedCompleted}
        task={async (loadingSessionInfo, filters, granularity) => {
          if (!loadingSessionInfo) {
            return
          }
          let timeDimName = this.getTimeDimName()
          let sessionIdDimName = _.get(datasourceCurrent, 'params.commonSession')
  
          let {[timeDimName]: minTime, [sessionIdDimName]: sessionId} = loadingSessionInfo
          await this.setStatePromise({
            loadedSessions: [
              ...loadedSessions,
              {sessionId, isFetching: true, byCursor: this.state.loadCursor}
            ]
          })
          let sessionData = await this.getSessionDataById(sessionId, minTime)
          this.setState(prevState => ({
            loadedSessions: prevState.loadedSessions
              .map((s, idx, arr) => idx === arr.length - 1 ? {...s, isFetching: false, data: sessionData} : s)
              .filter(s => !_.isEmpty(s.data)),
            loadingSessionInfo: null
          }))
        }}
      />
    )
  }
  
  getLastActionData() {
    let {loadedSessions} = this.state
    return _.get(loadedSessions, [0, 'data', 0], {})
  }
  
  onLoadMoreBtnClicked = async () => {
    // 假设同一瞬间只存在唯一的 session id
    // 继续查找当天剩余 session
    let { loadedSessions, actionTrendsChartGranularity, barChartData, loadCursor } = this.state
    let timeDimName = this.getTimeDimName()
    
    let {maxTimeInCursorEpoch, rowsHasSameTimestampCount} = _(loadedSessions).chain()
      .findLast({byCursor: loadCursor}).get('data', [])
      .thru(rows => {
        const maxTimeInCursorEpoch = _(rows).chain().maxBy(d => d[timeDimName]).get(timeDimName).value()
        return {
          maxTimeInCursorEpoch,
          rowsHasSameTimestampCount: _.size(_.takeRightWhile(rows, r => r[timeDimName] === maxTimeInCursorEpoch))
        }
      }).value()
  
    // 限制只查下一个时间范围之前的数据
    let validDates = _.get(barChartData, [0, 'resultSet'], []).map(d => d[timeDimName])
    let prevCursor = _.find(validDates, d => moment(d).isAfter(loadCursor, 'day')) || this.getCurrentTimeBound()[1]
  
    // 查询当天的其他 session 或者同一条 session 更早一天的数据
    let unloadedSessionInfo = await this.getFirstUnloadedSessionInfo(maxTimeInCursorEpoch, [
      {col: timeDimName, op: 'lessThan', eq: [prevCursor]}
    ], rowsHasSameTimestampCount)
    
    if (unloadedSessionInfo) {
      this.setState({
        loadingSessionInfo: unloadedSessionInfo,
        loadedCompleted: false
      })
      return
    }
    
    let nextCursor = _.findLast(validDates, d => moment(d).isBefore(loadCursor, 'day'))
    unloadedSessionInfo = nextCursor && await this.getFirstUnloadedSessionInfo(nextCursor, [
      {col: timeDimName, op: 'lessThan', eq: [loadCursor]}
    ])
    this.setState({
      loadCursor: nextCursor,
      loadingSessionInfo: unloadedSessionInfo,
      loadedCompleted: !unloadedSessionInfo
    })
  }
  
  renderSessionData() {
    let {datasourceCurrent, dimNameDict} = this.props
    let { loadedSessions, barChartData, visiblePopoverKey, loadedCompleted } = this.state
    let timeDimName = this.getTimeDimName()
    
    let totalRowCount = _.get(barChartData, '[0]._tempMetric_rowCount') || 0
    if (totalRowCount < 1) {
      return (
        <div className="pd3 aligncenter color-grey">
          时间范围内没有访问事件
        </div>
      )
    }
    let loadedRowCount = _.sumBy(loadedSessions, s => _.size(s.data))
    
    let [pageName, eventName, eventType] = _.get(datasourceCurrent, 'params.commonDimensions') || []
    
    let sessionDataGroupByDate = _(loadedSessions).groupBy(s => moment(s.byCursor).format('YYYY-MM-DD'))
      .thru(dateDict => {
        let sortedDate = _(dateDict).keys().orderBy(_.identity, 'desc').value()
        return _.pick(dateDict, sortedDate)
      })
      .value()
    
    return _.keys(sessionDataGroupByDate).map((cursorDate, idx, arr) => {
      // 合并同一天内 sessionId 一样并且连续的 session 数据
      let sameDaySessions = sessionDataGroupByDate[cursorDate].reduce((acc, curr) => {
        let lastSessInfo = _.last(acc)
        if (_.get(lastSessInfo, 'sessionId') === curr.sessionId) {
          return acc.map(s => s === lastSessInfo ? {...lastSessInfo, data: [...lastSessInfo.data, ...(curr.data || [])]} : s)
        }
        return [...acc, curr]
      }, [])
      let isFetchingNewSession = _.some(sameDaySessions, s => _.isEmpty(s.data) && s.isFetching)
      return (
        <React.Fragment key={cursorDate}>
          <div className="bg-grey-f5 line-height60 pd2x">{cursorDate}</div>
          {sameDaySessions.map((s, idx) => {
            let {data, isFetching, sessionId} = s
            return (
              <div className="corner shadow15-ddd mg2x mg2y" key={idx}>
                <div className="line-height50 pd2l">
                  <span className="mg1l pd1y pd2x bg-purple font14 color-white corner">访问开始</span>
                </div>
                {isFetching ? <span className="mg2">加载中...</span> : null}
                {(data || []).map((d, idx) => {
                  let eventNameVal = eventName && d[eventName]
                  let eventTypeVal = eventType && d[eventType]
                  let rowPopoverKey = `${sessionId}:${idx}`
                  let popVisible = visiblePopoverKey === rowPopoverKey
                  let popoverContent = popVisible && (
                    <div className="insight-detail">
                      {
                        Object.keys(d)
                          .filter(dimName => dimName in dimNameDict && (_.get(dimNameDict, [dimName, 'params', 'type']) || 'normal') === 'normal')
                          .map((dimName) => {
                            let dbDim = dimNameDict[dimName]
                            let v = isTimeDimension(dbDim)
                              ? (d[dimName] && moment(d[dimName]).format(defaultDateFormat))
                              : isNumberDimension(dbDim)
                                ? _.isNumber(d[dimName]) ? _.round(d[dimName], 2) : ''
                                : d[dimName]
                            return (
                              <div
                                key={dimName}
                                className="borderb pd1y pd2x wordbreak"
                              >
                                <b>{dbDim && dbDim.title || dimName}</b>:
                                <span className="mg1l">{v}</span>
                              </div>
                            )
                          })
                      }
                    </div>
                  )
                  return (
                    <div
                      key={idx}
                      className={classNames('pd2x pointer user-action-event-item', {'bg-grey-f7': idx % 2 === 0})}
                      data-pop-key={rowPopoverKey}
                      onClick={this.onRowDetailPopoverVisibleChange}
                    >
                      <div className={classNames('width120 aligncenter itblock line-height40 color-grey')}>
                        {moment(d[timeDimName]).format('HH:mm:ss')}
                      </div>
                      <div className={classNames('width120 aligncenter itblock elli')} >
                        {!eventTypeVal
                          ? null : (
                            <div
                              className={classNames('itblock mw120 elli', {
                                'blue-capsule': d[eventType] === '浏览' || d[eventType] === '启动',
                                'green-capsule': d[eventType] === '停留' || d[eventType] === '后台',
                                'purple-capsule': !bounderyEventNameSet.has(d[eventType])
                              })}
                            >{eventTypeVal}</div>
                          )}
                      </div>
                      <div className="pd2x itblock elli line-height40" style={rowLastCellStyle}>
                        <Popover
                          title={popVisible ? <b className="font14">{moment(d[timeDimName]).format(defaultDateFormat)} 用户行为详情</b> : ''}
                          content={popoverContent}
                          placement="right"
                          trigger="click"
                          visible={popVisible}
                          onVisibleChange={this.onRowDetailPopoverVisibleChange}
                        >
                          <span className="iblock minw250 color-black">
                            {eventNameVal}
                          </span>
                          <span className="iblock minw250 color-black">
                            {pageName && d[pageName]}
                          </span>
                        </Popover>
                      </div>
                      <div className="itblock line-height40 user-action-event-detail-btn width30 pointer aligncenter">
                        详情
                      </div>
                    </div>
                  )
                })}
                <div className="line-height50 pd2l">
                  <span className="mg1l pd1y pd2x bg-green font14 color-white corner">访问结束</span>
                </div>
              </div>
            )
          })}
          {loadedCompleted || idx !== arr.length - 1 || totalRowCount <= loadedRowCount ? null : (
            <div className="aligncenter mg2y">
              <Button
                onClick={this.onLoadMoreBtnClicked}
                loading={isFetchingNewSession}
              >加载更多</Button>
            </div>
          )}
        </React.Fragment>
      )
    })
  }
  
  render() {
    let {dimNameDict, dataSourceDimensions, style} = this.props
    // 等待清楚时间列名称才进行显示
    if (_.isEmpty(dimNameDict)) {
      return (
        <div className="pd3 aligncenter color-gray font14">加载中...</div>
      )
    }
    let {actionsFilters} = this.state
    let timeDimName = this.getTimeDimName()
    let lastActionData = this.getLastActionData()
    
    let {eq} = _.find(actionsFilters, flt => flt.col === timeDimName && flt.op === 'in') || {eq: '-30 days'}
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : this.convertDateType0(relativeTime)
    let subsetDims = dataSourceDimensions.filter(dbDim => changelessDimsSet.has(dbDim.name))
    
    return (
      <div style={{padding: '10px', height: '100%', ...(style || {})}} className="">
        <div
          style={{width: 242, marginRight: '10px'}}
          className="height-100 itblock corner bg-white"
        >
          <div className="pd2x pd2t borderb" style={{paddingBottom: '13px'}}>用户信息</div>
          
          <div className="overscroll-y pd1t" style={{height: 'calc(100% - 49px)'}}>
            {_.isEmpty(subsetDims) ? (
              <div className="aligncenter pd3t">
                <span className="color-grey">该项目暂无用户维度信息</span>
              </div>
            ) : _.orderBy(subsetDims, dbDim => (changelessDimsIndexDict[dbDim.name] + 1) || 999).map(dbDim => {
              let val = isTimeDimension(dbDim)
                ? (dbDim.name in lastActionData ? moment(lastActionData[dbDim.name]).format('YYYY-MM-DD') : '')
                : isNumberDimension(dbDim)
                  ? _.isNumber(lastActionData[dbDim.name]) ? _.round(lastActionData[dbDim.name], 2) : ''
                  : lastActionData[dbDim.name]
              
              let dimName = isTimeDimension(dbDim) ? '最近一次访问时间' : dbDim.title || dbDim.name
              return (
                <div className="line-height32 pd1x aligncenter" key={dbDim.name}>
                  <div className="itblock elli width-50 pd1r" title={dimName}>
                    {dimName}
                  </div>
                  <div className="itblock elli width-50" title={val}>
                    {val}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <Card
          title="行为记录"
          className="itblock height-100"
          style={{width: 'calc(100% - 252px)'}}
          bodyStyle={{overflowY: 'auto', height: 'calc(100% - 54px)'}}
        >
          <div className="itblock width250 pd2x">
            <DateRangePicker
              tooltipProps={{placement: 'bottomLeft'}}
              className="width-100"
              alwaysShowRange
              dateType={relativeTime}
              dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
              onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
                let nextEq = relativeTime === 'custom' ? [since, until] : relativeTime
                let timeFltIndex = _.findIndex(actionsFilters, flt => flt.col === timeDimName && flt.op === 'in')
                
                this.setState({
                  actionsFilters: immutateUpdate(actionsFilters, [timeFltIndex, 'eq'], () => nextEq),
                  actionTrendsChartGranularity: findSuitableGranularity(nextEq)[0]
                })
              }}
            />
            {this.renderTimeRangeInitializer()}
          </div>
          
          {this.renderTrendsChart()}
          
          {/*this.renderUserActionSessions()*/}
          
          {this.renderSessionDataFetcher()}
          
          {this.renderSessionData()}
        </Card>
      
      </div>
    )
  }
}
