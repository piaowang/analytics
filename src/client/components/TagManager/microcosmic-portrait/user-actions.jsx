import React, { Component } from 'react'
import { Card, Button, Spin, Select, Popover, message, Radio, Tooltip } from 'antd'
import _ from 'lodash'
import moment from 'moment'
import DateRangePicker from '../../Common/time-picker'
import { QUERY_ENGINE, DimDatasourceType, AccessDataType } from 'common/constants'
import { convertDateType, isRelative, defaultFormat } from '../../../../common/param-transform'
import { immutateUpdate, immutateUpdates } from '../../../../common/sugo-utils'
import SliceChartFacade from '../../Slice/slice-chart-facade'
import { GranularityEnum, GranularityEnumTranslate } from '../../SourceDataAnalytic/index'
import BoundaryTimeFetcher from '../../Fetcher/boundary-time-fetcher'
import DruidDataFetcher from '../../Fetcher/druid-data-fetcher'
import { isNumberDimension, isTimeDimension } from '../../../../common/druid-column-type'
import { withDbDims } from '../../Fetcher/data-source-dimensions-fetcher'
import classNames from 'classnames'
import { findSuitableGranularity, formatUseOriginalPattern } from '../../../../common/druid-query-utils'
import checkProjectType from '../tag-require'
import UserModelData from './user-model-data'

const {
  analyticDefaultTime = '-1 day'
} = window.sugo

const changelessDims = [
  'event_time', 'sugo_nation', 'sugo_province', 'sugo_city', 'sugo_area', 'sugo_latitude', 'sugo_longitude',
  'system_name', 'system_version', 'screen_dpi', 'screen_height', 'screen_width', 'browser',
  'browser_version', 'sugo_operator', 'carrier', 'sugo_ip', 'device_brand', 'device_model'
]
const changelessDimsSet = new Set(changelessDims)
const SelectOption = Select.Option
export const SmallerGranularityDict = {
  // PT1S: 'PT1S',
  PT1M: 'PT1M', // PT1S
  PT1H: 'PT1M',
  P1D: 'PT1H',
  P1W: 'P1D',
  P1M: 'P1W',
  P1Y: 'P1M'
}

const defaultDateFormat = defaultFormat()

class UserActions extends Component {

  state = {
    isFetchingBarChartData: false,
    barChartData: [],
    actionsFilters: [],
    loadedSessions: [],
    timeDimName: '',
    selectDatasourceId: '',
    actionTrendsChartGranularity: 'P1D',
    visiblePopoverKey: false,
    displayPanel: 'userActions'
  }

  constructor(props, context) {
    super(props, context)
  }

  componentDidMount() {
    const { project, datasource, userId, projectList } = this.props
    let dsId = datasource.id
    if (project.access_type === AccessDataType.Tag) {
      const actionProject = projectList.find(p => p.tag_datasource_name === project.tag_datasource_name && p.access_type !== AccessDataType.Tag) || {}
      dsId = actionProject.datasource_id
    }
    if (dsId && userId) {
      this.setActionsFilters(dsId)
    }
  }

