/**
 * Created by heganjie on 2017/7/7.
 * 源数据分析功能首页
 */
import React from 'react'
import { CloseOutlined, HeartOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Progress, Table, Select, Tooltip, Dropdown, Menu, AutoComplete, Popconfirm, Input, Modal, Button, message, notification } from 'antd'
import Icon from '../Common/sugo-icon'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'
import _ from 'lodash'
import { withHashStateDec } from '../Common/hash-connector'
import DateRangePicker, { dateOptions } from '../Common/time-picker'
import moment from 'moment'
import { convertDateType, isRelative } from '../../../common/param-transform'
import { withCommonFilter } from '../Common/common-filter'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import SliceChartFacade from '../Slice/slice-chart-facade'
import { immutateUpdate, immutateUpdates, compressUrlQuery, escape, decompressUrlQuery, eventFire, escapeForRegex, isDiffByPath } from '../../../common/sugo-utils'
import DruidColumnType, { DruidColumnTypeIcon, isTextDimension, isNumberDimension, isTimeDimension, isCharDimension } from '../../../common/druid-column-type'
import { getFormatterByDbDim } from '../Analytic/inspect-source-data'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import { browserHistory } from 'react-router'
import { synchronizer } from '../Fetcher/synchronizer'
import IsInViewport from '../Common/is-in-viewport'
import CommonSaveModal from '../Common/save-modal'
import classNames from 'classnames'
import LitePopInput from '../Common/lite-pop-input'
import smartSearch from '../../../common/smart-search'
import { CommonSearchWithDebouncedOnChange } from '../Common/search'
import { withBoundaryTime } from '../Fetcher/boundary-time-fetcher'
import { defaultFormat } from '../../../common/param-transform'
import { format } from 'd3'
import RowPreviewer from './row-previewer'
import luceneQueryParser from 'lucene-query-parser'
import { withSizeProvider } from '../Common/size-provider'
import { extent } from 'd3'
import { scrollToElement } from '../../common/scroll-to-element'
import helpLinkMap from 'common/help-link-map'
import Bread from '../Common/bread'
import { formatUseOriginalPattern } from '../../../common/druid-query-utils'
import { checkPermission } from '../../common/permission-control'
import { get, set } from '../../common/localstorage'
import { timeUnitsTree } from '../Slice/time-granularity'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import { EMPTY_VALUE_OR_NULL } from '../../../common/constants'
import AsyncTaskRunner from '../Common/async-task-runner'
import { doQueryDruidData } from '../../common/slice-data-transform'
import { withDebouncedOnChange } from '../Common/with-debounce-on-change'
import './source-data-analytic.styl'
import { Anchor } from '../Common/anchor-custom'

const AutoCompleteDebounced = withDebouncedOnChange(AutoComplete, _.identity, 500)

/**
 * 找到合适的粒度来显示时间趋势图，限制数据完整显示于某个 limit 范围内
 * 例如粒度限制为 100，查 2 小时，就将粒度调为 PT2M
 * @param timeRange
 * @param limit
 * @returns {*}
 */
export const findSuitableGranularityByLimit = (timeRange, limit = 100) => {
  let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
  let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)

  let mSince = moment(since),
    mUntil = moment(until),
    timeRangeInMs = mUntil - mSince
  function findOkGranularity(basicGranularity) {
    let range = _.get(timeUnitsTree[basicGranularity.replace(/\d+/, '_')], 'range') || [1]
    return _(range)
      .map(grNum => basicGranularity.replace(/\d+/, grNum))
      .filter(grStr => {
        return timeRangeInMs / moment.duration(grStr).asMilliseconds() <= limit
      })
      .first()
  }
  if (1 <= mUntil.diff(mSince, 'year')) {
    return ['P1W', 'P1M', 'P1Y'].map(findOkGranularity).filter(_.identity)
  } else if (100 < mUntil.diff(mSince, 'day')) {
    return ['P1W', 'P1M'].map(findOkGranularity).filter(_.identity)
  } else if (30 <= mUntil.diff(mSince, 'day')) {
    return ['P1D', 'P1W', 'P1M'].map(findOkGranularity).filter(_.identity)
  } else if (7 <= mUntil.diff(mSince, 'day')) {
    return ['P1D', 'P1W'].map(findOkGranularity).filter(_.identity)
  } else if (1 <= mUntil.diff(mSince, 'day')) {
    return ['PT1M', 'PT1H', 'P1D'].map(findOkGranularity).filter(_.identity)
  } else if (1 <= mUntil.diff(mSince, 'hour')) {
    return ['PT1M', 'PT1H'].map(findOkGranularity).filter(_.identity)
  } else {
    return ['PT1M'].map(findOkGranularity).filter(_.identity)
  }
}

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['startWith#/source-data-analytic']

const canCreateBookmark = checkPermission('post:/app/source-data-analytic-marks/')
const canEditBookmark = checkPermission('put:/app/source-data-analytic-marks/:id')
const canDeleteBookmark = checkPermission('delete:/app/source-data-analytic-marks/:id')

const {
  analyticDefaultTime = '-1 day',
  show_newest_data_at_first = true,
  sourceDataAnalyticTimeQueryUnit = 'PT5M',
  sourceDataAnalyticTextDimPreviewLen = 500,
  sourceDataAnalyticFlowStrategy = '20+20',
  sourceDataAnalyticLoadStrategy = 'auto'
} = window.sugo

const manualLoadMore = true
const manualLoad = sourceDataAnalyticLoadStrategy === 'manual'

const INIT_PAGE_SIZE = +_.trim(sourceDataAnalyticFlowStrategy).split(/\s*\+\s*/)[0]
const STEP_LOAD_PAGE_SIZE = +_.trim(sourceDataAnalyticFlowStrategy).split(/\s*\+\s*/)[1]

const percentFormat = format('.1%')
const defaultDateFormat = defaultFormat()
const { Option: AutoCompleteOption, OptGroup } = AutoComplete
const { Option } = Select
const { Group: InputGroup } = Input
const { Item: MenuItem } = Menu

const truncateTextPreview = _.partialRight(_.truncate, { length: sourceDataAnalyticTextDimPreviewLen - 1 })

const LEFT_PANEL_WIDTH = 250

const excludeDateTypeTitleSet = new Set(['本月', '上月', '上周', '最近15天', '最近30天', '最近90天', '今年', '去年', '最近一年'])
const customDateTypes = immutateUpdate(dateOptions(), 'natural', dateTypes => {
  return dateTypes.filter(dt => !excludeDateTypeTitleSet.has(dt.title))
})

export const SmallerGranularityDict = {
  // PT1S: 'PT1S',
  PT1M: 'PT1M', // PT1S
  PT1H: 'PT1M',
  P1D: 'PT1H',
  P1W: 'P1D',
  P1M: 'P1W',
  P1Y: 'P1M'
}

const timeQueryUnit = moment.duration(_.trim(sourceDataAnalyticTimeQueryUnit))

export const GranularityEnum = {
  // PT1S: 'second',
  PT1M: 'minute',
  PT1H: 'hour',
  P1D: 'day',
  P1W: 'week',
  P1M: 'month',
  P1Y: 'year'
}

export const GranularityEnumTranslate = {
  // second: '秒粒度',
  minute: '分钟粒度',
  hour: '小时粒度',
  day: '天粒度',
  week: '周粒度',
  month: '月粒度',
  year: '年粒度'
}

// 可以阻止点击按钮获得焦点
const preventDefault = ev => ev.preventDefault()

const getDefaultHashState = mainTimeDimName => ({
  select: ['*'],
  selectOrderDirection: 'desc',
  filters: [mainTimeDimName && { col: mainTimeDimName, op: 'in', eq: analyticDefaultTime, _willChange: show_newest_data_at_first }].filter(_.identity),
  granularity: mainTimeDimName ? findSuitableGranularityByLimit(analyticDefaultTime)[0] : null,
  openWith: 'source-data-analytic'
})

const defaultStateGen = () => ({
  tempKeyword: '',
  bookmarkKeyword: undefined,
  isFetchingBarChartData: false,
  isFetchingSourceData: false,
  sourceData: [],
  cursor: null,
  forceUpdateOnce: false,
  sortedSourceData: [],
  barChartData: [],
  visiblePopoverKey: null,
  currentBookmarkId: null,
  collapseVizPanel: !!get('source_data_analytic_collapse_viz_panel'),
  pageSize: INIT_PAGE_SIZE,
  expandedDimension: null,
  showLuceneHint: false,
  loadedOnce: !manualLoad, // 是否加载过数据，自动加载时总是为 true
  queryIntentId: Date.now() // 点击搜索按钮时加 1，用于强制查询新数据
})

const AfterColonRegex = /(\w+)\s*:\s*(\S*)$/
const LastDimensionNameReg = /\s*([\w]+)$/
const LastWordReg = /\s*([^\s:]+)$/

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withHashStateDec(_.identity, props => getDefaultHashState(props.mainTimeDimName))
@withBoundaryTime(({ updateHashStateByPath, datasourceCurrent, filters, mainTimeDimName }) => {
  let dsId = (datasourceCurrent && datasourceCurrent.id) || ''
  return {
    dataSourceId: dsId,
    timeDimName: mainTimeDimName,
    doFetch: !!(dsId && _.some(filters, flt => flt.col === mainTimeDimName && flt._willChange)),
    doQueryMinTime: false,
    onTimeLoaded: info => {
      let { maxTime } = info || {}
      if (!maxTime) {
        updateHashStateByPath(
          '',
          prevState => {
            let timeFltIdx = _.findIndex(prevState.filters, flt => flt.col === mainTimeDimName)
            return immutateUpdate(prevState, ['filters', timeFltIdx], flt => _.omit(flt, '_willChange'))
          },
          true
        )
        return
      }
      debug(maxTime, 'maxTime-----')
      updateHashStateByPath(
        '',
        prevState => {
          let timeFltIdx = _.findIndex(prevState.filters, flt => flt.col === mainTimeDimName && flt.op === 'in')

          // 如果 maxTime 在 analyticDefaultTime 时间范围内，则无须偏移
          let timeFlt = prevState.filters[timeFltIdx]
          let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
          let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)
          if (moment(maxTime).isAfter(since) && moment(maxTime).isBefore(until)) {
            return immutateUpdate(prevState, ['filters', timeFltIdx], flt => _.omit(flt, '_willChange'))
          }

          let newTimeFilter = {
            col: mainTimeDimName,
            op: 'in',
            eq: [
              moment(maxTime)
                .add(..._.trim(analyticDefaultTime).split(/\s+/))
                .startOf('second')
                .toISOString(),
              moment(maxTime).add(1, 's').startOf('second').toISOString() // 上边界为开区间，需要加 1 s
            ]
          }

          return immutateUpdates(
            prevState,
            ['filters', timeFltIdx],
            () => newTimeFilter,
            'granularity',
            () => findSuitableGranularityByLimit(newTimeFilter.eq)[0]
          )
        },
        true
      )
    }
  }
})
@withDbDims(({ datasourceCurrent }) => {
  let dsId = (datasourceCurrent && datasourceCurrent.id) || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    resultFilter: dbDim => dbDim.parentId === dsId && !_.get(dbDim.params, 'type'),
    exportNameDict: true
  }
})
@synchronizer(({ datasourceCurrent }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return {
    url: '/app/source-data-analytic-marks',
    modelName: 'bookmarks',
    doFetch: !!dsId,
    doSync: true,
    query: {
      where: {
        queryParams: {
          druid_datasource_id: dsId,
          params: {
            openWith: 'source-data-analytic'
          }
        }
      }
    }
  }
})
export default class SourceDataAnalytic extends React.Component {
  state = defaultStateGen()