  setActionsFilters = (dsId) => {
    const { userId, dimensions, datasourceList } = this.props
    const actionDatasource = datasourceList.find(p => p.id === dsId)

    let timeDimName = dimensions.find(p => p.name === 'event_time' && p.datasource_type === DimDatasourceType.default)
    timeDimName = _.isEmpty(timeDimName) ? '__time' : 'event_time'
    let uidDimName = _.get(actionDatasource, 'params.commonMetric[0]')
    this.setState({
      timeDimName,
      actionsFilters: [
        uidDimName && { col: uidDimName, op: 'equal', eq: [userId] },
        { col: timeDimName, op: 'in', eq: '-30 days', _willChange: true }
      ].filter(_.identity),
      selectDatasourceId: dsId
    })
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

  renderTimeRangeInitializer(dataSourceId) {
    let { actionsFilters, timeDimName } = this.state

    return (
      <BoundaryTimeFetcher
        dataSourceId={dataSourceId}
        doFetch={!!(dataSourceId && timeDimName && _.some(actionsFilters, flt => flt.col === timeDimName && flt._willChange))}
        filters={actionsFilters.filter(flt => flt.col !== timeDimName)}
        timeDimName={timeDimName}
        doQueryMinTime={false}
        onTimeLoaded={(info) => {
          let { maxTime } = info || {}
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
    let { actionsFilters: filters, actionTrendsChartGranularity: granularity, timeDimName } = this.state
    let startTime = obj.name
    // 缩小时间范围、时间粒度
    let nextTimeRange = [startTime, formatUseOriginalPattern(moment(startTime).add(moment.duration(granularity)))]
    let timeFlt = _.find(filters, flt => flt.col === timeDimName)
    if (timeFlt && _.isEqual(nextTimeRange, timeFlt.eq)) {
      message.warn('已经是最小的时间范围了')
      return
    }
    this.setState({
      actionsFilters: filters.map(flt => flt.col === timeDimName ? { ...flt, eq: nextTimeRange } : flt),
      actionTrendsChartGranularity: SmallerGranularityDict[granularity]
    })
  }

  renderTrendsChart(dataSourceId) {
    let { isFetchingBarChartData, barChartData, actionsFilters: filters, actionTrendsChartGranularity: granularity, timeDimName } = this.state

    let timeFlt = _.find(filters, flt => flt.col === timeDimName && flt.op === 'in')
    let { eq, _willChange } = timeFlt
    let relativeTime = isRelative(eq) ? eq : 'custom'
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
                this.setState({ actionTrendsChartGranularity: val })
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
          style={{ height: '100%' }}
          slice={/*_willChange ||  不知道干嘛的 导致了微观画像的一个bug*/ !dataSourceId ? null : {
            druid_datasource_id: dataSourceId,
            params: {
              dimensions: [timeDimName],
              customMetrics: [{ name: '_tempMetric_rowCount', title: '总记录数', formula: '$main.count()' }],
              metrics: ['_tempMetric_rowCount'],
              filters: [
                ...filters.filter(flt => !flt.disabled && flt.col !== timeDimName),
                { ...timeFlt, eq: [since, until] } // 使用取整了的时间范围
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
              this.setState({ isFetchingBarChartData: isFetching })
            }
          }}
          onDruidData={barChartData => {
            this.setState({
              barChartData,
              isFetchingBarChartData: false
            })
          }}
          onEvents={{ click: this.onBarClick }}
          optionsOverwriter={option => this.optionsOverwriter(option) /* 为了触发刷新，需要包一层 */}
        />
      </div>
    )
  }

  optionsOverwriter = option => {
    let { actionTrendsChartGranularity: granularity } = this.state
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

  onRowDetailPopoverVisibleChange = visible => {
    if (!visible) {
      this.setState({ visiblePopoverKey: null })
    } else if (visible !== true) {
      let ev = visible
      let popoverKey = ev.currentTarget.getAttribute('data-pop-key')
      this.setState({ visiblePopoverKey: popoverKey })
    }
  }


  renderUserSessionActions({ sessionId, filters, sessionIdDimName, dimNameDict, datasource }) {

    let dsId = datasource && datasource.id || ''

    let { timeDimName, visiblePopoverKey, lastActionData } = this.state

    let [pageName, eventName, eventType] = _.get(datasource, 'params.commonDimensions') || []

    let bounderyEventNameSet = new Set(['浏览', '启动', '停留', '后台'])
    return (
      <DruidDataFetcher
        key={sessionId}
        dataSourceId={dsId}
        doFetch={!!(dsId && sessionId)}
        filters={[...filters, { col: sessionIdDimName, op: 'equal', eq: [sessionId] }]}
        select={['*']}
        selectLimit={1000}
        selectOrderDirection="asc"
        cleanDataWhenFetching
        onData={_.isEmpty(lastActionData) ? data => {
          // 设置最后一条数据到左侧面板
          if (!_.isEmpty(data) && _.isEmpty(this.state.lastActionData)) {
            this.setState({ lastActionData: _.last(data) })
          }
        } : null}
      >
        {({ isFetching, data }) => {
          if (!isFetching && _.isEmpty(data)) {
            return null
          }
          let rowLastCellStyle = { width: 'calc(100% - 240px - 30px)' }
          return (
            <div className="corner shadow15-ddd mg2x mg2t">
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
                            ? moment(d[dimName]).format(defaultDateFormat)
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
                    className={classNames('pd2x pointer user-action-event-item', { 'bg-grey-f7': idx % 2 === 0 })}
                    data-pop-key={rowPopoverKey}
                    onClick={this.onRowDetailPopoverVisibleChange}
                  >
                    <div className={classNames('width120 aligncenter itblock line-height40 color-grey')}>
                      {moment(d[timeDimName]).format('HH:mm:ss')}
                    </div>
                    <div className={classNames('width120 line-height40 aligncenter itblock elli')} >
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
        }}
      </DruidDataFetcher>
    )
  }


  renderUserActionSessions({ dimNameDict, datasource }) {
    let dsId = datasource && datasource.id || ''
    let { actionsFilters, loadedSessions, timeDimName, barChartData } = this.state

    let { eq } = _.find(actionsFilters, flt => flt.col === timeDimName && flt.op === 'in')
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : convertDateType(relativeTime, 'iso', 'tool')

    let eqLongerThanOneDayOrNotSameDay = moment(since).add(1, 'day').isBefore(until) || !moment(since).isSame(until, 'day')
    let sessionIdDimName = _.get(datasource, 'params.commonSession')

    let totalUserCount = _.get(barChartData, '[0]._tempMetric_rowCount') || 0
    if (totalUserCount < 1) {
      return (
        <div className="pd3 aligncenter color-grey">
          时间范围内没有访问事件
        </div>
      )
    }
    return (
      <BoundaryTimeFetcher
        dataSourceId={dsId}
        doFetch={!!(dsId && timeDimName && eqLongerThanOneDayOrNotSameDay)}
        doQueryMinTime={false}
        timeDimName={timeDimName}
        forceLuceneTimeSeries
        filters={actionsFilters}
      >
        {({ isFetchingMaxTime, maxTime }) => {
          // 最终查询时长不允许超过一天，所以限制在有最新数据的那一天
          // 如果总查询时长短过一天并且是同一天，则无须查询 maxTime
          let extraTimeRange = eqLongerThanOneDayOrNotSameDay && {
            col: timeDimName, op: 'in',
            eq: [moment(maxTime).startOf('day').toISOString(), moment(maxTime).endOf('second').toISOString()]
          }
          let excludeQueryedSessionFilter = _.isEmpty(loadedSessions)
            ? null
            : { col: sessionIdDimName, op: 'not in', eq: loadedSessions }
          let mTitle = moment(eqLongerThanOneDayOrNotSameDay ? extraTimeRange.eq[0] : since)
          return (
            <div>
              <div className="bg-grey-f5 line-height60 pd2x">
                {mTitle.isSame(mTitle.clone().startOf('day')) ? mTitle.format('YYYY-MM-DD') : mTitle.format(defaultDateFormat)}
              </div>
              <DruidDataFetcher
                dataSourceId={dsId}
                doFetch={!!(dsId && sessionIdDimName && timeDimName && !isFetchingMaxTime)}
                filters={[...actionsFilters, extraTimeRange, excludeQueryedSessionFilter].filter(_.identity)}
                dimensions={[sessionIdDimName].filter(_.identity)}
                customMetrics={[
                  { name: 'maxLogTime', formula: `$main.max($${timeDimName})` }
                ]}
                dimensionExtraSettingDict={{ [sessionIdDimName]: { limit: 2, sortCol: 'maxLogTime', sortDirect: 'asc' } }}
                selectOrderDirection="asc"
                cleanDataWhenFetching
              >
                {({ isFetching, data, total }) => {
                  return (
                    <div>
                      {[...loadedSessions, ...(data || []).map(d => d[sessionIdDimName])].filter(_.identity).map(sessionId => {
                        return this.renderUserSessionActions({
                          sessionIdDimName,
                          sessionId,
                          filters: _.compact([...actionsFilters, extraTimeRange]),
                          dimNameDict,
                          datasource
                        })
                      })}

                      {_.isEmpty(data) ? null : (
                        <div className="aligncenter mg2y">
                          <Button
                            onClick={() => {
                              this.setState({
                                loadedSessions: [...(loadedSessions || []), ...(data || []).map(d => d[sessionIdDimName])]
                              })
                            }}
                            loading={isFetching}
                          >加载更多</Button>
                        </div>
                      )}
                    </div>
                  )
                }}
              </DruidDataFetcher>
            </div>
          )
        }}
      </BoundaryTimeFetcher>
    )
  }

  renderUserModelData = () => {
    let { userId } = this.props
    let { selectDatasourceId } = this.state
    return <UserModelData userId={userId} selectDatasourceId={selectDatasourceId} />
  }

  renderActionsPanel = (props) => {
    let { dataSourceDimensions, actionsFilters, timeDimName, dataSourceId, datasource } = props
    const dimNameDict = _.keyBy(dataSourceDimensions, 'name')
    if (!actionsFilters.length) return null
    let { eq } = _.find(actionsFilters, flt => flt.col === timeDimName && flt.op === 'in')
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : this.convertDateType0(relativeTime)
    return (<div>
      <div className="itblock width250 pd2x">
        <DateRangePicker
          tooltipProps={{ placement: 'bottomLeft' }}
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
        {this.renderTimeRangeInitializer(dataSourceId)}
      </div>
      {this.renderTrendsChart(dataSourceId)}
      {this.renderUserActionSessions({ dimNameDict, datasource })}
    </div>)
  }

  renderContent = (props) => {
    let { dataSourceDimensions, actionsFilters, lastActionData } = props
    const { displayPanel } = this.state
    if (!actionsFilters.length) return null
    let subsetDims = dataSourceDimensions.filter(dbDim => changelessDimsSet.has(dbDim.name))
    let changelessDimsIndexDict = changelessDims.reduce((acc, curr, idx) => {
      acc[curr] = idx
      return acc
    }, {})
    return (
      <div style={{ height: `calc(100% - 66px - ${this.onlyForUserActionInspect ? 0 : 53}px)` }} className="">

        <Card
          title="用户行为信息"
          className="itblock font13"
          style={{ width: 242, marginRight: '10px', minHeight: 'calc( 100vh - 480px)' }}
        >
          <div>
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
        </Card>

        <Card
          title="行为记录"
          className="itblock height-100 font13"
          style={{ width: 'calc(100% - 252px)', minHeight: 'calc( 100vh - 480px)' }}
        >
          <div className="alignright mg1b">
            <Button.Group>
              <Button
                type={displayPanel === 'userActions' ? 'primary' : ''}
                onClick={() => this.setState({ displayPanel: 'userActions' })}
              >
                行为序列
              </Button>
              <Button
                type={displayPanel === 'userModelData' ? 'primary' : ''}
                onClick={() => this.setState({ displayPanel: 'userModelData' })}
              >
                源数据
              </Button>
            </Button.Group>
          </div>
          { displayPanel === 'userActions' ? this.renderActionsPanel(props) : null }
          { displayPanel === 'userModelData' ? this.renderUserModelData() : null }
        </Card>
      </div>)
  }

  renderActions = withDbDims(x => x)(this.renderContent)

  render() {

    let { actionsFilters, selectDatasourceId, timeDimName, lastActionData = {} } = this.state
    let { project, projectList, datasourceList } = this.props
    let selectProject = project
    if (!actionsFilters.length) return null
    if (!selectDatasourceId) {
      if (project.access_type !== AccessDataType.Tag) {
        selectDatasourceId = project.datasource_id
      } else {
        selectProject = projectList.filter(p =>
          p.tag_datasource_name === project.tag_datasource_name
          && p.access_type !== AccessDataType.Tag
        )[0] || {}
        selectDatasourceId = selectProject.datasource_id
      }
    }
    const datasource = datasourceList.find(p => p.id === selectDatasourceId) || {}
    const dispalySelectProject = project.access_type === AccessDataType.Tag
    const datasourceSettingsNeededHint = checkProjectType({
      datasourceCurrent: datasource,
      projectCurrent: selectProject,
      moduleName: '用户画像功能'
    })

    return (
      <div style={{ height: `calc(100% - 66px - ${this.onlyForUserActionInspect ? 0 : 53}px)` }} >
        {
          dispalySelectProject ? (
            <div className="select-actions-panel">
              选择项目: <Select value={selectDatasourceId} onChange={v => this.setActionsFilters(v)} className="width150">
                {
                  projectList.filter(p =>
                    p.tag_datasource_name === project.tag_datasource_name
                    && p.access_type !== AccessDataType.Tag
                  ).map(p => <SelectOption value={p.datasource_id}>{p.name}</SelectOption>)
                }
              </Select>
            </div>
          )
            : null
        }
        {
          datasourceSettingsNeededHint
            ? datasourceSettingsNeededHint
            : this.renderActions({
              dataSourceId: selectDatasourceId,
              doFetch: !!selectDatasourceId,
              exportNameDict: true,
              datasourceType: DimDatasourceType.default,
              actionsFilters,
              timeDimName,
              lastActionData,
              datasource
            })
        }
      </div>
    )
  }

}

export default UserActions