  // 用户选择了最近 5 分钟时，不应该由于时间流逝而看到不一样的数据，除非他点了刷新，所以需要一个变量记录什么时候开始查询
  beginQueryTime = null

  componentDidMount() {
    this.loadLuceneFilter()
  }

  loadLuceneFilter(props = this.props) {
    let { filters = [] } = props
    let globalFilter = _.find(filters, flt => flt.col === '*' && flt.op === 'luceneFilter')
    let tempKeywordByHash = _.get(globalFilter, 'eq[0]') || ''
    let { tempKeyword } = this.state
    if (tempKeyword !== tempKeywordByHash) {
      this.setState({ tempKeyword: tempKeywordByHash })
    }
  }

  componentWillReceiveProps(nextProps) {
    let { filters = [] } = this.props
    // 切换数据源
    if (!_.isEmpty(this.props.datasourceCurrent) && !_.isEqual(this.props.datasourceCurrent, nextProps.datasourceCurrent)) {
      this.setState(defaultStateGen())
      browserHistory.push('/console/source-data-analytic')
    } else if (
      !_.isEqual(
        filters.filter(flt => !flt.disabled),
        nextProps.filters.filter(flt => !flt.disabled)
      ) ||
      this.props.selectOrderDirection !== nextProps.selectOrderDirection
    ) {
      const { mainTimeDimName } = nextProps
      // 搜索添加变更则清除瀑布流数据
      this.setState({
        pageSize: INIT_PAGE_SIZE,
        forceUpdateOnce: true
      })

      // 历史的搜索内容不同，需要更新搜索框
      let prevLuceneQuery = _.find(filters, flt => flt.col === '*' && flt.op === 'luceneFilter')
      let nextLuceneQuery = _.find(nextProps.filters, flt => flt.col === '*' && flt.op === 'luceneFilter')
      if (!_.isEqual(prevLuceneQuery, nextLuceneQuery)) {
        // 后退历史则还原搜索框
        this.loadLuceneFilter(nextProps)
      }

      let prevTimeFlt = _.find(filters, flt => flt.col === mainTimeDimName && flt.op === 'in') || {}
      let nextTimeFlt = _.find(nextProps.filters, flt => flt.col === mainTimeDimName && flt.op === 'in') || {}
      if (!_.isEqual(prevTimeFlt.eq, nextTimeFlt.eq)) {
        this.beginQueryTime = null
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // 如果维度存在客户端时间，则先根据 __time 排序，再根据客户端时间排序，否则直接取 sourceData
    let { dimNameDict, selectOrderDirection } = this.props
    if (_.get(dimNameDict, 'event_time') && isDiffByPath(this.state, prevState, 'sourceData')) {
      this.setState({
        sortedSourceData: _.orderBy(this.state.sourceData, ['__time', 'event_time'], [selectOrderDirection, selectOrderDirection])
      })
    }
  }

  componentWillUnmount() {
    this._selectedDimsPanel = null
    this._filtersBar = null
  }

  convertDateType0 = timeRange => {
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
      since = moment(since).add(1, 'minute').startOf('minute').toISOString()
      /*      let log = `until: ${until}, trim to: ${moment(until).endOf('minute').toISOString()}`
      if (this._log !== log) {
        debug(log)
        this._log = log
        debugger
      }*/
      until = moment(until).endOf('minute').toISOString()
    }

    return [since, until]
  }

  toggleSortOrder = () => {
    let { updateHashStateByPath } = this.props
    updateHashStateByPath(
      'selectOrderDirection',
      prevDir => (prevDir === 'desc' ? 'asc' : 'desc'),
      undefined,
      () => {
        this.setState({
          isFetchingBarChartData: false,
          isFetchingSourceData: false,
          forceUpdateOnce: true,
          pageSize: INIT_PAGE_SIZE
        })
      }
    )
  }

  luceneSearch = async query => {
    let { updateHashStateByPath, dimNameDict } = this.props
    // 有时候是回车选择某项的时候，触发了此函数，并不需要触发查询
    if (document.activeElement.tagName === 'INPUT' && query !== this.lastQuery) {
      let hasActiveSelection = !!document.querySelector('.auto-comp-drop-down .ant-select-dropdown-menu-item-active')
      if (hasActiveSelection) {
        let isDropDownHidden0 = !!document.querySelector('.auto-comp-drop-down.ant-select-dropdown-hidden')
        if (!isDropDownHidden0) {
          this.lastQuery = query
          return
        }
      }
    }
    // 检查语法
    try {
      let res = luceneQueryParser.parse(query)
      let dimEqDict = this.luceneExpSimplifier(res)
      let specificFieldNames = _.keys(dimEqDict).filter(k => k !== '*' && k !== '<implicit>')
      // 检查维度是否存在
      let dimNameNotExisted = _.find(specificFieldNames, key => !(key in dimNameDict))
      if (dimNameNotExisted) {
        let e = new Error(`不存在的维度 ${dimNameNotExisted}`)
        e.name = '维度检查失败'
        e.column = query.indexOf(dimNameNotExisted)
        throw e
      }
      // 按类型检查筛选的值，字符串维度应该是字符 'xxx'，数值/时间维度应该是数组 [a, b]
      // a: b -> {a: ['b']}
      // a: [1 TO 10] -> {a: [[1, 10]]}
      let dimNameEqInvalid = _.find(specificFieldNames, dimName => {
        let dbDim = dimNameDict[dimName]
        if ((isNumberDimension(dbDim) || isTimeDimension(dbDim)) && _.some(dimEqDict[dimName], eq => !_.isArray(eq) && eq !== '*')) {
          return true
        } else if (isCharDimension(dbDim) && _.some(dimEqDict[dimName], _.isArray)) {
          return true
        }
        return false
      })
      if (dimNameEqInvalid) {
        let dbDim = dimNameDict[dimNameEqInvalid]
        let hint = isCharDimension(dbDim) ? '字符串维度筛选语法为 field:xxx' : '数值维度的筛选语法为 field:[x TO y]'
        let e = new Error(`维度 ${dimNameEqInvalid} 的筛选语法错误，${hint}`)
        e.name = '类型检查失败'
        e.column = query.indexOf(dimNameEqInvalid)
        throw e
      }
    } catch (e) {
      if (document.activeElement !== document.body) {
        document.activeElement.blur()
      }
      notification.close('syntax-check') // 总是显示最新错误
      notification.warn({
        key: 'syntax-check',
        message: '查询语句语法错误，无法进行查询',
        description: (
          <div className='mw300 animate wordbreak'>
            <p>位于第 {e.column} 个字符</p>
            <p>
              {e.name}: {e.message}
            </p>
          </div>
        ),
        duration: 15
      })
      return
    }
    notification.close('syntax-check')
    updateHashStateByPath('filters', prevFilters => {
      let globalFilterIdx = _.findIndex(prevFilters, flt => flt.col === '*' && flt.op === 'luceneFilter')
      let newGlobalFlt = {
        col: '*',
        op: 'luceneFilter',
        eq: [query]
      }
      let nextFilters = globalFilterIdx === -1 ? [...prevFilters, newGlobalFlt] : immutateUpdate(prevFilters, globalFilterIdx, () => newGlobalFlt)

      return nextFilters.filter(flt => !_.isEmpty(_.compact(flt.eq)))
    })
  }

  selectDimension = ev => {
    ev.stopPropagation()
    let dimName = ev.currentTarget.parentNode.getAttribute('data-dim-name')
    let { updateHashStateByPath } = this.props
    updateHashStateByPath(
      'select',
      prev => (_.isEqual(['*'], prev) ? [dimName] : [...prev, dimName]),
      undefined,
      () => {
        this._selectedDimsPanel.scrollTop = this._selectedDimsPanel.scrollHeight
      }
    )
  }

  deselectDimension = ev => {
    ev.stopPropagation()
    let dimName = ev.currentTarget.parentNode.getAttribute('data-dim-name')
    let { updateHashStateByPath } = this.props
    updateHashStateByPath('select', prev => {
      let nextFlt = prev.filter(name => name !== dimName)
      return _.isEmpty(nextFlt) ? ['*'] : nextFlt
    })
  }

  onSwitchBookmarkMenuClick = async ev => {
    let { bookmarks, updateHashStateByPath } = this.props
    let dataFor = ev.domEvent.target.getAttribute('data-for')

    if (dataFor === 'delete') {
      let preDelBookmarkId = ev.key
      this.setState({ visiblePopoverKey: `deleting-bookmark:${preDelBookmarkId}` })
    } else {
      let nextBookmark = _.find(bookmarks, bm => bm.id === ev.key)
      if (nextBookmark) {
        this.setState({ currentBookmarkId: ev.key, bookmarkKeyword: undefined })
        updateHashStateByPath('', () => nextBookmark.queryParams.params)
      }
    }
  }

  genBookmarkSelectorMenu() {
    let { bookmarks } = this.props
    let { currentBookmarkId, bookmarkKeyword } = this.state
    let partialBookmarks = bookmarks.filter(bm => smartSearch(bookmarkKeyword, bm.name))

    return (
      <Menu onClick={this.onSwitchBookmarkMenuClick}>
        {_.isEmpty(partialBookmarks) ? (
          <MenuItem key='empty' disabled>
            <div className='itblock elli width100 aligncenter relative hover-display-trigger'>{bookmarkKeyword ? '查无内容' : '暂无书签'}</div>
          </MenuItem>
        ) : null}
        {partialBookmarks.map((bm, bmIdx) => {
          return (
            <MenuItem key={bm.id || bmIdx} disabled={bm.id === currentBookmarkId}>
              <div className='itblock elli width200 relative hover-display-trigger'>
                {bm.id === currentBookmarkId ? `当前书签：${bm.name}` : bm.name}
                {!canDeleteBookmark || bm.id === currentBookmarkId ? null : <Icon type='sugo-trash' className='absolute right0 hover-display-iblock' data-for='delete' />}
              </div>
            </MenuItem>
          )
        })}
      </Menu>
    )
  }

  onSearchBarChange = val => {
    if (this.skipOnceOnChange) {
      this.skipOnceOnChange = false
      return
    }
    this.setState({ tempKeyword: val })
  }

  genAutoCompleteOptions = keyword => {
    // (is_car[cursor])
    let { dataSourceDimensions, dimNameDict } = this.props

    let cursorPos = _.get(this._searchInput, 'input.selectionStart')
    // console.log('cursor pos: ', cursorPos)
    // 从光标往前匹配
    let subKeyword = keyword.substr(0, cursorPos) // (is_card: | (is_car
    let remainKeyword = keyword.substr(cursorPos) // )

    let m = subKeyword.match(AfterColonRegex)
    if (m) {
      // 对值进行自动完成
      let { sourceData } = this.state
      let dimName = m[1] // is_card
      let valKeyword = m[2] // 已
      let cand

      let dbDim = (dimNameDict && dimNameDict[dimName]) || { name: dimName, type: DruidColumnType.String }

      if (isTimeDimension(dbDim)) {
        let [min, max] = extent(
          sourceData.map(d => d[dimName]),
          v => moment(v).valueOf()
        )
        cand = _.isNumber(min) && _.isNumber(max) ? [`[${escape(moment(min).format())} TO ${escape(moment(max).format())}]`] : []
      } else if (isNumberDimension(dbDim)) {
        let [min, max] = extent(sourceData.map(d => d[dimName]))
        cand = _.isNumber(min) && _.isNumber(max) ? [`[${min} TO ${max}]`] : []
      } else {
        cand = _.uniq(
          sourceData
            .map(d => d[dimName])
            .filter(val => smartSearch(valKeyword, val))
            .filter(_.identity)
        )
      }
      return _.take(cand, 25).map(val => {
        if (!_.startsWith(val, '[') && val.match(/\s/)) {
          val = `"${val}"`
        }
        let autoFill = valKeyword ? `${subKeyword.replace(new RegExp(escapeForRegex(valKeyword) + '$', 'i'), val)}${remainKeyword}` : `${subKeyword}${val}${remainKeyword}`
        return (
          <AutoCompleteOption key={val} value={autoFill}>
            {val}
          </AutoCompleteOption>
        )
      })
    }

    // 维度名称自动完成
    let m1 = subKeyword.match(LastDimensionNameReg)
    let dimKeyword = m1 && m1[1] // is_car
    return dataSourceDimensions
      .map(dbDim => {
        let text = dbDim.title && dbDim.title !== dbDim.name ? `${dbDim.name}（${dbDim.title}）` : dbDim.name
        let autoFill = dimKeyword
          ? `${subKeyword.replace(new RegExp(escapeForRegex(dimKeyword) + '$', 'i'), dbDim.name)}:${remainKeyword}`
          : `${subKeyword}${dbDim.name}:${remainKeyword}`
        return (
          <AutoCompleteOption key={dbDim.name} value={autoFill}>
            {text}
          </AutoCompleteOption>
        )
      })
      .filter(dom => !dimKeyword || smartSearch(dimKeyword, dom.props.children))
  }

  onAutoCompleteSelected = (val, option) => {
    if (option.key in this.props.dimNameDict) {
      // this.skipOnceOnChange = true // 不跳过一次的话，AutoComplete 会直接设置搜索框的 value 为 val
      // tempKeyword 仍是旧的
      setTimeout(() => {
        let input = this._searchInput.input
        // 将光标移动到刚刚补全的值后面
        let targetCursor = input.value.indexOf(option.key)
        if (targetCursor !== -1) {
          targetCursor += option.key.length + 1 // ':' length is 1
          input.selectionEnd = input.selectionStart = targetCursor
        }
        eventFire(input, 'click')
      }, 150)
    } else {
      setTimeout(() => {
        let input = this._searchInput.input
        // 将光标移动到刚刚补全的值后面
        let str = option.props.children + ''
        if (!_.startsWith(str, '[') && str.match(/\s/)) {
          str = `"${str}"`
        }

        let targetCursor = input.value.indexOf(str)
        if (targetCursor !== -1) {
          targetCursor += str.length
          input.selectionEnd = input.selectionStart = targetCursor
        }
      }, 150)
    }
  }

  renderLuceneHint() {
    return [
      <OptGroup
        key='__luceneHintWrapper'
        label={
          <a
            onMouseDown={preventDefault}
            onClick={() => {
              this.setState({ showLuceneHint: false })
            }}
            className='absolute right0 mg2x pointer'
          >
            我知道了
          </a>
        }
      >
        <Option key='__luceneHint' className='relative ignore-mouse'>
          <p>搜索帮助</p>

          <p className='mg1t'>模糊查找：exception: *INFO*</p>
          <p>完全匹配：message: "hello world"</p>
          <p>数值范围（闭区间）：status: [400 TO 499]</p>
          <p>数值范围（开区间）：status: {'{400 TO 499}'}</p>
          <p>大于等于某个数值：status: [400 TO *]</p>
          <p>小于某个数值：status: {'{* TO 500}'}</p>
          <p>时间范围（不指定时区则为零时区）：event_time: [2017\-07\-17 TO 2017\-07\-17T21\:00\+08\:00]</p>
          <p>多个条件组合：status: [400 TO 499] AND (extension:php OR extension:html)</p>
          <p>否定查找：*:* NOT exception: *INFO*</p>
          <p>简单正则匹配：tel: /13[0-9]{'{9}'}/</p>

          <p>PS：遇到以下字符 {'+ - = & | > < ! ( ) { } [ ] ^ " ~ * ? : \\ /'} 或空格则需要在前面加 \ 进行转义操作</p>
        </Option>
      </OptGroup>
    ]
  }

  onSearchBtnClick = () => {
    let { filters } = this.props
    let luceneFilter = _.find(filters, flt => flt.col === '*' && flt.op === 'luceneFilter') || { eq: '' }
    let currLuceneFilterStr = _.isArray(luceneFilter.eq) ? luceneFilter.eq[0] : luceneFilter.eq
    if (currLuceneFilterStr !== this.state.tempKeyword) {
      this.luceneSearch(this.state.tempKeyword)
    } else {
      // 触发强制刷新
      this.beginQueryTime = null

      this.setState(
        {
          isFetchingBarChartData: true,
          isFetchingSourceData: true,
          pageSize: INIT_PAGE_SIZE,
          forceUpdateOnce: true,
          loadedOnce: true,
          queryIntentId: Date.now()
        },
        () => {
          this._trendsChartDataFetcher.run()
          this._dataFetcher.run()
        }
      )
    }
  }

  renderTopBar = () => {
    let { bookmarks, modifyBookmarks, datasourceCurrent, updateHashState, mainTimeDimName, ...rest } = this.props
    let { tempKeyword, visiblePopoverKey, currentBookmarkId, showLuceneHint, isFetchingBarChartData, isFetchingSourceData, loadedOnce } = this.state

    let currBookmarkIdx = currentBookmarkId && _.findIndex(bookmarks, bm => bm.id === currentBookmarkId)
    let currBookmark = currBookmarkIdx !== -1 ? bookmarks[currBookmarkIdx] : null
    let options = showLuceneHint ? this.renderLuceneHint() : this.genAutoCompleteOptions(tempKeyword)

    let { eq } = _.find(rest.filters, flt => flt.col === mainTimeDimName && flt.op === 'in')
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : this.convertDateType0(relativeTime)
    const isCondChanged = !_.isEqual(_.get(this._trendsChartDataFetcher, 'state.result.slice'), _.get(this._trendsChartDataFetcher, 'props.args[0]'))
    return (
      <div className='pd1y bg-grey'>
        <div className='itblock width250 pd2x'>
          <DateRangePicker
            dateTypes={customDateTypes}
            tooltipProps={{ placement: 'bottomLeft' }}
            className='width-100'
            alwaysShowRange
            dateType={relativeTime}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
              let nextEq = relativeTime === 'custom' ? [since, until] : relativeTime
              let timeFltIndex = _.findIndex(rest.filters, flt => flt.col === mainTimeDimName && flt.op === 'in')
              updateHashState(prevState => {
                return immutateUpdates(
                  prevState,
                  `filters[${timeFltIndex}].eq`,
                  () => nextEq,
                  'granularity',
                  () => findSuitableGranularityByLimit(nextEq)[0]
                )
              })
            }}
            popoverProps={{
              visible: visiblePopoverKey === 'sourceDataTimePicker',
              onVisibleChange: (isVisible, by) => {
                if (isVisible || by) {
                  this.setState({ visiblePopoverKey: isVisible && 'sourceDataTimePicker' })
                }
              }
            }}
          />
        </div>

        <InputGroup compact className='itblock-force mg2l sd-input-wrap' style={{ width: 'calc(100% - 250px - 347px - 16px)' }}>
          <AutoCompleteDebounced
            dataSource={options}
            className='make-cornerr0 height32'
            style={{ width: 'calc(100% - 100px)' }}
            dropdownClassName='auto-comp-drop-down'
            onSelect={this.onAutoCompleteSelected}
            // onSearch={this.luceneSearch}
            filterOption={() => true}
            value={tempKeyword}
            optionLabelProp='value'
            onChange={this.onSearchBarChange}
            defaultActiveFirstOption={false}
            dropdownMatchSelectWidth={false}
          >
            <Input
              className='isMeeee'
              ref={ref => (this._searchInput = ref)}
              placeholder='搜索...'
              onPressEnter={ev => this.luceneSearch(ev.target.value)}
              style={{ width: '100%', height: '32px', boxSizing: 'border-box', overflow: 'hidden', paddingTop: '0px', paddingBottom: '0px', borderRadius: '4px 0px 0px 4px' }}
              suffix={
                <Icon
                  style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  className='font16'
                  type='question-circle-o'
                  onMouseDown={preventDefault}
                  onClick={() => {
                    this.setState({ showLuceneHint: !showLuceneHint })
                  }}
                />
              }
            />
          </AutoCompleteDebounced>
          <Button
            className='width100 relative'
            style={{ borderRadius: '0px 4px 4px 0px', backgroundColor: '#1bb39c', borderColor: '#1bb39c', boxSizing: 'border-box', padding: '0px' }}
            type={!loadedOnce || isCondChanged ? 'primary' : 'success'}
            disabled={isFetchingSourceData || isFetchingBarChartData}
            onClick={this.onSearchBtnClick}
          >
            {/* {'\u00a0'} */}
            {/* <Icon className="center-of-relative font23 mg0" type="search"/> */}
            <SearchOutlined style={{ fontSize: '23px', color: '#fff', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
          </Button>
        </InputGroup>

        <div className='itblock color-white font16 line-height32 fpointer mg0' style={{ width: 347 }}>
          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            <Button
              icon={<CloseOutlined />}
              className='itblock mg1r mg2l'
              style={{ borderRadius: '4px', fontSize: '13px' }}
              onClick={() => {
                // 只清空搜索框，不清空时间范围
                let { filters } = this.props
                let luceneFilter = _.find(filters, flt => flt.col === '*' && flt.op === 'luceneFilter') || { eq: '' }
                let currLuceneFilterStr = _.isArray(luceneFilter.eq) ? luceneFilter.eq[0] : luceneFilter.eq
                if (!_.isEmpty(currLuceneFilterStr)) {
                  this.setState({ tempKeyword: '' }, () => this.onSearchBtnClick())
                } else if (!_.isEmpty(tempKeyword)) {
                  this.setState({ tempKeyword: '' })
                }
              }}
            >
              清空搜索
            </Button>

            <CommonSaveModal
              modelType='书签'
              visible={visiblePopoverKey === 'source-data-analytic-bookmark-save-modal'}
              onVisibleChange={visible => {
                this.setState({ visiblePopoverKey: visible && 'source-data-analytic-bookmark-save-modal' })
              }}
              allowCreate={canCreateBookmark}
              allowUpdate={canEditBookmark}
              currModelName={currBookmark && currBookmark.name}
              canSaveAsOnly={!currBookmark}
              onSaveAs={async newName => {
                let resObj = await modifyBookmarks('', prevBookmarks => {
                  return [
                    ...prevBookmarks,
                    {
                      name: newName,
                      queryParams: {
                        druid_datasource_id: datasourceCurrent.id,
                        params: _.pick(rest, Object.keys(getDefaultHashState(mainTimeDimName)))
                      }
                    }
                  ]
                })
                if (!_.some(resObj.resCreate, x => !x)) {
                  message.success('创建书签成功')
                }
              }}
              onUpdate={async newName => {
                let resObj = await modifyBookmarks([currBookmarkIdx], prevBookmark => {
                  return immutateUpdates(
                    prevBookmark,
                    'name',
                    () => newName,
                    'queryParams',
                    () => ({
                      druid_datasource_id: datasourceCurrent.id,
                      params: _.pick(rest, Object.keys(getDefaultHashState(mainTimeDimName)))
                    })
                  )
                })
                if (!_.some(resObj.resUpdate, x => !x)) {
                  message.success('更新书签成功')
                }
              }}
              placement='bottomRight'
              arrowPointAtCenter
            >
              <Button className='itblock mg1r' style={{ borderRadius: '4px', fontSize: '13px' }} icon={<HeartOutlined />}>
                保存书签
              </Button>
            </CommonSaveModal>

            {this.renderBookmarkPicker()}
          </div>
        </div>
      </div>
    )
  }

  renderBookmarkPicker = () => {
    let { bookmarks, modifyBookmarks } = this.props
    let { visiblePopoverKey, bookmarkKeyword, currentBookmarkId } = this.state

    let preDelBookmarkId = _.startsWith(visiblePopoverKey, 'deleting-bookmark:') ? visiblePopoverKey.split(':')[1] : null

    let currBookmark = currentBookmarkId && _.find(bookmarks, bm => bm.id === currentBookmarkId)
    return (
      <Dropdown
        overlay={this.genBookmarkSelectorMenu()}
        trigger={['click']}
        visible={visiblePopoverKey === 'source-data-analytic-bookmark-list'}
        // onVisibleChange={isVisible => {
        //   this.setState({visiblePopoverKey: isVisible && 'source-data-analytic-bookmark-list'})
        // }}
      >
        <Popconfirm
          title={preDelBookmarkId ? `确定删除书签 ${_.find(bookmarks, m => m.id === preDelBookmarkId).name} ？` : ''}
          placement='bottomLeft'
          trigger='click'
          onConfirm={async () => {
            let resObj = await modifyBookmarks('', prevBookmarks => {
              return prevBookmarks.filter(bm => bm.id !== preDelBookmarkId)
            })
            if (!_.some(resObj.resDelete, x => !x)) {
              message.success('删除书签成功')
            }
            this.setState({ visiblePopoverKey: null })
          }}
          visible={!!preDelBookmarkId}
          onVisibleChange={visible => {
            if (!visible) {
              this.setState({ visiblePopoverKey: null })
            }
          }}
        >
          <CommonSearchWithDebouncedOnChange
            className={classNames('bookmark-picker itblock width100 hover-display-trigger', {
              width210: !((canEditBookmark && currBookmark) || canCreateBookmark)
            })}
            value={bookmarkKeyword === undefined && currBookmark ? currBookmark.name : bookmarkKeyword}
            onChange={val => this.setState({ bookmarkKeyword: val })}
            placeholder='选择书签'
            onFocus={() => {
              this.setState({ visiblePopoverKey: 'source-data-analytic-bookmark-list', bookmarkKeyword: '' })
            }}
            onBlur={() => {
              setTimeout(() => {
                if (this.state.visiblePopoverKey === 'source-data-analytic-bookmark-list') {
                  this.setState({ visiblePopoverKey: null, bookmarkKeyword: undefined })
                }
              }, 500)
            }}
            suffix={
              currBookmark ? (
                <Icon
                  type='cross-circle'
                  className='color-000-25 font12 hover-display-iblock'
                  title='取消选择书签'
                  onClick={() => {
                    this.setState({ currentBookmarkId: null, bookmarkKeyword: undefined })
                  }}
                />
              ) : null
            }
          />
        </Popconfirm>
      </Dropdown>
    )
  }

  toggleDimensionExpand = ev => {
    let dimName = ev.currentTarget.getAttribute('data-dim-name')
    this.setState(
      prevState => {
        return {
          expandedDimension: prevState.expandedDimension === dimName ? null : dimName
        }
      },
      () => {
        this.forceUpdate() // 为了使用正确的 offsetHeight
      }
    )
  }

  renderDimValFreq = dbDim => {
    if (isTextDimension(dbDim)) {
      return <div className='bg-grey-f7 color-light-blue pd2x'>Text 类型维度不支持统计</div>
    }
    let { sourceData, isFetchingSourceData } = this.state
    if (isFetchingSourceData) {
      return <div className='bg-grey-f7 pd2x'>数据正在加载...</div>
    }
    let dimName = dbDim.name
    let groupByDimName = _.groupBy(sourceData, isNumberDimension(dbDim) ? d => (_.isNumber(d[dimName]) ? d[dimName] : EMPTY_VALUE_OR_NULL) : d => d[dimName] || EMPTY_VALUE_OR_NULL)
    let sortedKey = _.orderBy(_.keys(groupByDimName), dimName => groupByDimName[dimName].length, 'desc')
    return (
      <div
        className='bg-grey-f7 pd2x line-height20'
        onClick={ev => {
          ev.stopPropagation()
          let action = ev.target.getAttribute('data-action')
          if (!action) {
            return
          }
          let dimVal = ev.target.parentNode.getAttribute('data-dim-val')
          this.handleShortcutIconAction({ [dbDim.name]: dimVal }, dbDim.name, action)
        }}
      >
        {_.take(sortedKey, 5).map((dimVal, idx, arr) => {
          let percent = _.round((groupByDimName[dimVal].length / sourceData.length) * 100, 1)
          return (
            <div key={dimVal} className={classNames('pd1t', { pd1b: idx === arr.length - 1 })}>
              <div className='relative'>
                <span className='itblock elli mw--50'>{isNumberDimension(dbDim) && dimVal !== EMPTY_VALUE_OR_NULL ? _.round(dimVal, 3) : dimVal}</span>
                <div className='absolute right1 top0' data-dim-val={dimVal}>
                  <Tooltip overlay='将该维度值加入筛选，以包含筛查' mouseEnterDelay={0.5}>
                    <Icon type='plus-circle-o' className='mg1r fpointer' data-action='includeDimVal' />
                  </Tooltip>
                  <Tooltip overlay='将该维度值加入筛选，以排除筛查' mouseEnterDelay={0.5}>
                    <Icon type='minus-circle-o' className='mg1r fpointer' data-action='excludeDimVal' />
                  </Tooltip>
                </div>
              </div>
              <FixWidthHelper toFix='last' toFixWidth='50px'>
                <Progress percent={percent} showInfo={false} />
                <span className='ant-progress-text'>{percentFormat(percent / 100)}</span>
              </FixWidthHelper>
            </div>
          )
        })}
      </div>
    )
  }

  renderDimensionsPanel = withCommonFilter(({ keywordInput: KeywordInput, keyword }) => {
    let { dataSourceDimensions, dimNameDict, select, filters, mainTimeDimName } = this.props
    let { expandedDimension } = this.state

    let selectedDimensionsSet = new Set(select)
    let notSelectedDbDims = dataSourceDimensions.filter(dbDim => dbDim.name !== mainTimeDimName && !selectedDimensionsSet.has(dbDim.name))

    if (keyword) {
      notSelectedDbDims = notSelectedDbDims.filter(dbDim => smartSearch(keyword, dbDim.title || dbDim.name))
    }

    return (
      <div className='height-100'>
        <div className='pd2'>
          <KeywordInput placeholder='搜索维度' />
        </div>

        <div className='bg-white' style={{ height: 'calc(100% - 64px)' }}>
          <h3 className={classNames('pd1 color-light-blue bg-grey font14', { hide: select[0] === '*' })}>
            <Icon type='sugo-dimension mg1r' />
            所选维度
          </h3>

          <div
            className='overscroll-y hide-scrollbar-y'
            style={{ maxHeight: 'calc(50% - 32px)' }}
            ref={ref => {
              if (ref && !this._selectedDimsPanel) {
                this._selectedDimsPanel = ref
                this.forceUpdate()
              }
            }}
          >
            {select.map(dimName => {
              if (dimName === '*') {
                return null
              }
              let dbDim = dimNameDict[dimName] || { name: dimName, type: DruidColumnType.String }
              return (
                <Tooltip key={dimName} overlay={dimName} mouseEnterDelay={0.5}>
                  <div
                    className={classNames('fpointer line-height30 hover-display-trigger hover-bg-grey-blue relative elli', {
                      'bg-grey-blue': expandedDimension === dimName
                    })}
                    data-dim-name={dbDim.name}
                    onClick={this.toggleDimensionExpand}
                  >
                    <Icon type={DruidColumnTypeIcon[dbDim.type]} className='font20 line-height30 itblock-force mg2l mg1r' />
                    <span className='mw--75 itblock elli color-blue'>{dbDim.title || dimName}</span>
                    <Tooltip overlay='将该维度移出“所选维度”' mouseEnterDelay={0.5}>
                      <Icon
                        type='minus'
                        className='fpointer absolute right2 color-white hover-display-iblock font20 mg1y hover-blur-trigger hover-blur-7'
                        onClick={this.deselectDimension}
                      />
                    </Tooltip>
                    {expandedDimension === dimName ? this.renderDimValFreq(dbDim) : null}
                  </div>
                </Tooltip>
              )
            })}
          </div>

          <h3 className='pd1 color-light-blue bg-grey font14 mg0'>
            <Icon type='sugo-dimension mg1r' />
            可用维度
          </h3>

          <div
            className='overscroll-y hide-scrollbar-y'
            style={{
              height: `calc(100% - 31px - ${select[0] === '*' ? 0 : 31}px - ${_.get(this._selectedDimsPanel, 'offsetHeight') || select.filter(s => s !== '*').length * 30}px)`
            }}
          >
            {notSelectedDbDims.map(dbDim => {
              return (
                <Tooltip key={dbDim.name} overlay={dbDim.name} mouseEnterDelay={0.5}>
                  <div
                    className={classNames('fpointer line-height30 hover-display-trigger hover-bg-grey-blue relative elli', {
                      'bg-grey-blue': expandedDimension === dbDim.name
                    })}
                    data-dim-name={dbDim.name}
                    onClick={this.toggleDimensionExpand}
                  >
                    <Icon type={DruidColumnTypeIcon[dbDim.type]} className='font20 line-height30 itblock-force mg1r mg2l' />
                    <span className='mw--75 itblock elli color-blue'>{dbDim.title || dbDim.name}</span>
                    <Tooltip overlay='将该维度加入“所选维度”' mouseEnterDelay={0.5}>
                      <Icon
                        type='plus'
                        className='fpointer absolute right2 color-white hover-display-iblock font20 mg1y hover-blur-trigger hover-blur-7'
                        onClick={this.selectDimension}
                      />
                    </Tooltip>
                    {expandedDimension === dbDim.name ? this.renderDimValFreq(dbDim) : null}
                  </div>
                </Tooltip>
              )
            })}
            {_.isEmpty(notSelectedDbDims) ? (
              <div className='line-height30 pd2x aligncenter color-gray'>暂无内容</div>
            ) : (
              <div className='line-height30 pd2x aligncenter color-gray'>———— 到底了 ————</div>
            )}
          </div>
        </div>
      </div>
    )
  })

  luceneExpSimplifier = (exp, currField = null) => {
    if (_.isEmpty(exp)) {
      return null
    }
    // node
    if ('left' in exp) {
      let sLeft = this.luceneExpSimplifier(exp.left, currField || exp.field)
      let sRight = this.luceneExpSimplifier(exp.right, currField || exp.field)
      return _.mergeWith(sLeft, sRight, (objValue, srcValue) => {
        if (_.isArray(objValue)) {
          return objValue.concat(srcValue)
        }
      })
    }
    // leaf
    let { field, term, term_min, term_max } = exp
    return {
      [field || currField]: term ? [term] : _.isString(term_min) ? [[term_min.replace(/\\/g, ''), term_max.replace(/\\/g, '')]] : [[term_min, term_max]]
    }
  }

  extractHighlightConfig = _.memoize(query => {
    let { dimNameDict } = this.props
    try {
      let parseResult = luceneQueryParser.parse(query)
      // console.log(JSON.stringify(parseResult, null, 2))

      // a:b or x:y -> {a: ['b'], x: ['y']}
      // a: (b OR c) -> {a: ['b', 'c']}
      // a: [1 TO 10] -> {a: [[1, 10]]}
      let simp = this.luceneExpSimplifier(parseResult)
      // console.log(JSON.stringify(simp, null, 2))

      // {a: ['b', 'c?', 'd*']} -> {a: /b|c.?|d.*/}
      const toReplace = /([?*])/g
      let checkerDict = _.mapValues(simp, (condVals, key) => {
        let dbDim = dimNameDict[key] || { name: key, type: DruidColumnType.String }
        if (isNumberDimension(dbDim)) {
          let rangeCheckers = condVals.map(r => {
            return _.overEvery([r[0] === '*' ? undefined : n => r[0] <= n, r[1] === '*' ? undefined : n => n <= r[1]].filter(_.identity))
          })
          return _.overSome(rangeCheckers)
        } else if (isTimeDimension(dbDim)) {
          let rangeCheckers = condVals.map(r => {
            return _.overEvery(
              [r[0] === '*' ? undefined : (min => n => min <= n)(moment(r[0]).valueOf()), r[1] === '*' ? undefined : (max => n => n <= max)(moment(r[1]).valueOf())].filter(
                _.identity
              )
            )
          })
          let checker = _.overSome(rangeCheckers)
          return timeStr => {
            let m = moment(timeStr)
            return checker(m.valueOf())
          }
        }
        let regStr = condVals.map(v => v.replace(toReplace, '.$1')).join('|')
        return new RegExp(`^(?:${regStr})$`)
      })
      return checkerDict
    } catch (e) {
      debug('解析出错: ' + query, e)
    }
    return null
  })

  generateTableColumns = spWidth => {
    let { dimNameDict, select, selectOrderDirection, mainTimeDimName } = this.props
    let tableColMapper = dimName => {
      let dbDim = dimNameDict[dimName] || { name: dimName, type: DruidColumnType.String }
      return {
        title: dbDim.title || dimName,
        dataIndex: dimName,
        key: dimName,
        width: 150,
        className: 'elli mw400',
        render: getFormatterByDbDim(dbDim)
      }
    }

    let baseCols = [
      {
        title: '序号',
        width: 70,
        key: 'idx',
        className: 'aligncenter-force elli',
        render: (val, row, index) => index + 1
      },
      tableColMapper(mainTimeDimName)
    ]

    baseCols = immutateUpdate(baseCols, [1, 'title'], prevTitle => {
      return <a className='pointer' onClick={this.toggleSortOrder}>{`${prevTitle} ${selectOrderDirection !== 'asc' ? '↓' : '↑'}`}</a>
    })

    if (_.isEmpty(select) || select[0] === '*') {
      let { tempKeyword } = this.state
      let highlightConfig = this.extractHighlightConfig(tempKeyword)
      let style = { maxWidth: spWidth - 50 - 70 - 150 - 18 } // 18 为 ie11 的滚动条宽度
      return [
        ...baseCols,
        {
          title: '源数据',
          dataIndex: '__rowId',
          key: '__rowId',
          width: undefined,
          render: (rowId, record) => {
            return <RowPreviewer mainTimeDimName={mainTimeDimName} style={style} dimNameDict={dimNameDict} rowData={record} highlightConfig={highlightConfig} />
          }
        }
      ]
    }
    return [...baseCols, ...select.map(tableColMapper)]
  }

  handleShortcutIconAction = (record, dimName, action) => {
    let { updateHashStateByPath, select } = this.props
    switch (action) {
      case 'includeDimVal':
        updateHashStateByPath('filters', prevFilters => {
          let nextFlt =
            record[dimName] && record[dimName] !== EMPTY_VALUE_OR_NULL
              ? { col: dimName, op: 'equal', eq: [record[dimName]] }
              : { col: dimName, op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL] }
          if (_.some(prevFilters, flt => _.isEqual(flt, nextFlt))) {
            return prevFilters
          }
          let coFilterIdx = _.findIndex(prevFilters, flt => {
            return flt.col === nextFlt.col && _.isEqual(flt.eq, nextFlt.eq) && _.startsWith(flt.op, 'not ')
          })
          if (coFilterIdx !== -1) {
            // 存在相反的 filter，直接覆盖
            return immutateUpdate(prevFilters, [coFilterIdx], () => nextFlt)
          }
          return [...prevFilters, nextFlt]
        })
        break
      case 'excludeDimVal':
        updateHashStateByPath('filters', prevFilters => {
          let nextFlt =
            record[dimName] && record[dimName] !== EMPTY_VALUE_OR_NULL
              ? { col: dimName, op: 'not equal', eq: [record[dimName]] }
              : { col: dimName, op: 'not nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL] }
          if (_.some(prevFilters, flt => _.isEqual(flt, nextFlt))) {
            return prevFilters
          }
          let coFilterIdx = _.findIndex(prevFilters, flt => {
            return flt.col === nextFlt.col && _.isEqual(flt.eq, nextFlt.eq) && !_.startsWith(flt.op, 'not ')
          })
          if (coFilterIdx !== -1) {
            // 存在相反的 filter，直接覆盖
            return immutateUpdate(prevFilters, [coFilterIdx], () => nextFlt)
          }
          return [...prevFilters, nextFlt]
        })
        break
      case 'selectDim':
        if (_.includes(select, dimName)) {
          updateHashStateByPath('select', prev => {
            let nextFlt = prev.filter(name => name !== dimName)
            return _.isEmpty(nextFlt) ? ['*'] : nextFlt
          })
        } else {
          updateHashStateByPath(
            'select',
            prev => (_.isEqual(['*'], prev) ? [dimName] : [...prev, dimName]),
            undefined,
            () => {
              this._selectedDimsPanel.scrollTop = this._selectedDimsPanel.scrollHeight
            }
          )
        }
        break
      default:
        throw new Error('Not supported action: ' + action)
    }
  }

  expandedRowRender = record => {
    let { dimNameDict, select, filters, selectOrderDirection, mainTimeDimName } = this.props
    let { __rowId, [mainTimeDimName]: mainTimeDimVal, ...rest } = record

    let selectedSet = new Set(select)

    let remainWidthStyle = { width: 'calc(100% - 180px)' }

    let getViewDetailBtn = focusDim => {
      let [, offset] = __rowId.split('_')

      let cond = {
        filters: [
          ...filters.filter(flt => !flt.disabled && flt.col !== mainTimeDimName),
          { col: mainTimeDimName, op: 'greaterThanOrEqual', eq: [mainTimeDimVal] },
          { col: mainTimeDimName, op: 'lessThanOrEqual', eq: [mainTimeDimVal] }
        ],
        selectOffset: isFinite(offset) ? +offset : 0,
        selectOrderDirection,
        focusDim
      }
      return (
        <a
          className='mg2l pointer'
          onClick={() => {
            this.setState({ visiblePopoverKey: `row-inspecting:${compressUrlQuery(cond)}` })
          }}
        >
          查看完整日志
        </a>
      )
    }
    return (
      <div
        className='line-height30'
        onClick={ev => {
          let action = ev.target.getAttribute('data-action')
          if (!action) {
            return
          }
          let dimName = ev.target.parentNode.getAttribute('data-dim-name')
          this.handleShortcutIconAction(record, dimName, action)
        }}
      >
        {Object.keys(rest)
          .filter(k => k in dimNameDict)
          .map((dimName, idx) => {
            let dbDim = dimNameDict[dimName] || { name: dimName, type: DruidColumnType.String }

            let formatter = (dbDim && getFormatterByDbDim(dbDim)) || _.identity
            let formattedVal = formatter(record[dimName])
            return (
              <div className={idx !== 0 ? 'bordert' : undefined} key={dimName}>
                <div className='itblock width180 elli'>
                  <Icon type={DruidColumnTypeIcon[dbDim.type]} className='font20 line-height30 itblock-force mg1r color-blue-grey' />
                  {dbDim.title || dimName}
                </div>
                <div className='itblock' style={remainWidthStyle} data-dim-name={dimName}>
                  <Tooltip overlay='将该维度值加入筛选，以包含筛查' mouseEnterDelay={0.5}>
                    <Icon type='plus-circle-o' className='mg1r fpointer' data-action='includeDimVal' />
                  </Tooltip>
                  <Tooltip overlay='将该维度值加入筛选，以排除筛查' mouseEnterDelay={0.5}>
                    <Icon type='minus-circle-o' className='mg1r fpointer' data-action='excludeDimVal' />
                  </Tooltip>
                  <Tooltip overlay='将该维度加入“所选维度”' mouseEnterDelay={0.5}>
                    <Icon type={selectedSet.has(dimName) ? 'check-circle' : 'check-circle-o'} className='mg2r fpointer' data-action='selectDim' />
                  </Tooltip>
                  <div className='itblock width-100-65'>
                    {isTextDimension(dbDim) ? truncateTextPreview(formattedVal) : formattedVal}
                    {isTextDimension(dbDim) && sourceDataAnalyticTextDimPreviewLen <= _.size(formattedVal) ? getViewDetailBtn(dimName) : null}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    )
  }

  onBarClick = obj => {
    let { updateHashState, granularity, filters, mainTimeDimName } = this.props
    let startTime = obj.name
    // 缩小时间范围、时间粒度
    let nextTimeRange = [startTime, formatUseOriginalPattern(moment(startTime).add(moment.duration(granularity)))]
    let timeFlt = _.find(filters, flt => flt.col === mainTimeDimName)
    if (timeFlt && _.isEqual(nextTimeRange, timeFlt.eq)) {
      message.warn('已经是最小的时间范围了')
      return
    }
    updateHashState(prevState => {
      return immutateUpdates(
        prevState,
        'filters',
        prevFlts => {
          return prevFlts.map(flt => (flt.col === mainTimeDimName ? { ...flt, eq: nextTimeRange } : flt))
        },
        'granularity',
        () => findSuitableGranularityByLimit(nextTimeRange)[0]
      )
    })
    this.setState({
      pageSize: INIT_PAGE_SIZE
    })
  }

  optionsOverwriter = (option, slice) => {
    let { mainTimeDimName } = this.props
    let granularity = _.get(slice, `params.dimensionExtraSettingDict['${mainTimeDimName}'].granularity`) || 'P1D'
    let selectOrderDirection = _.get(slice, `params.dimensionExtraSettingDict['${mainTimeDimName}'].sortDirect`) || 'desc'

    let grUnit = granularity.replace(/\d+/, 1)
    let nextOption = immutateUpdates(
      option,
      'grid',
      grid => ({
        ...grid,
        left: '4%',
        top: '15px',
        bottom: grUnit === 'PT1H' || grUnit === 'PT1M' ? '30px' : '10px'
      }),
      'xAxis.inverse',
      () => selectOrderDirection !== 'asc'
    )

    /*    if (granularity === 'PT1H' || granularity === 'PT1M') {
      let alignTo = {PT1H: 'day', PT1M: 'hour'}[granularity]
      nextOption = immutateUpdates(nextOption,
        'xAxis.axisTick.interval', () => {
          return (idx, name) => moment(name).valueOf() === moment(name).startOf(alignTo).valueOf()
        },
        'xAxis.axisLabel.interval', () => {
          return (idx, name) => moment(name).valueOf() === moment(name).startOf(alignTo).valueOf()
        })
    }*/
    return nextOption
  }

  toggleVizPanelCollapse = () => {
    let { collapseVizPanel } = this.state
    this.setState({ collapseVizPanel: !collapseVizPanel }, () => {
      set('source_data_analytic_collapse_viz_panel', this.state.collapseVizPanel ? 1 : 0)
    })
  }

  onTableRowClick = (record, idx, ev) => {
    let dimName = ev.target.parentNode.getAttribute('data-dim-name')
    if (!dimName) {
      return
    }
    let { dimNameDict } = this.props
    let { tempKeyword } = this.state
    let newCondStr
    let dbDim = dimNameDict[dimName]
    let dimVal = record[dimName]
    if (_.isString(dimVal)) {
      dimVal = escape(dimVal)
    }

    if (isNumberDimension(dbDim) || isTimeDimension(dbDim)) {
      newCondStr = dimVal === 0 ? `(${dimName}:[${dimVal} TO ${dimVal}] OR (*:* NOT ${dimName}:*))` : `${dimName}:[${dimVal} TO ${dimVal}]`
    } else if (isTextDimension(dbDim) && (dimVal || '').length === sourceDataAnalyticTextDimPreviewLen) {
      newCondStr = `${dimName}:${dimVal}*`
    } else {
      newCondStr = `${dimName}:${dimVal}`
    }
    let nextQuery = _.trim(tempKeyword) ? `${tempKeyword} AND ${newCondStr}` : newCondStr
    this.setState({ tempKeyword: nextQuery })
    this.luceneSearch(nextQuery)
  }

  onRowInspectModalClose = () => this.setState({ visiblePopoverKey: null })

  renderRowInspectModal() {
    let { visiblePopoverKey } = this.state
    if (!_.startsWith(visiblePopoverKey, 'row-inspecting:')) {
      return null
    }
    let { datasourceCurrent, dataSourceDimensions, mainTimeDimName } = this.props

    let dsId = (datasourceCurrent && datasourceCurrent.id) || ''

    let cond = decompressUrlQuery(visiblePopoverKey.split(':')[1])
    let { filters, selectOffset, selectOrderDirection, focusDim } = JSON.parse(cond)

    let at = _.findLast(filters, flt => flt.col === mainTimeDimName).eq[0]
    let renderModal = content => (
      <Modal
        visible={_.startsWith(visiblePopoverKey, 'row-inspecting:')}
        title={moment(at).format('LLLL ddd')}
        onCancel={this.onRowInspectModalClose}
        footer={
          <Button size='large' onClick={this.onRowInspectModalClose}>
            关闭
          </Button>
        }
        width='90%'
        wrapClassName='vertical-center-modal'
      >
        {content}
      </Modal>
    )

    // 直接传 select * 会导致有些字段查不出来
    let select = _(dataSourceDimensions)
      .filter(dbDim => dbDim.is_druid_dimension)
      .map(dbDim => dbDim.name)
      .thru(druidDimNames => (_.isEmpty(druidDimNames) ? ['*'] : druidDimNames))
      .value()

    return (
      <DruidDataFetcher
        dbDimensions={dataSourceDimensions}
        dataSourceId={dsId}
        doFetch={!!(dsId && !_.isEmpty(filters))}
        filters={filters}
        timeout={8 * 60 * 1000}
        select={select}
        selectOffset={selectOffset}
        selectLimit={1}
        selectOrderDirection={selectOrderDirection}
        cleanDataWhenFetching
        onFetchingStateChange={isFetching => {
          if (!isFetching && focusDim) {
            setTimeout(() => {
              let elem = document.querySelector(`.ant-modal-body [data-dim-name=${focusDim}]`)
              let container = document.querySelector('.ant-modal-wrap.vertical-center-modal')
              scrollToElement(elem, container)
            }, 500)
          }
        }}
      >
        {({ data, isFetching }) => {
          if (isFetching) {
            return renderModal(<div className='pd3 font20'>加载中...</div>)
          }
          let d = data && data[0]
          return renderModal(d && this.renderRowDetailsInModal(d))
        }}
      </DruidDataFetcher>
    )
  }

  renderRowDetailsInModal = record => {
    let { dataSourceDimensions, dimNameDict } = this.props
    let { __rowId, ...rest } = record

    let dbDimNameDict = _.keyBy(dataSourceDimensions, dbDim => dbDim.name)
    let remainWidthStyle = { width: 'calc(100% - 180px)' }
    return (
      <div className='height-100 overscroll-y line-height30'>
        {Object.keys(rest)
          .filter(k => k in dimNameDict)
          .map((dimName, idx) => {
            let dbDim = dbDimNameDict[dimName] || { name: dimName, type: DruidColumnType.String }

            let formatter = (dbDim && getFormatterByDbDim(dbDim)) || _.identity
            return (
              <div className={idx !== 0 ? 'bordert' : undefined} key={dimName}>
                <div className='itblock width180 elli'>
                  <Icon type={DruidColumnTypeIcon[dbDim.type]} className='font20 line-height30 itblock-force mg1r color-blue-grey' />
                  {dbDim.title || dimName}
                </div>
                <div className='itblock wordwrap-break-word pd2l borderl' style={remainWidthStyle} data-dim-name={dimName}>
                  {formatter(record[dimName]) || '\u00a0'}
                </div>
              </div>
            )
          })}
      </div>
    )
  }

  renderDataDisplayPanel = () => {
    let { datasourceCurrent, filters, granularity, updateHashStateByPath, selectOrderDirection, mainTimeDimName, isFetchingMaxTime: isFetchingGlobalMaxTime } = this.props

    let { barChartData, collapseVizPanel, isFetchingBarChartData, loadedOnce, queryIntentId } = this.state

    let timeFlt = _.find(filters, flt => flt.col === mainTimeDimName && flt.op === 'in')
    let { eq, _willChange } = timeFlt
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : this.convertDateType0(relativeTime)
    granularity = granularity || 'P1D'

    let suitableGranularity = findSuitableGranularityByLimit(eq)
    let suitableGranularityUnit = suitableGranularity.map(s => s.replace(/\d+/, 1))
    let suitableGranularityDict = _.zipObject(suitableGranularityUnit, suitableGranularity)

    // let realTotal = _.get(barChartData, '[0]._tempMetric_rowCount') || 0
    let sumTotal = (_.get(barChartData, '[0].resultSet') || []).reduce((acc, curr) => acc + curr._tempMetric_rowCount, 0)
    return (
      <div className='height-100 overscroll-y bg-light-grey pd2' defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
        {loadedOnce ? null : (
          <div className='bg-white corner height-100 relative'>
            <div className='center-of-relative aligncenter '>
              <img className='itblock' src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`} alt='Error hint' />
              <div className='mg2t font13' style={{ color: '#595959' }}>
                请执行查询
              </div>
            </div>
          </div>
        )}

        <div
          className={classNames('border aligncenter bg-dark-white pd1y width-100 corner fpointer', { hide: !collapseVizPanel || !loadedOnce })}
          onClick={this.toggleVizPanelCollapse}
        >
          <span className='font20 color-999'>
            展开趋势图表
            <Icon className='' type='down' />
          </span>
        </div>

        <div className={classNames('viz-panel height240 pd2t bg-white corner relative', { hide: collapseVizPanel || !loadedOnce })}>
          <div className='bg-light-grey pd1y pd2x absolute itblock left2 top2 corner'>总记录数：{sumTotal || 0}</div>
          <div className='aligncenter'>
            <div className='itblock width500 line-height30'>
              {`${moment(since).format(defaultDateFormat)} ~ ${moment(until).format(defaultDateFormat)}`}
              <Select
                className='mg2l'
                dropdownMatchSelectWidth={false}
                value={granularity}
                onChange={val => {
                  // TODO 自动调整时间？
                  updateHashStateByPath('granularity', () => val)
                }}
              >
                {Object.keys(GranularityEnum).map(grUnit => {
                  let suitableGranularity = suitableGranularityDict[grUnit]
                  let val = suitableGranularity || grUnit
                  let grNum = +val.replace(/\D+/g, '')
                  let grTranslate = GranularityEnumTranslate[GranularityEnum[grUnit]]
                  return (
                    <Option key={val} value={val} disabled={!suitableGranularity}>
                      {grNum === 1 ? grTranslate : `${grNum} ${grTranslate}`}
                    </Option>
                  )
                })}
              </Select>
            </div>
          </div>

          <AsyncTaskRunner
            ref={ref => (this._trendsChartDataFetcher = ref)}
            doRun={!isFetchingGlobalMaxTime && !manualLoad}
            args={
              _willChange || !datasourceCurrent
                ? []
                : [
                    {
                      druid_datasource_id: datasourceCurrent.id,
                      params: {
                        // 折叠的时候只查询 count，不折叠的时候只查询 groupBy
                        withGlobalMetrics: collapseVizPanel,
                        dimensions: collapseVizPanel ? [] : [mainTimeDimName],
                        customMetrics: [{ name: '_tempMetric_rowCount', title: '总记录数', formula: '$main.count()' }],
                        metrics: [],
                        filters: [
                          ...filters.filter(flt => !flt.disabled && flt.col !== mainTimeDimName),
                          { ...timeFlt, eq: [since, until] } // 使用取整了的时间范围
                        ],
                        dimensionExtraSettingDict: {
                          [mainTimeDimName]: {
                            limit: 100,
                            sortDirect: selectOrderDirection,
                            sortCol: mainTimeDimName,
                            granularity
                          }
                        },
                        vizType: 'dist_bar',
                        queryIntentId
                      }
                    }
                  ]
            }
            task={async slice => {
              let druidData = await doQueryDruidData(slice)
              this.setState({
                barChartData: druidData,
                isFetchingBarChartData: false
              })
              return {
                druidData,
                slice
              }
            }}
            onRunningStateChange={isFetching => {
              if (isFetching !== isFetchingBarChartData) {
                this.setState({ isFetchingBarChartData: isFetching })
              }
            }}
          >
            {({ isRunning, result }) => {
              let { slice, druidData } = result || {}
              let totalAndResultSet = (druidData && druidData[0]) || {}
              let chartData = totalAndResultSet && totalAndResultSet.resultSet
              let total = totalAndResultSet && _.omit(totalAndResultSet, 'resultSet')
              return (
                <SliceChartFacade
                  rotateXAxis={false}
                  showLegend={false}
                  wrapperClassName='bg-white corner'
                  wrapperStyle={{
                    padding: '0 10px',
                    height: 'calc(100% - 33px - 20px)'
                  }}
                  style={{ height: '100%' }}
                  druidData={chartData}
                  total={{ placeholder: 0 /* 阻止单图组件加载数据 */, ...total }}
                  slice={slice && immutateUpdate(slice, 'params.metrics', () => ['_tempMetric_rowCount'])}
                  isThumbnail={false}
                  onEvents={{ click: this.onBarClick }}
                  optionsOverwriter={option => this.optionsOverwriter(option, slice) /* 为了触发刷新，需要包一层 */}
                />
              )
            }}
          </AsyncTaskRunner>

          <div className={classNames('relative height20 bg-light-grey width-100 cornerb fpointer', { hide: !loadedOnce })} onClick={this.toggleVizPanelCollapse}>
            <Icon className='center-of-relative font20 color-999' type='up' />
          </div>
        </div>

        <div className={classNames('pd2 mg2t bg-white corner relative', { hide: !loadedOnce })}>
          {this.renderTable()}

          {this.renderDataFetcher(since, until)}

          {this.renderRowInspectModal()}
        </div>
      </div>
    )
  }

  renderTable = withSizeProvider(({ spWidth }) => {
    let { dimNameDict } = this.props
    let { sourceData, sortedSourceData, barChartData, isFetchingSourceData, pageSize, collapseVizPanel } = this.state

    if (sourceData.length <= 0 && !isFetchingSourceData) {
      return this.renderNoResultHint()
    }
    let tableCols = this.generateTableColumns(spWidth)
    // 列宽比 100% 大的话，启用水平滚动
    let contentWidth = _.sum(tableCols.map(col => col.width))
    return (
      <Table
        bordered
        className='hide-pagination always-display-scrollbar-horizontal-all'
        onRow={(...args) => {
          return {
            onClick: e => this.onTableRowClick(...args, e)
          }
        }}
        columns={tableCols}
        expandedRowRender={this.expandedRowRender}
        loading={isFetchingSourceData && _.isEmpty(sourceData)}
        // 如果维度存在客户端时间，则先根据 __time 排序，再根据客户端时间排序，否则直接取 sourceData
        dataSource={_.get(dimNameDict, 'event_time') ? sortedSourceData : sourceData}
        rowKey='__rowId'
        scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth }}
        pagination={{
          pageSize,
          total: sourceData.length || 0,
          showTotal: loadedRowsCount => {
            let total = collapseVizPanel
              ? _.get(barChartData, '[0]._tempMetric_rowCount') || 0
              : (_.get(barChartData, '[0].resultSet') || []).reduce((acc, curr) => acc + curr._tempMetric_rowCount, 0)
            return (
              <div>
                {isFetchingSourceData ? <Icon className='mg2r font20' type='loading' /> : null}
                {loadedRowsCount === total ? `全部数据加载完成，共 ${loadedRowsCount} 条数据` : `加载了 ${loadedRowsCount} 条数据`}
                {manualLoadMore && loadedRowsCount < total ? (
                  <a
                    className='pointer'
                    className={classNames({ disabled: isFetchingSourceData })}
                    onClick={() => {
                      if (isFetchingSourceData) {
                        return
                      }
                      this.setState({ pageSize: (sourceData || []).length + STEP_LOAD_PAGE_SIZE }, () => {
                        this._dataFetcher.run()
                      })
                    }}
                  >
                    ，点击加载更多 <Icon type='down' />
                  </a>
                ) : null}
              </div>
            )
          }
        }}
      />
    )
  })

  selectPartialDruidData = async (since, until, data, fiveMinutesCursor) => {
    let { datasourceCurrent, filters, dataSourceDimensions, selectOrderDirection, mainTimeDimName } = this.props

    let { pageSize, queryIntentId } = this.state

    let dsId = (datasourceCurrent && datasourceCurrent.id) || ''

    let timeFlt = _.find(filters, flt => flt.col === mainTimeDimName && flt.op === 'in')

    return await doQueryDruidData({
      druid_datasource_id: dsId,
      params: {
        queryIntentId,
        filters: [
          ...filters.filter(flt => flt.col !== mainTimeDimName),
          { ...timeFlt, eq: [since, until] }, // 使用取整了的时间范围
          ...(selectOrderDirection !== 'asc'
            ? [
                {
                  col: mainTimeDimName,
                  op: 'lessThanOrEqual',
                  eq: [fiveMinutesCursor]
                },
                {
                  col: mainTimeDimName,
                  op: 'greaterThan',
                  eq: [moment(fiveMinutesCursor).subtract(timeQueryUnit).toISOString()]
                }
              ]
            : [
                {
                  col: mainTimeDimName,
                  op: 'greaterThanOrEqual',
                  eq: [fiveMinutesCursor]
                },
                {
                  col: mainTimeDimName,
                  op: 'lessThan',
                  eq: [moment(fiveMinutesCursor).add(timeQueryUnit).toISOString()]
                }
              ])
        ].filter(flt => flt && !flt.disabled),
        customDimensions: dataSourceDimensions.filter(isTextDimension).map(dbDim => {
          return { name: dbDim.name, formula: `$${dbDim.name}.substr(0, ${sourceDataAnalyticTextDimPreviewLen})` }
        }),
        // select: ['*'], 直接传 select * 会导致 substr 失效
        select: _(dataSourceDimensions)
          .filter(dbDim => dbDim.is_druid_dimension)
          .map(dbDim => dbDim.name)
          .thru(druidDimNames => (_.isEmpty(druidDimNames) ? ['*'] : druidDimNames))
          .value(),
        selectOffset: _.takeRightWhile(data, d => d[mainTimeDimName] === fiveMinutesCursor).length,
        selectLimit: pageSize - (_.isEmpty(data) ? 0 : data.length),
        selectOrderDirection
      }
    })
  }

  queryNextDataTime = async fiveMinutesCursor => {
    let { datasourceCurrent, filters, selectOrderDirection, mainTimeDimName } = this.props

    let dsId = (datasourceCurrent && datasourceCurrent.id) || ''

    let doQueryMinTime = selectOrderDirection === 'asc',
      doQueryMaxTime = selectOrderDirection !== 'asc'
    let queryNextDataTimeRes = await doQueryDruidData({
      druid_datasource_id: dsId,
      params: {
        queryIntentId: this.state.queryIntentId,
        filters: [
          ...filters,
          {
            col: mainTimeDimName,
            op: selectOrderDirection !== 'asc' ? 'lessThanOrEqual' : 'greaterThanOrEqual',
            eq: [fiveMinutesCursor]
          }
        ].filter(flt => flt && !flt.disabled),
        customMetrics: [
          doQueryMaxTime && { name: 'maxTime', formula: `$main.max($${mainTimeDimName})` },
          doQueryMinTime && { name: 'minTime', formula: `$main.min($${mainTimeDimName})` },
          // 强制使用 timeSeries 查询，而不是 timeBoundary
          doQueryMaxTime ? { name: 'maxTime1', formula: '$maxTime.cast("NUMBER") * 1' } : { name: 'minTime1', formula: '$minTime.cast("NUMBER") * 1' }
        ].filter(_.identity)
      }
    })
    return _.get(queryNextDataTimeRes, [0]) || {}
  }

  /**
   * 数据加载逻辑：（假设一次查询间隔为 5 分钟，时间降序查询）
   *
   * 0. 变量说明
   *  pageSize: 根据 sourceDataAnalyticFlowStrategy 配置，初始化为 20，点击加载更多后多加 20
   *  dataLen: 已查得的日志条数
   *  cursor: 日志数据加载指针，初始值为用户设置的时间范围上限
   *  __time: 为日志数据的时间列名
   *  maxTime: 在一定的时间范围内，数据源的最后一条日志数据的 __time 的值
   *  offset: 避免多条日志的 __time 一样时，重复查询到同样的数据，所以下次查询的时候，需要跳过 __time 一样的日志记录数
   *
   * 1. cursor 初始化为时间范围上限，如果时间范围变化，则重新查询所有日志数据
   *
   * 2. 查询 cursor - 5 分钟 < __time <= cursor 范围内的日志数据，
   * limit: pageSize - dataLen，
   * offset: offset 为 cursor === 最后一条日志的 __time  的计数
   *
   * 3. 设置变量
   * 如果查够 pageSize 了，则停止查询，cursor = 最后一条日志的 __time
   * 如果不够 pageSize，则 cursor -= 5 分钟，重复第二步
   * 如果查不到数据，则 cursor -= 5 分钟并查询 maxTime
   *  查询 maxTime 成功，设置到 cursor，重复第二步
   *  失败，表示查询完毕，停止查询
   *
   * 4. 用户点击“加载更多”触发 pageSize += 20，继续查询
   * @param since
   * @param until
   * @returns {XML}
   */
  renderDataFetcher = (since, until) => {
    let { datasourceCurrent, filters, isFetchingMaxTime: isFetchingGlobalMaxTime, selectOrderDirection, mainTimeDimName } = this.props

    let { sourceData, cursor, forceUpdateOnce, pageSize } = this.state

    let dsId = (datasourceCurrent && datasourceCurrent.id) || ''
    return (
      <AsyncTaskRunner
        ref={ref => (this._dataFetcher = ref)}
        args={[
          {
            /* 下划线开头的变量，只为触发重新加载全部数据 */
            _filters: filters.filter(flt => !flt.disabled),
            _dsId: dsId,
            _isFetchingGlobalMaxTime: isFetchingGlobalMaxTime,

            selectOrderDirection: selectOrderDirection,
            fiveMinutesCursor: selectOrderDirection !== 'asc' ? until : since
          }
        ]}
        doRun={!isFetchingGlobalMaxTime && !manualLoad}
        onRunningStateChange={isRunning => this.setState({ isFetchingSourceData: isRunning })}
        task={async ({ fiveMinutesCursor, selectOrderDirection }) => {
          let data = forceUpdateOnce ? [] : sourceData
          // 如果不是重新加载，则接着使用上次的指针
          fiveMinutesCursor = forceUpdateOnce ? fiveMinutesCursor : cursor || fiveMinutesCursor

          try {
            while (true) {
              let partialData = await this.selectPartialDruidData(since, until, data, fiveMinutesCursor)
              // 某次子查询完成了
              // 如果一条数据都没有，则先查询 maxTime
              debug('Receiving data length: ' + ((partialData && partialData.length) || 0))
              if (_.isEmpty(partialData)) {
                let nextCursor =
                  selectOrderDirection !== 'asc' ? moment(fiveMinutesCursor).subtract(timeQueryUnit).toISOString() : moment(fiveMinutesCursor).add(timeQueryUnit).toISOString()
                // 如果超出全局的时间范围，则停止查询
                if (selectOrderDirection !== 'asc') {
                  if (moment(nextCursor).isBefore(since)) {
                    return data
                  }
                } else {
                  if (moment(nextCursor).isAfter(until)) {
                    return data
                  }
                }
                fiveMinutesCursor = nextCursor
                // 查询 maxTime
                let { minTime, maxTime } = await this.queryNextDataTime(fiveMinutesCursor)
                // 全局时间范围内没有数据，停止查询源数据
                if (selectOrderDirection !== 'asc' && !maxTime) {
                  debug('No maxTime, stopping...')
                  return data
                }
                if (selectOrderDirection === 'asc' && !minTime) {
                  debug('No minTime, stopping...')
                  return data
                }

                // console.log('minTime receive: ' + minTime)
                fiveMinutesCursor = selectOrderDirection !== 'asc' ? maxTime : minTime
                continue
              }

              // inject rowIndex，主要使用 __time，但如果上一条数据的 __time 和当前的 一样，则带上 offset
              let offset
              partialData = partialData.map((d, i, arr) => {
                let rowId
                if (i === 0) {
                  offset = _.takeRightWhile(data, pd => pd[mainTimeDimName] === d[mainTimeDimName]).length
                  rowId = offset === 0 ? d[mainTimeDimName] : `${d[mainTimeDimName]}_${offset}`
                } else if (d[mainTimeDimName] !== arr[i - 1][mainTimeDimName]) {
                  offset = 0
                  rowId = d[mainTimeDimName]
                } else {
                  offset += 1
                  rowId = `${d[mainTimeDimName]}_${offset}`
                }
                return {
                  ...d,
                  __rowId: rowId
                }
              })

              let nextData = [...(data || []), ...partialData]

              if (nextData.length < pageSize) {
                // 数据不够 fiveMinutesCursor -= 5 min
                data = nextData
                fiveMinutesCursor =
                  selectOrderDirection !== 'asc' ? moment(fiveMinutesCursor).subtract(timeQueryUnit).toISOString() : moment(fiveMinutesCursor).add(timeQueryUnit).toISOString()
                // 逐步将数据渲染到界面
                this.setState({ sourceData: data, cursor: fiveMinutesCursor })
              } else {
                // 如果设置了强制刷新，则在加载完毕时关闭
                // 逐步将数据渲染到界面
                // 数据够 pageSize 条了，将 isAgentFetching 设为 false，更新 fiveMinutesCursor，设为最后一条数据的 __time
                data = nextData
                fiveMinutesCursor = _.last(nextData)[mainTimeDimName]
                return data
              }
            }
          } catch (e) {
            console.error(e)
          } finally {
            this.setState({
              sourceData: data,
              cursor: fiveMinutesCursor,
              forceUpdateOnce: false
            })
          }
        }}
      >
        {({ isRunning, result: data, run }) => {
          if (_.isEmpty(data) || manualLoadMore) {
            return null
          }
          return (
            <IsInViewport
              onIsInViewportChange={isInViewport => {
                if (isInViewport) {
                  this.setState({ pageSize: (sourceData || []).length + STEP_LOAD_PAGE_SIZE }, () => {
                    run()
                  })
                }
              }}
            >
              <div className='ignore-mouse absolute width-100 height-10 maxh500 bottom0' />
            </IsInViewport>
          )
        }}
      </AsyncTaskRunner>
    )
  }

  renderNoResultHint() {
    return (
      <div className=''>
        <h1 className='font30'>
          查无数据
          <Icon type='heh-o' />
        </h1>
        <p>请尝试以下措施：</p>
        <div className='mg2t'>
          <h3 className='font23'>扩大时间范围</h3>
          <p>点击左上角的时间选择器调整</p>
        </div>
        <h3 className='font23 mg2t'>调整查询</h3>
        <p>
          搜索框支持
          <Anchor href='http://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#query-string-syntax' target='_blank'>
            {' '}
            Lucene 查询语法
          </Anchor>
        </p>
        <h4 className='font17 mg2t'>例子:</h4>
        指定列进行模糊查找
        <Alert type='info' message='exception: *INFO*' />
        搜索特定的列与值:
        <Alert type='info' message='status:200' />
        查找状态码位于 400-499:
        <Alert type='info' message='status:[400 TO 499]' />
        查找状态码位于 400-499 并且 extension 为 PHP:
        <Alert type='info' message='status:[400 TO 499] AND extension:PHP' />
        或 HTML
        <Alert type='info' message='status:[400 TO 499] AND (extension:php OR extension:html)' />
        否定查找
        <Alert type='info' message='*:* NOT exception: *INFO*' />
      </div>
    )
  }

  handleExtraFilterAction = (filter, action) => {
    let { updateHashStateByPath } = this.props
    let { col, op } = filter
    switch (action) {
      case 'toggleEnable':
        updateHashStateByPath('filters', prevFilters => {
          let prevFltIdx = _.findIndex(prevFilters, flt => _.isEqual(filter, flt))
          return immutateUpdate(prevFilters, [prevFltIdx, 'disabled'], prevDisabled => !prevDisabled)
        })
        break
      case 'toggleOp':
        updateHashStateByPath('filters', prevFilters => {
          let prevFltIdx = _.findIndex(prevFilters, flt => _.isEqual(flt, filter))
          return immutateUpdate(prevFilters, [prevFltIdx, 'op'], prevOp => {
            return _.startsWith(prevOp, 'not ') ? prevOp.substr(4) : `not ${prevOp}`
          })
        })
        break
      case 'deleteFilter':
        updateHashStateByPath('filters', prevFilters => {
          return prevFilters.filter(flt => !_.isEqual(flt, filter))
        })
        break
      default:
        throw new Error('Not supported action: ' + action)
    }
  }

  genFiltersBatchActionMenu() {
    let { updateHashStateByPath, mainTimeDimName } = this.props
    let actions = ['启用', '禁用', '取反', '可用性切换', '删除']
    let isExtraFilterPredicate = flt => flt.col !== mainTimeDimName && flt.col !== '*'
    return (
      <Menu
        onClick={async ev => {
          let action = ev.key
          switch (action) {
            case '启用':
              updateHashStateByPath('filters', prevFlts => {
                return prevFlts.map(flt => {
                  if (!isExtraFilterPredicate(flt)) {
                    return flt
                  }
                  return flt.disabled ? _.omit(flt, 'disabled') : flt
                })
              })
              break
            case '禁用':
              updateHashStateByPath('filters', prevFlts => {
                return prevFlts.map(flt => {
                  if (!isExtraFilterPredicate(flt)) {
                    return flt
                  }
                  return flt.disabled ? flt : { ...flt, disabled: true }
                })
              })
              break
            case '取反':
              updateHashStateByPath('filters', prevFlts => {
                return prevFlts.map(flt => {
                  if (!isExtraFilterPredicate(flt)) {
                    return flt
                  }
                  return { ...flt, op: _.startsWith(flt.op, 'not ') ? flt.op.substr(4) : `not ${flt.op}` }
                })
              })
              break
            case '可用性切换':
              updateHashStateByPath('filters', prevFlts => {
                return prevFlts.map(flt => {
                  if (!isExtraFilterPredicate(flt)) {
                    return flt
                  }
                  return { ...flt, disabled: !flt.disabled }
                })
              })
              break
            case '删除':
              updateHashStateByPath('filters', prevFlts => {
                return prevFlts.filter(flt => !isExtraFilterPredicate(flt))
              })
              break
            default:
              throw new Error('Not support action: ' + action)
          }
        }}
      >
        {actions.map(action => {
          return <MenuItem key={action}>{action}</MenuItem>
        })}
      </Menu>
    )
  }

  renderFiltersBar(extraFilters) {
    let { updateHashStateByPath, dimNameDict } = this.props
    let { visiblePopoverKey } = this.state
    let cls = 'extra-filter-tile line-height25 mg1r color-white itblock mw300 elli pd2x relative hover-blur-trigger'
    return (
      <div
        ref={ref => {
          if (ref && !this._filtersBar) {
            this._filtersBar = ref
          }
        }}
        className='extra-filters-bar pd2x bg-grey-f7'
        onClick={ev => {
          let action = ev.target.getAttribute('data-action')
          if (!action) {
            return
          }
          let extraFltIdx = ev.target.parentNode.getAttribute('data-extra-filter-idx')
          let extraFlt = extraFilters[extraFltIdx]
          this.handleExtraFilterAction(extraFlt, action)
        }}
      >
        {extraFilters.map((flt, fltIdx) => {
          let myVisibleKey = `filter-eq-setting-modal:${fltIdx}`
          let dbDim = dimNameDict[flt.col] || { name: flt.col, type: DruidColumnType.String }
          return (
            <div
              key={fltIdx}
              className={classNames(cls, 'aligncenter', {
                'hover-display-trigger': visiblePopoverKey !== myVisibleKey,
                exclude: _.startsWith(flt.op, 'not '),
                disabled: flt.disabled
              })}
            >
              <span className='hover-blur-3' style={{ opacity: myVisibleKey === visiblePopoverKey ? 0.5 : undefined }}>{`${dbDim.title || flt.col}: ${flt.eq[0]}`}</span>
              <div className='center-of-relative hover-display' data-extra-filter-idx={fltIdx}>
                <Tooltip title={flt.disabled ? '启用' : '禁用'}>
                  <Icon type={flt.disabled ? 'check-square-o' : 'check-square'} className='fpointer' data-action='toggleEnable' />
                </Tooltip>
                <div className='seperator' />
                <Tooltip title={_.startsWith(flt.op, 'not ') ? '不等于变为等于' : '等于变为不等于'}>
                  <Icon type='sugo-tab' className='fpointer' data-action='toggleOp' />
                </Tooltip>
                <div className='seperator' />
                <Tooltip title='删除'>
                  <Icon type='sugo-trash' className='fpointer' data-action='deleteFilter' />
                </Tooltip>
                <div className='seperator' />
                <LitePopInput
                  title='设置值'
                  visible={visiblePopoverKey === myVisibleKey}
                  onVisibleChange={visible => {
                    this.setState({ visiblePopoverKey: visible && myVisibleKey })
                  }}
                  value={flt.eq[0]}
                  onChange={val => {
                    updateHashStateByPath('filters', prevFlts => {
                      let prevFltIdx = _.findIndex(prevFlts, flt0 => _.isEqual(flt0, flt))
                      return immutateUpdate(prevFlts, [prevFltIdx, 'eq', 0], () => val)
                    })
                  }}
                >
                  <Tooltip title='编辑'>
                    <Icon type='sugo-edit' className='fpointer' />
                  </Tooltip>
                </LitePopInput>
              </div>
            </div>
          )
        })}
        <Dropdown overlay={this.genFiltersBatchActionMenu()}>
          <div className='batch-filters-action line-height25 mg1r itblock pd2x'>
            批量操作 <Icon type='down' />
          </div>
        </Dropdown>
      </div>
    )
  }

  render() {
    let { filters = [], mainTimeDimName, dimNameDict, datasourceCurrent, isFetchingDataSourceDimensions } = this.props
    let extraFilters = filters.filter(flt => flt.col !== mainTimeDimName && flt.col !== '*')
    const extra = (
      <Anchor href={helpLink} target='_blank' className='color-grey pointer' title='查看帮助文档'>
        <Icon type='question-circle' />
      </Anchor>
    )

    if (!datasourceCurrent || isFetchingDataSourceDimensions) {
      return <div className='pd3 aligncenter color-gray font18'>加载中……</div>
    }

    if (!mainTimeDimName || !(mainTimeDimName in dimNameDict)) {
      return <div className='pd3 aligncenter color-gray font18'>数据源没有时间维度，无法使用日志分析</div>
    }

    return (
      <div className='source-data-analytic height-100'>
        <Bread path={[{ name: '日志分析' }]} extra={extra} />

        {this.renderTopBar()}

        {_.isEmpty(extraFilters) ? null : this.renderFiltersBar(extraFilters)}

        <HorizontalSplitHelper
          style={{ height: `calc(100% - 42px - ${_.get(this._filtersBar, 'offsetHeight') || (_.isEmpty(extraFilters) ? 0 : 40)}px - 44px)` }}
          collapseWidth={100}
        >
          <div className='height-100' defaultWeight={LEFT_PANEL_WIDTH} collapseTitle='维度选择'>
            {this.renderDimensionsPanel()}
          </div>
          {this.renderDataDisplayPanel()}
        </HorizontalSplitHelper>
      </div>
    )
  }
}
