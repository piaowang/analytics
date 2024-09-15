import React from 'react'
import { Button, Dropdown, Menu, message, Tooltip } from 'antd'
import _ from 'lodash'
import { withHashStateDec } from '../Common/hash-connector'
import DruidColumnType, {
  DruidColumnTypeInverted,
  isCastDimension,
  isDesensitizDimension,
  isNumberDimension,
  isTextDimension,
  isTimeDimension,
  isUserTagGroupDimension
} from '../../../common/druid-column-type'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import SplitTile, { tileGap, tileWidth } from './split-tile'
import * as PubSub from 'pubsub-js'
import DateRangePicker from '../Common/time-picker'
import DimensionSettingPopover, { possibleLimit as DIMENSION_POSSIBLE_LIMIT } from './dimension-setting-popover'
import FilterSettingPopover, { FilterOpNameMap } from './filter-setting-popover'
import FilterInstitutionsPopover from './filter-institutions-popover'
import { immutateUpdate, immutateUpdates, insert, move, remove } from '../../../common/sugo-utils'
import classNames from 'classnames'
import { convertDateType, isRelative } from '../../../common/param-transform'
import { generate } from 'shortid'
import MetricFormatSettingModal from './metric-format-setting-modal'
import {
  aggregationTypeForNumberDimension,
  aggregationTypeForStringDimension,
  aggregationTypeNameDict,
  dbMetricAdapter,
  numberFormulaGenerator,
  singleDbMetricAdapter,
  stringFormulaGenerator
} from '../../../common/temp-metric'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import parseFormat from 'moment-parseformat'
import moment from 'moment'
import { dateFormatterGenerator, granularityToFormat } from '../../common/date-format-util'
import { withSizeProvider } from '../Common/size-provider'
import * as LocalMetric from '../../../common/local-metric'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import Icon from '../Common/sugo-icon'
import { DimensionParamsTypes } from '../../../common/dimension-params-type'
import { convertSubTagToGroup } from '../../../common/subTagGroup'
import { MetricAdvanceCalcFuncEnum } from '../../../common/druid-query-utils'

let {
  analyticDefaultTime = '-1 day',
  analytics_manual_load_chart_data = false,
  analyticFilterStrategy = 'normal',
  analyticFilterAddStrategy = 'distinct',
  show_newest_data_at_first = true,
  analyticNormalTableMaxDimensionCount = 6,
  analyticNormalTableMaxGroupByLimit = 100
} = window.sugo

let MenuItem = Menu.Item
let MenuDivider = Menu.Divider
let SubMenu = Menu.SubMenu

const ButtonPartWidth = 140

// https://github.com/Datafruit/sugo-analytics/issues/2489
const DefaultMaxSubQueryCount = 125
const MaxDimCount = Math.floor(Math.log(DefaultMaxSubQueryCount) / Math.log(5)) + 1

let getRangesFormatter = (dbDim, { granularity }) => {
  return dbDim && isTimeDimension(dbDim) ? dateFormatterGenerator(granularityToFormat(granularity || 'P1D')) : _.identity
}

let filterTileShortDescription = (flt, dbDim) => {
  let { op, eq, type } = flt
  let dimTitle = dbDim.title || dbDim.name

  if (type === 'number' && _.get(dbDim, 'params.groupFilters.length', 0) === 0 && _.endsWith(op, 'in')) {
    let [from, to] = eq
    let content = `${_.isNumber(from) ? from : '不限'} 至 ${_.isNumber(to) ? to : '不限'}`
    return `${dimTitle} : ${content}`
  } else {
    let isNegativeFilter = _.startsWith(op, 'not ')
    let finalOp = isNegativeFilter ? op.substr(4) : op
    let opTitle = FilterOpNameMap[finalOp] || ''

    let title = opTitle ? `${dimTitle} ${opTitle}` : dimTitle

    let formatter = getRangesFormatter(dbDim, flt)

    return eq && _.isArray(eq) && finalOp !== 'nullOrEmpty' ? `${title} : ${eq.length <= 1 ? eq.map(formatter).join('') : `(${eq.length})`}` : `${title}`
  }
}

let filterTileCompleteDescription = (flt, dbDim) => {
  let { op, eq, type } = flt
  let dimTitle = dbDim.title || dbDim.name

  if (type === 'number' && _.endsWith(op, 'in')) {
    let [from, to] = eq
    let content = `${_.isNumber(from) ? from : '不限'} 至 ${_.isNumber(to) ? to : '不限'}`
    let opStr = op === 'in' ? '' : op === 'not in' ? '排除 ' : op
    return `${dimTitle} ${opStr}: ${content}`
  } else {
    let isNegativeFilter = _.startsWith(op, 'not ')
    let finalOp = isNegativeFilter ? op.substr(4) : op
    let opTitle = FilterOpNameMap[finalOp] || ''

    let title = opTitle ? `${dimTitle} ${isNegativeFilter ? '不' : ''}${opTitle}` : dimTitle
    if (finalOp === 'nullOrEmpty') {
      return title
    }

    let formatter = getRangesFormatter(dbDim, flt)
    return _.isArray(eq) ? `${title} : ${eq.map(formatter).join(', ')}` : eq
  }
}

@withHashStateDec(state => {
  return { ...state, dataSourceId: state.selectedDataSourceId }
})
@withSizeProvider
export default class ConditionPanel extends React.Component {
  static defaultProps = {
    dataSourceDimensions: []
  }

  state = {
    metricWhichSettingFormat: null,
    dateStringComparingFormatDict: null,
    isSliceStale: false,
    isFetchingSliceData: false,
    isFetchingMaxTime: false
  }

  componentDidMount() {
    this.prevHeight = this._rootDiv.offsetHeight
    PubSub.subscribe('analytic.onDropToFilter', (msg, name, action = 'append', index) => {
      this.onDropToFilter(name, action, index)
    })
    PubSub.subscribe('analytic.onDropToDimension', (msg, name, action = 'append', index) => {
      this.onDropToDimension(name, action, index)
    })
    PubSub.subscribe('analytic.onDropToMetric', (msg, name, action = 'append', index) => {
      this.onDropToMetric('维度', name, action, index)
    })
    PubSub.subscribe('analytic.update-metrics', (msg, metricsUpdater) => {
      let { updateHashState } = this.props
      updateHashState(prevState => {
        let metricUpdatedState = immutateUpdate(prevState, 'metrics', metricsUpdater)
        let deletedMetrics = _.difference(prevState.metrics, metricUpdatedState.metrics)
        let delPass = _.flow(deletedMetrics.map(this.genRemoveMetricUpdater))
        return delPass(metricUpdatedState)
      })
    })
    PubSub.subscribe('analytic.appendCompareWithLastPeriodMetric', (msg, baseMetricName) => {
      // 外部添加环比指标
      this.genLocalMetric(baseMetricName, 'compareWithLastPeriod')
    })
    if (analytics_manual_load_chart_data) {
      PubSub.subscribe('analytic.isSliceStale', (msg, isSliceStale) => {
        if (this.state.isSliceStale !== isSliceStale) {
          this.setState({ isSliceStale })
        }
      })
      PubSub.subscribe('analytic.isFetchingSliceData', (msg, isFetchingSliceData) => {
        if (this.state.isFetchingSliceData !== isFetchingSliceData) {
          this.setState({ isFetchingSliceData })
        }
      })
    }
  }

  prevHeight = null

  componentDidUpdate(prevProps, prevState) {
    if (this.props.dataSourceId !== prevProps.dataSourceId) {
      this.setState({
        dateStringComparingFormatDict: null
      })
    }
    let currentHeight = this._rootDiv.offsetHeight
    if (currentHeight !== this.prevHeight) {
      let { onHeightChange } = this.props
      if (onHeightChange) {
        onHeightChange(currentHeight)
      }
      this.prevHeight = currentHeight
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe('analytic.onDropToFilter')
    PubSub.unsubscribe('analytic.onDropToDimension')
    PubSub.unsubscribe('analytic.onDropToMetric')
    PubSub.unsubscribe('analytic.update-metrics')
    PubSub.unsubscribe('analytic.appendCompareWithLastPeriodMetric')
    if (analytics_manual_load_chart_data) {
      PubSub.unsubscribe('analytic.isSliceStale')
      PubSub.unsubscribe('analytic.isFetchingSliceData')
    }
  }

  removeDimension(dimName) {
    let { updateHashState, linkage, dimensions, dataSourceDimensions, dimensionExtraSettingDict, customDimensions = [], chartExtraSettings } = this.props
    let nextDimensions = dimensions.filter(d => d !== dimName)
    let dimension = _.find(dataSourceDimensions, { name: nextDimensions[0] })
    // 移除维度后删除旧的设置
    let nextDimensionExtraSettingDict = _(dimensionExtraSettingDict)
      .omit(dimName)
      .mapValues((val, key) => {
        return val.sortCol === dimName ? { ...val, sortCol: key } : val
      })
      .value()
    updateHashState({
      ..._.pickBy(
        {
          dimensions: nextDimensions,
          dimensionExtraSettingDict: nextDimensionExtraSettingDict,
          customDimensions: customDimensions.filter(p => p.name !== dimName),
          chartExtraSettings: _.omit(chartExtraSettings, ['customColumns'])
        },
        _.identity
      ),
      linkage: nextDimensions.length === 1 && _.get(dimension, 'type', '') === 4 ? linkage : false
    })
  }

  removeFilters(preDelTileIdx) {
    let { updateHashState, filters } = this.props

    let filtersOption = filters.filter(flt => flt.op !== 'lookupin')
    let preDelFlt = filtersOption[preDelTileIdx]
    let preRemoveIndex = _.findIndex(filters, flt => flt === preDelFlt)
    updateHashState({
      filters: remove(filters, preRemoveIndex)
    })
  }

  genRemoveMetricUpdater = preDelMetricName => {
    return prevState => {
      // 如果删除的指标带有本地指标，则需要移除本地指标
      let preDelLocalMetricDict = _.pickBy(prevState.localMetricDict, lo => _.includes(lo.fromMetrics, preDelMetricName))

      let preDelMetricNames = [preDelMetricName, ...Object.keys(preDelLocalMetricDict)]
      let preDelMetricNameSet = new Set(preDelMetricNames)

      let nextState = immutateUpdate(prevState, 'metrics', prev => prev.filter(name => !preDelMetricNameSet.has(name)))
      nextState = immutateUpdate(nextState, 'tempMetricDict', dict => _.omit(dict, preDelMetricName))
      nextState = immutateUpdates(nextState, 'localMetricDict', prevDict => _.omit(prevDict, preDelMetricNames))
      nextState = immutateUpdates(nextState, 'chartExtraSettings', prevSetting => _.omit(prevSetting, ['customColumns']))

      // 移除指标时，如果发现有维度使用其进行排序，则重置其排序设置
      return immutateUpdate(nextState, 'dimensionExtraSettingDict', dict => {
        if (!_.some(_.values(dict), dimSetting => preDelMetricNameSet.has(dimSetting.sortCol))) {
          return dict
        }
        let defaultSortCol = _.first(nextState.metrics)
        return _.mapValues(dict, setting => (preDelMetricNameSet.has(setting.sortCol) ? { ...setting, sortCol: defaultSortCol } : setting))
      })
    }
  }

  /**
   * 6 种情况：
   * 1. 从维度列表拖拽到筛选器，插入（不允许重复维度）
   * 2. 从维度列表拖拽到筛选器，替换（不允许重复维度）
   * 3. 从维度列表拖拽到筛选器，插入（允许重复维度）
   * 4. 从维度列表拖拽到筛选器，替换（允许重复维度）
   * 5. 移动筛选器位置，插入
   * 6. 移动筛选器位置，替换
   * @param dimName
   * @param action
   * @param index
   * @param originalTileIdx
   */
  onDropToFilter(dimName, action, index, originalTileIdx = null) {
    let { updateHashState, filters, dataSourceDimensions } = this.props

    let dbDim = _.find(dataSourceDimensions, dbDim => dbDim.name === dimName)
    if (!dbDim) {
      message.warning('此维度已被删除，不能用于查询', 5)
      return
    }
    if (isTextDimension(dbDim)) {
      message.warning('Text 类型维度不能用于筛选、分组和指标，只能用于查询源数据')
      return
    }
    if (isCastDimension(dbDim) && isNumberDimension(dbDim)) {
      message.warning('类型转换类型维度暂不支持筛选')
      return
    }

    let userGroupFlt = _.find(filters, flt => flt.op === 'lookupin')
    let tiledFlts = filters.filter(flt => flt.op !== 'lookupin')

    if (originalTileIdx) {
      if (action === 'insert') {
        // case 5
        updateHashState({
          filters: [userGroupFlt, ...move(tiledFlts, originalTileIdx, index)].filter(_.identity)
        })
      } else if (action === 'replace') {
        // case 6
        let oriFlt = tiledFlts[originalTileIdx]
        updateHashState({
          filters: [userGroupFlt, ...tiledFlts.map((flt, i) => (i === originalTileIdx ? null : i === index ? oriFlt : flt))].filter(_.identity)
        })
      } else {
        throw new Error('Unknown action: ' + action)
      }
      return
    }

    if (analyticFilterAddStrategy === 'distinct') {
      // case 1、2 并且原维度已存在
      let existedFltIdx = _.findIndex(tiledFlts, flt => flt.col === dimName)
      if (existedFltIdx !== -1) {
        PubSub.publish('analytic.onVisiblePopoverKeyChange', `筛选:${existedFltIdx}`)
        return
      }
    }

    // 其余情况都可以插入
    if (action === 'append') {
      action = 'insert'
      index = tiledFlts.length
    }

    // 这里故意创建新对象是为了后面更容易删除原来的对象
    let preInsertOrReplaceFlt = isUserTagGroupDimension(dbDim)
      ? {
          col: dbDim.name,
          op: 'and',
          eq: dbDim.params.filters
        }
      : {
          col: dbDim.name,
          op: 'in',
          eq: isTimeDimension(dbDim) ? '-1 days' : [],
          type: DruidColumnTypeInverted[dbDim.type] || 'string'
        }

    if (dbDim.params.type === 'calc') {
      preInsertOrReplaceFlt.formula = dbDim.params.formula
    }

    if (dbDim.type === DruidColumnType.DateString) {
      preInsertOrReplaceFlt.dateStringComparingFormat = _.get(this.state.dateStringComparingFormatDict, dimName) || null
    }

    // 移动原有筛选项来覆盖现有筛选项，则需要进行删除
    if (action === 'insert') {
      // 先插入，再删除（删除时是根据对象来删除，不会删错，因为插入的 flt 跟原来的不是同一个对象）
      tiledFlts = insert(tiledFlts, index, preInsertOrReplaceFlt)
    } else if (action === 'replace') {
      // 先替换，再删除
      tiledFlts = tiledFlts.map((flt, i) => (i === index ? preInsertOrReplaceFlt : flt))
      // 如果本地指标的源指标被替换，则需要删除本地指标
    } else {
      throw new Error(`Unknown drop position action: ${action}, ${index}`)
    }
    // 不能修改原有的 userGroupFilter
    updateHashState({
      filters: [userGroupFlt, ...tiledFlts].filter(_.identity)
    })
    PubSub.publish('analytic.onVisiblePopoverKeyChange', `筛选:${index}`)
  }

  recalcAllLimit(dimensions, dimensionExtraSettingDict, dimIdxOfAdjustSeq) {
    // 算法：计算新加入的维度的 maxLimit，如果不低于 5 则调整成功，否则需要调整其他维度
    let [head, ...rest] = dimIdxOfAdjustSeq
    if (head === undefined) {
      return dimensionExtraSettingDict
    }
    let currDimMaxLimit = this.calcMaxDimLimitByIndex({ dimIdx: head, dimensions, dimensionExtraSettingDict })
    if (currDimMaxLimit < 5) {
      let nextDimensionExtraSettingsDict = immutateUpdate(dimensionExtraSettingDict, `${dimensions[head]}.limit`, () => 5)
      return this.recalcAllLimit(dimensions, nextDimensionExtraSettingsDict, rest)
    }
    return immutateUpdate(dimensionExtraSettingDict, `${dimensions[head]}.limit`, prevLimit => Math.min(currDimMaxLimit, prevLimit || 10))
  }

  onDropToDimension(dimName, action, index) {
    let {
      dimensions,
      metrics,
      vizType,
      dataSourceMeasures,
      dataSourceDimensions,
      dimensionExtraSettingDict,
      customDimensions, //区间范围筛选支持切换左闭右闭/左闭右开
      updateHashState,
      chartExtraSettings //多维分析表格增加自定义表头功能
    } = this.props
    let dbDim = _.find(dataSourceDimensions, dbDim => dbDim.name === dimName)
    if (!dbDim) {
      message.warning('此维度已被删除，不能用于查询', 5)
      return
    }

    let paramType = _.get(dbDim, 'params.type')
    if (isUserTagGroupDimension(dbDim)) {
      message.warning('组合标签不能用于分组', 5)
      return
    }
    if (paramType === DimensionParamsTypes.calc) {
      message.warning('暂不支持按计算维度分组', 5)
      return
    }
    if (isTextDimension(dbDim)) {
      message.warning('Text 类型维度不能用于筛选、分组和指标，只能用于查询源数据', 5)
      return
    }

    if (action === 'append') {
      action = 'insert'
      index = dimensions.length
    }

    if (vizType === 'table' && MaxDimCount <= dimensions.length && action === 'insert' && !_.some(dimensions, dim => dim === dimName)) {
      message.warning(`数状表格维度最多不能超过 ${MaxDimCount} 个`)
      return
    }
    if (vizType === 'table_flat' && analyticNormalTableMaxDimensionCount <= dimensions.length && action === 'insert' && !_.some(dimensions, dim => dim === dimName)) {
      message.warning(`表格维度最多不能超过 ${analyticNormalTableMaxDimensionCount} 个`)
      return
    }

    let nextDimensions,
      nextDimensionExtraSettingsDict,
      nextCustomDimensions = customDimensions
    if (action === 'insert') {
      let originalIndex = _.findIndex(dimensions, dn => dn === dimName)
      nextDimensions = originalIndex === -1 ? insert(dimensions, index, dimName) : move(dimensions, originalIndex, index)
    } else if (action === 'replace') {
      nextDimensions = _.uniq(dimensions.map((dim, i) => (i === index ? dimName : dim)))
      // 移除维度后删除旧的设置
      let preDelDimName = dimensions[index]
      dimensionExtraSettingDict = _(dimensionExtraSettingDict)
        .omit(preDelDimName)
        .mapValues((val, key) => (val.sortCol === preDelDimName ? { ...val, sortCol: key } : val))
        .value()
      nextCustomDimensions = _.filter(customDimensions, d => d.name !== preDelDimName)
    } else {
      throw new Error(`Unknown drop position action: ${action}, ${index}`)
    }

    // 加入时间列之后、默认以时间升序
    if (dbDim && isTimeDimension(dbDim)) {
      nextDimensionExtraSettingsDict = immutateUpdate(dimensionExtraSettingDict, dimName, prevSetting => ({
        ...(prevSetting || {}), // 保留时间粒度
        sortCol: dimName,
        sortDirect: 'asc',
        limit: 10
      }))
    } else if ((vizType === 'map' || vizType === 'scatter_map' || vizType === 'migration_map') && nextDimensions.length === 1) {
      // 如果是地图图表，加入第一个维度时限制设置为 50
      nextDimensionExtraSettingsDict = {
        ...dimensionExtraSettingDict,
        [dimName]: {
          limit: 100,
          sortDirect: 'desc',
          sortCol: _.first(metrics) || _.get(dataSourceMeasures, '[0].name')
        }
      }
    } else {
      nextDimensionExtraSettingsDict = _.defaultsDeep({}, dimensionExtraSettingDict, {
        [dimName]: {
          limit: 10,
          sortDirect: 'desc',
          sortCol: _.first(metrics) || _.get(dataSourceMeasures, '[0].name')
        }
      })
    }

    // 维度变更后，需要应用调整 limit 的逻辑
    if (vizType !== 'table_flat') {
      let currDimIdx = _.findIndex(nextDimensions, dimName0 => dimName0 === dimName)
      let recalcIdxSeq =
        currDimIdx === nextDimensions.length - 1 ? _.range(nextDimensions.length - 1) : [currDimIdx, ..._.range(nextDimensions.length - 1).filter(idx => idx !== currDimIdx)]
      nextDimensionExtraSettingsDict = this.recalcAllLimit(nextDimensions, nextDimensionExtraSettingsDict, recalcIdxSeq)
    }
    let dimension = _.find(dataSourceDimensions, { name: nextDimensions[0] })
    updateHashState({
      ..._.pickBy(
        {
          dimensions: nextDimensions,
          dimensionExtraSettingDict: nextDimensionExtraSettingsDict,
          customDimensions: nextCustomDimensions,
          chartExtraSettings: _.omit(chartExtraSettings, ['customColumns'])
        },
        _.identity
      ),
      linkage: nextDimensions.length === 1 && _.get(dimension, 'type', '') === 4 ? this.props.linkage : false
    })
  }

  onDropToMetric(fromDimOrMetric, itemName, action, index) {
    let { dataSourceDimensions, updateHashStateByPath } = this.props
    if (fromDimOrMetric === '指标') {
      // 使用现有的指标
      updateHashStateByPath('', prevState => {
        // 如果是正在使用的指标项，则只移动位置
        let prevIndex = _.findIndex(prevState.metrics, m => m === itemName)
        if (prevIndex !== -1) {
          return immutateUpdate(prevState, 'metrics', prev => move(prev, prevIndex, index))
        } else if (action === 'insert') {
          return immutateUpdate(prevState, 'metrics', prev => insert(prev, index, itemName))
        } else if (action === 'replace') {
          let nextState = immutateUpdate(prevState, ['metrics', index], () => itemName)
          let removeMetricUpdater = this.genRemoveMetricUpdater(prevState.metrics[index])
          return removeMetricUpdater(nextState)
        }
      })
    } else if (fromDimOrMetric === '维度') {
      let dbDim = _.find(dataSourceDimensions, dbDim => dbDim.name === itemName)
      if (isUserTagGroupDimension(dbDim)) {
        message.warning('不支持使用组合标签创建数值', 5)
        return
      }
      let paramType = _.get(dbDim, 'params.type')
      if (paramType === DimensionParamsTypes.group) {
        message.warning('不支持使用分组维度创建数值', 5)
        return
      }
      if (isTextDimension(dbDim)) {
        message.warning('Text 类型维度不能用于筛选、分组和指标，只能用于查询源数据')
        return
      }
      // 使用维度创建新的临时指标

      // 生成临时指标的 name
      let tempMetricName = `_tempMetric_${itemName.replace(/\./g, '_')}_${generate()}`

      updateHashStateByPath('', prevState => {
        // 增加指标
        let nextState = immutateUpdate(prevState, 'metrics', prevMetrics => {
          if (action === 'append') {
            action = 'insert'
            index = prevMetrics.length
          }
          if (action === 'insert') {
            return insert(prevMetrics, index, tempMetricName)
          } else if (action === 'replace') {
            return immutateUpdate(prevMetrics, index, () => tempMetricName)
          } else {
            throw new Error('Unknown action: ' + action)
          }
        })

        if (action === 'replace') {
          let removedMetricName = prevState.metrics[index]
          let removeMetricUpdater = this.genRemoveMetricUpdater(removedMetricName)

          nextState = removeMetricUpdater(nextState)
        }

        nextState = immutateUpdate(nextState, 'chartExtraSettings', prev => _.omit(prev, ['customColumns']))

        if (action === 'replace') {
          let removedMetricName = prevState.metrics[index]
          let removeMetricUpdater = this.genRemoveMetricUpdater(removedMetricName)

          nextState = removeMetricUpdater(nextState)
        }

        // 设置标题和默认公式
        return immutateUpdate(nextState, 'tempMetricDict', prevDict => {
          let newTempMetricModel = {
            dimension: dbDim.name,
            title: dbDim.title || itemName,
            dimType: dbDim.type,
            dimParams: dbDim.params,
            aggregationType: 'count',
            format: null,
            excludeNull: true
          }
          if (action === 'insert') {
            return { ...prevDict, [tempMetricName]: newTempMetricModel }
          } else if (action === 'replace') {
            let removedMetricName = prevState.metrics[index]
            return { ..._.omit(prevDict, removedMetricName), [tempMetricName]: newTempMetricModel }
          } else {
            throw new Error('Unknown action: ' + action)
          }
        })
      })
    } else {
      throw new Error('Unknown type: ' + fromDimOrMetric)
    }
  }

  onFilterDelBtnClick = ev => {
    ev.stopPropagation()
    let preDelIdx = +ev.target.getAttribute('data-filter-tile-idx')
    if (!_.isNumber(preDelIdx)) {
      return
    }
    PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
    this.removeFilters(preDelIdx)
  }

  renderDatePickerTile(dbDim, flt, idx) {
    let { updateHashState, mainTimeDimName } = this.props

    let { eq: fltEq = '-1 days', col } = flt
    let relativeTime = isRelative(fltEq) ? fltEq : 'custom'
    let [since, until] = relativeTime === 'custom' ? fltEq : convertDateType(relativeTime)
    return (
      <div style={{ width: tileWidth, height: 28, lineHeight: '24px', margin: `4px ${tileGap}px 4px 0` }} className='itblock relative hover-display-trigger' key={idx}>
        <div
          style={{
            position: 'absolute',
            zIndex: 4,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            right: -4
          }}
          className='hover-display-iblock'
        >
          <Icon type='sugo-close' style={{ color: '#888' }} className='pointer bg-white' data-filter-tile-idx={idx} onClick={this.onFilterDelBtnClick} />
        </div>
        <DateRangePicker
          className='height-100 line-height14'
          prefix={col === mainTimeDimName ? '' : `${(dbDim && dbDim.title) || col}: `}
          alwaysShowRange
          hideCustomSelection
          style={{ width: '100%' }}
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
            let newDateFlt = {
              col: col,
              op: 'in',
              eq: relativeTime === 'custom' ? [since, until] : relativeTime,
              dateStringComparingFormat: _.get(this.state.dateStringComparingFormatDict, col) || null
            }
            updateHashState(prevState =>
              _.assign({}, prevState, {
                filters: prevState.filters.map(flt => (flt.col === col ? newDateFlt : flt))
              })
            )
          }}
        />
      </div>
    )
  }

  renderUserTagGroupFilter(dbDim, flt, i) {
    return (
      <FixWidthHelper
        key={i}
        toFix='last'
        toFixWidth='20px'
        className='tile relative'
        draggable
        onDragStart={ev => {
          ev.dataTransfer.setData('text', `维度:${flt.col}:${i}`)
        }}
      >
        <Tooltip
          title={
            <div>
              <p className='wordbreak'>{`组合标签 ${dbDim.title}`}</p>
              <p className='wordbreak'>{_.get(dbDim, 'params.formula')}</p>
            </div>
          }
        >
          <div style={{ marginLeft: 10 }} className='elli fix-text'>
            {dbDim.title}
          </div>
        </Tooltip>
        <Icon type='sugo-close' className='pointer vertical-center-of-relative' data-filter-tile-idx={i} onClick={this.onFilterDelBtnClick} />
      </FixWidthHelper>
    )
  }

  renderFilterDropArea(dropAreaWidth) {
    let { dimensions, filters, dataSourceDimensions, visiblePopoverKey, dataSourceId, timezone, updateHashState, dimensionExtraSettingDict, customDimensions = {} } = this.props
    let { mainTimeDimName } = this.context
    const newDbDim = dataSourceDimensions.map(p => convertSubTagToGroup(customDimensions, p))
    let filtersOption = filters.filter(flt => flt.op !== 'lookupin')
    return (
      <SplitTile
        className='filter-drop-area'
        width={dropAreaWidth}
        title='筛选'
        hint={filtersOption.length <= 1 && dimensions.length === 0 ? '点击或拖拽维度到筛选或维度' : null}
        options={filtersOption}
        visiblePopoverKey={visiblePopoverKey}
        onDropToPosition={(payload, dropPosition) => {
          let [type, name, originalTileIdx] = payload.split(':')
          if (type !== '维度') {
            message.error('只接受维度项')
            return
          }
          let { action, index } = dropPosition
          this.onDropToFilter(name, action, index, originalTileIdx && +originalTileIdx)
        }}
        tileDomGenerator={(flt, i) => {
          let dbDim = _.find(newDbDim, dbDim => {
            return dbDim.name === flt.col || (_.endsWith(flt.col, '__encode') && flt.col.substr(0, flt.col.length - 8) === dbDim.name)
          })
          if (!dbDim) {
            // 此维度已被删除，仍然呈现出来给用户通过界面删除
            dbDim = { name: flt.col, type: DruidColumnType.String }
          }

          if (isUserTagGroupDimension(dbDim)) {
            return this.renderUserTagGroupFilter(dbDim, flt, i)
          }

          if (isTimeDimension(dbDim) && !_.endsWith(flt.op, 'in-ranges')) {
            return this.renderDatePickerTile(dbDim, flt, i)
          }

          let display = filterTileShortDescription(flt, dbDim)
          let completeDisplay = filterTileCompleteDescription(flt, dbDim)
          let uiStrategy = analyticFilterStrategy
          if (_.get(dbDim, 'tag_extra.is_Desensitiz', '0') === '1') {
            uiStrategy = 'lite'
          }
          const newDim = convertSubTagToGroup(customDimensions, dbDim)
          let FilterPopover = FilterSettingPopover
          if (_.get(newDim, 'params.isInstitution', false)) {
            FilterPopover = FilterInstitutionsPopover
          }
          return (
            <FilterPopover
              key={i}
              mainTimeDimName={mainTimeDimName}
              visible={visiblePopoverKey === `筛选:${i}`}
              onVisibleChange={visible => {
                PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && `筛选:${i}`)
              }}
              customDimensions={customDimensions}
              dbDimension={newDim}
              dimExtraSetting={_.get(dimensionExtraSettingDict, flt.col) || {}}
              dimensionExtraSettingDict={dimensionExtraSettingDict}
              value={flt}
              onChange={newFilter => {
                const isInitOriginal = (_.isArray(flt.eq) && !flt.eq.filter(val => val === 0 || val).length) || !flt.eq
                let isEmptyNow = (_.isArray(newFilter.eq) && !newFilter.eq.filter(val => val === 0 || val).length) || !newFilter.eq

                // 这里不能直接用闭包的 i (如果有用户分群的 filter 的话会出问题)
                let indexInFilters = _.findIndex(filters, flt0 => flt0 === flt)

                let copy = filters.slice()
                if (isEmptyNow) {
                  if (isInitOriginal) {
                    // 如果本来就没有选择，则后退历史，尽量避免添加一个空的筛选器历史
                    window.history.back()
                    return
                  } else {
                    // 如果用户没有选择筛选项，则删除此筛选
                    copy[indexInFilters] = null
                  }
                } else {
                  copy[indexInFilters] = newFilter
                  if (newFilter.spreadFilters && newFilter.spreadFilters.length === 0) {
                    // 分组子过滤条件如果无，就去掉此条件
                    copy[indexInFilters] = null
                  }
                }
                // 如果本来就是空的，则替换历史
                updateHashState({ filters: copy.filter(_.identity) }, isInitOriginal)
              }}
              dataSourceId={dataSourceId}
              topNFilters={filters.filter(flt0 => flt0 !== flt)}
              topNTimezone={timezone}
              uiStrategy={uiStrategy}
            >
              <FixWidthHelper
                toFix='last'
                toFixWidth='20px'
                className='tile relative'
                draggable
                onDragStart={ev => {
                  ev.dataTransfer.setData('text', `维度:${flt.col}:${i}`)
                }}
              >
                <Tooltip title={completeDisplay}>
                  <div style={{ marginLeft: 10 }} className={classNames('elli fix-text', { 'delete-line': _.startsWith(flt.op, 'not ') })}>
                    {display}
                  </div>
                </Tooltip>
                <Icon type='sugo-close' className='pointer vertical-center-of-relative' data-filter-tile-idx={i} onClick={this.onFilterDelBtnClick} />
              </FixWidthHelper>
            </FilterPopover>
          )
        }}
      />
    )
  }

  calcMaxDimLimitByIndex({ dimIdx, dimensions, dimensionExtraSettingDict, maxSubQueryCount = DefaultMaxSubQueryCount, smallerThanMin = 2 }) {
    // 最后一个维度无限制，因为它只会进行一次子查询
    if (dimIdx === dimensions.length - 1) {
      return 100
    }
    // 最后一个维度的 limit 不影响查询次数
    let otherDimLimitProduct = _.take(dimensions, dimensions.length - 1)
      .filter((dimName, idx) => idx !== dimIdx)
      .map(dimName => _.get(dimensionExtraSettingDict, `${dimName}.limit`) || 10)
      .reduce((p, curr) => p * curr, 1)
    let myMax = maxSubQueryCount / otherDimLimitProduct
    return _.findLast(DIMENSION_POSSIBLE_LIMIT, pl => pl <= myMax) || smallerThanMin
  }

  renderDimensionDropArea(dropAreaWidth) {
    let {
      dimensions,
      metrics,
      dataSourceMeasures,
      dataSourceDimensions,
      vizType,
      visiblePopoverKey,
      dimensionExtraSettingDict,
      customDimensions = [],
      updateHashState,
      tempMetricDict,
      projectCurrent,
      filters = [],
      linkage
    } = this.props
    let dbDimNameDict = _.keyBy(dataSourceDimensions, 'name')
    let metricSet = new Set(metrics || [])
    let dbMetricsInUse = dataSourceMeasures.filter(dbM => metricSet.has(dbM.name))
    let dbMetricsNotInUse = dataSourceMeasures.filter(dbM => !metricSet.has(dbM.name))
    return (
      <SplitTile
        className='dimension-drop-area'
        width={dropAreaWidth}
        title='维度'
        style={{ borderTop: '1px solid #d2d8dc' }}
        options={dimensions}
        visiblePopoverKey={visiblePopoverKey}
        onDropToPosition={(payload, dropPosition) => {
          let [type, name] = payload.split(':')
          let { action, index } = dropPosition
          if (type !== '维度') {
            message.error('只接受维度项')
            return
          }
          this.onDropToDimension(name, action, index)
        }}
        tileDomGenerator={(dimName, i) => {
          let dbDim = dbDimNameDict[dimName]
          if (!dbDim) {
            // 此维度已被删除，仍然呈现出来给用户通过界面删除
            dbDim = { name: dimName, type: DruidColumnType.String }
          }
          // 单维度时间列最大 limit 为 1000
          let maxLimit =
            isTimeDimension(dbDim) && dimensions.length === 1
              ? 1000
              : vizType !== 'table_flat'
              ? this.calcMaxDimLimitByIndex({ dimIdx: i, dimensions, dimensionExtraSettingDict })
              : analyticNormalTableMaxGroupByLimit

          // 使用 groupBy 表格的时候，除第一维度外，其他维度只有时间粒度等设置可用，排序列和限制不可用
          let noExtraSetting = vizType === 'table_flat' && 0 < i
          let sortableDims = vizType === 'table_flat' ? [dbDim, ...dimensions.filter(dimName0 => dimName0 !== dimName).map(dimName => dbDimNameDict[dimName])] : [dbDim]
          return (
            <DimensionSettingPopover
              key={dimName}
              dimension={dbDim}
              projectCurrent={projectCurrent}
              visible={visiblePopoverKey === `维度:${dbDim.name}`}
              onVisibleChange={visible => {
                PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && `维度:${dbDim.name}`)
              }}
              value={
                dimensionExtraSettingDict[dimName] || {
                  limit: 10,
                  sortDirect: 'desc',
                  sortCol: _.first(metrics) || _.get(dataSourceMeasures, '[0].name')
                }
              }
              sortOptions={[...sortableDims, ...dbMetricsInUse, ...dbMetricAdapter(tempMetricDict), { id: 'separator', name: 'separator', title: '' }, ...dbMetricsNotInUse]}
              onChange={(newSetting, newCustomDim) => {
                let customDim = customDimensions.filter(p => p.name !== newCustomDim.name)
                let deleteFilters = customDimensions.find(p => p.name === newCustomDim.name)
                deleteFilters = (newCustomDim.isSubTag && _.isEmpty(deleteFilters)) || _.get(deleteFilters, 'isSubTag', false) !== _.get(newCustomDim, 'isSubTag', false)
                if (newCustomDim.customGroup) {
                  customDim = [...customDimensions.filter(p => p.name !== newCustomDim.name), newCustomDim]
                }
                updateHashState({
                  dimensionExtraSettingDict: { ...dimensionExtraSettingDict, [dimName]: newSetting },
                  customDimensions: customDim,
                  filters: deleteFilters ? filters.filter(p => p.col !== newCustomDim.name) : filters,
                  vizType: vizType === 'table' && customDim.filter(p => p.isSubTag).length ? 'table_flat' : vizType
                })
              }}
              maxLimit={maxLimit}
              disabledSortColAndLimit={noExtraSetting}
            >
              <FixWidthHelper
                toFix='last'
                toFixWidth='20px'
                className='tile relative'
                draggable
                onDragStart={ev => {
                  ev.dataTransfer.setData('text', `维度:${dimName}`)
                }}
              >
                <div style={{ marginLeft: 10 }} className='elli'>
                  {dbDim.title || dimName}
                </div>
                <Icon
                  type='sugo-close'
                  className='pointer vertical-center-of-relative'
                  onClick={ev => {
                    ev.stopPropagation()
                    this.removeDimension(dimName)
                  }}
                />
              </FixWidthHelper>
            </DimensionSettingPopover>
          )
        }}
      />
    )
  }

  getMetricSortDirect(metricName) {
    // 取得排序，如果所有的维度都是按这个指标排序，并且方向相同，则能够取得排序；否则为默认排序
    let { dimensions, dimensionExtraSettingDict } = this.props

    if (_.every(dimensions, xAxisName => _.get(dimensionExtraSettingDict, `${xAxisName}.sortCol`) === metricName)) {
      let sortDirs = _.uniq(dimensions.map(dimName => _.get(dimensionExtraSettingDict, `${dimName}.sortDirect`))).filter(_.identity)
      if (sortDirs.length === 1) {
        return sortDirs[0]
      }
    }
    return 'default'
  }

  setMetricSortDirect(metricName, sortDirect) {
    let { updateHashState, dimensionExtraSettingDict } = this.props
    let nextSortDirect = sortDirect === 'asc' || sortDirect === 'desc' ? sortDirect : null
    updateHashState({
      // 令全部维度都按此列 升序/降序
      dimensionExtraSettingDict: _.mapValues(dimensionExtraSettingDict, val => {
        return { ...val, sortCol: metricName, sortDirect: nextSortDirect }
      })
    })
  }

  genLocalMetric(metricName, whichLocalMetric) {
    let { updateHashStateByPath, filters } = this.props

    // 生成临时指标的 name
    let localMetricName = `_localMetric_${metricName}_${generate()}`

    // TODO 加上时间范围超长提示，例如按年同比时，时间筛选不应该超过一年
    /* let shiftDurationDict = {
      '按年同比': 'P1Y',
      '按月同比': 'P1M',
      '按周同比': 'P1W',
      '按日同比': 'P1D'
    }*/
    let funcName = MetricAdvanceCalcFuncEnum[whichLocalMetric]
    let localMetric = {
      fromMetrics: [metricName],
      funcName: funcName,
      format: _.endsWith(funcName, '增量') ? '.1f' : '.1%',
      type: 'local'
    }

    if (!localMetric.funcName) {
      throw new Error('Unsupported local metric type: ' + whichLocalMetric)
    }
    updateHashStateByPath('', prevState => {
      return {
        metrics: [...prevState.metrics, localMetricName],
        localMetricDict: {
          ...prevState.localMetricDict,
          [localMetricName]: localMetric
        }
      }
    })
  }

  renderStringMetricDropDownMenu(metricName, tempMetricModel, updateHashStateByPath) {
    let sortDir = this.getMetricSortDirect(metricName)

    let onMenuItemClick = menuEv => {
      if (menuEv.key === 'excludeNull') {
        updateHashStateByPath(`tempMetricDict.${metricName}`, prev => {
          let isCurrExcludeNull = prev.excludeNull
          return {
            ...prev,
            excludeNull: !isCurrExcludeNull
          }
        })
      } else if (menuEv.key === 'formatSettings') {
        // 设置数值显示格式
        PubSub.publish('analytic.onVisiblePopoverKeyChange', 'metricFormatSettingModal')
        this.setState({
          metricWhichSettingFormat: metricName
        })
      } else if (menuEv.keyPath.length === 2) {
        let [key0, key1] = menuEv.keyPath
        if (key1 === 'sortDirect') {
          this.setMetricSortDirect(metricName, menuEv.key)
        } else if (key1 === 'genLocalMetric') {
          this.genLocalMetric(metricName, menuEv.key)
        }
      } else {
        let formulaGenerator = stringFormulaGenerator(tempMetricModel)
        if (menuEv.key in formulaGenerator) {
          // 切换公式，如果维度不是数字类型，无法使用 求和、平均值、最大和最小值
          PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
          updateHashStateByPath(`tempMetricDict.${metricName}`, prev => {
            return {
              ...prev,
              aggregationType: menuEv.key
            }
          })
        }
      }
    }
    return (
      <Menu selectedKeys={[sortDir, tempMetricModel.aggregationType]} onClick={onMenuItemClick}>
        {aggregationTypeForStringDimension.map(aggTypeName => {
          return <MenuItem key={aggTypeName}>{aggregationTypeNameDict[aggTypeName]}</MenuItem>
        })}
        <MenuDivider />
        <MenuItem key='excludeNull'>{`排除空值（${tempMetricModel.excludeNull ? '开启' : '关闭'}）`}</MenuItem>
        <MenuDivider />
        <SubMenu key='sortDirect' title='排序'>
          <MenuItem key='default'>默认</MenuItem>
          <MenuItem key='asc'>升序</MenuItem>
          <MenuItem key='desc'>降序</MenuItem>
        </SubMenu>
        <MenuItem key='formatSettings'>指标显示格式</MenuItem>
        <SubMenu key='genLocalMetric' title='高级计算'>
          {Object.keys(MetricAdvanceCalcFuncEnum).map(k => {
            return <MenuItem key={k}>{MetricAdvanceCalcFuncEnum[k]}</MenuItem>
          })}
        </SubMenu>
      </Menu>
    )
  }

  renderNumberMetricDropDownMenu(metricName, tempMetricModel, updateHashStateByPath) {
    let sortDir = this.getMetricSortDirect(metricName)

    let onMenuItemClick = menuEv => {
      if (menuEv.key === 'excludeNull') {
        updateHashStateByPath(`tempMetricDict.${metricName}`, prev => {
          let isCurrExcludeNull = prev.excludeNull
          return {
            ...prev,
            excludeNull: !isCurrExcludeNull
          }
        })
      } else if (menuEv.key === 'formatSettings') {
        // 设置数值显示格式
        PubSub.publish('analytic.onVisiblePopoverKeyChange', 'metricFormatSettingModal')
        this.setState({
          metricWhichSettingFormat: metricName
        })
      } else if (menuEv.keyPath.length === 2) {
        let [key0, key1] = menuEv.keyPath
        if (key1 === 'sortDirect') {
          this.setMetricSortDirect(metricName, menuEv.key)
        } else if (key1 === 'genLocalMetric') {
          this.genLocalMetric(metricName, menuEv.key)
        }
      } else {
        let formulaGenerator = numberFormulaGenerator(tempMetricModel)

        if (menuEv.key in formulaGenerator) {
          // 切换公式，如果维度不是数字类型，无法使用 求和、平均值、最大和最小值
          PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
          updateHashStateByPath(`tempMetricDict.${metricName}`, prev => {
            return {
              ...prev,
              aggregationType: menuEv.key
            }
          })
        }
      }
    }
    return (
      <Menu selectedKeys={[sortDir, tempMetricModel.aggregationType]} onClick={onMenuItemClick}>
        {aggregationTypeForNumberDimension.map(aggTypeName => {
          return <MenuItem key={aggTypeName}>{aggregationTypeNameDict[aggTypeName]}</MenuItem>
        })}
        <MenuDivider />
        <MenuItem key='excludeNull'>{`排除空值（${tempMetricModel.excludeNull ? '开启' : '关闭'}）`}</MenuItem>
        <MenuDivider />
        <SubMenu key='sortDirect' title='排序'>
          <MenuItem key='default'>默认</MenuItem>
          <MenuItem key='asc'>升序</MenuItem>
          <MenuItem key='desc'>降序</MenuItem>
        </SubMenu>
        <MenuItem key='formatSettings'>指标显示格式</MenuItem>
        <SubMenu key='genLocalMetric' title='高级计算'>
          {Object.keys(MetricAdvanceCalcFuncEnum).map(k => {
            return <MenuItem key={k}>{MetricAdvanceCalcFuncEnum[k]}</MenuItem>
          })}
        </SubMenu>
      </Menu>
    )
  }

  renderLocalMetricDropDownMenu(metricName) {
    let onMenuItemClick = menuEv => {
      if (menuEv.key === 'formatSettings') {
        // 设置数值显示格式
        PubSub.publish('analytic.onVisiblePopoverKeyChange', 'metricFormatSettingModal')
        this.setState({
          metricWhichSettingFormat: metricName
        })
      }
    }
    return (
      <Menu selectedKeys={[]} onClick={onMenuItemClick}>
        <MenuItem key='formatSettings'>指标显示格式</MenuItem>
      </Menu>
    )
  }

  renderDbMetricDropDownMenu(dbMetric) {
    let sortDir = this.getMetricSortDirect(dbMetric.name)

    let onMenuItemClick = menuEv => {
      if (menuEv.keyPath.length === 2) {
        let [key0, key1] = menuEv.keyPath
        if (key1 === 'sortDirect') {
          this.setMetricSortDirect(dbMetric.name, menuEv.key)
        } else if (key1 === 'genLocalMetric') {
          this.genLocalMetric(dbMetric.name, menuEv.key)
        }
      }
    }
    return (
      <Menu selectedKeys={[sortDir]} onClick={onMenuItemClick}>
        <SubMenu key='sortDirect' title='排序'>
          <MenuItem key='default'>默认</MenuItem>
          <MenuItem key='asc'>升序</MenuItem>
          <MenuItem key='desc'>降序</MenuItem>
        </SubMenu>
        <SubMenu key='genLocalMetric' title='高级计算'>
          {Object.keys(MetricAdvanceCalcFuncEnum).map(k => {
            return <MenuItem key={k}>{MetricAdvanceCalcFuncEnum[k]}</MenuItem>
          })}
        </SubMenu>
      </Menu>
    )
  }

  renderMetricDropArea(dropAreaWidth) {
    let { metrics, dataSourceMeasures, visiblePopoverKey, updateHashStateByPath, tempMetricDict, dataSourceDimensions, localMetricDict, updateHashState, vizType } = this.props

    let tileGen = (metricName, title, extraProps) => {
      return (
        <FixWidthHelper
          toFix='last'
          toFixWidth='20px'
          draggable
          onDragStart={ev => {
            ev.dataTransfer.setData('text', `指标:${metricName}`)
          }}
          {...extraProps}
          className={classNames(extraProps && extraProps.className, 'tile relative')}
        >
          <div style={{ marginLeft: 10 }} className='elli'>
            {title}
          </div>
          <Icon
            type='sugo-close'
            className='fpointer vertical-center-of-relative'
            onClick={ev => {
              ev.stopPropagation()
              if (vizType !== 'table_flat' && metrics.length <= 1) {
                message.warning('至少需要保留一个值')
                return
              }
              updateHashState(this.genRemoveMetricUpdater(metricName))
            }}
          />
        </FixWidthHelper>
      )
    }
    return (
      <SplitTile
        className='metric-drop-area'
        width={dropAreaWidth}
        title='数值'
        style={{ borderTop: '1px solid #d2d8dc' }}
        options={metrics}
        visiblePopoverKey={visiblePopoverKey}
        onDropToPosition={(payload, dropPosition) => {
          let [type, name] = payload.split(':')
          let { action, index } = dropPosition
          if (type !== '维度' && type !== '指标') {
            message.error('只接受维度或指标项')
            return
          }
          if (_.some(dataSourceDimensions, dbDim => dbDim.name === name && isTimeDimension(dbDim))) {
            message.error('只接受非时间维度或指标项')
            return
          }
          this.onDropToMetric(type, name, action, index)
        }}
        tileDomGenerator={metricName => {
          if (_.startsWith(metricName, '_tempMetric_')) {
            /** tempMetric definition: {
              dimension: '',
              title: '',
              format: '',
              excludeNull: false
              aggregationType: 'count',
              dimType: 0,
              filters: [{ col, op, eq }]
           } */

            let tempMetricModel = tempMetricDict[metricName]
            let { formula, title } = singleDbMetricAdapter(metricName, tempMetricModel)

            const menu =
              DruidColumnTypeInverted[tempMetricModel.dimType] === 'number'
                ? this.renderNumberMetricDropDownMenu(metricName, tempMetricModel, updateHashStateByPath)
                : this.renderStringMetricDropDownMenu(metricName, tempMetricModel, updateHashStateByPath)
            return (
              <Dropdown
                key={metricName}
                overlay={menu}
                trigger={['click']}
                visible={visiblePopoverKey === `tempMetricDropDown-${metricName}`}
                onVisibleChange={visible => {
                  PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && `tempMetricDropDown-${metricName}`)
                }}
              >
                <Tooltip
                  key={metricName}
                  title={
                    <div>
                      <p className='wordbreak'>{title}</p>
                      <p className='wordbreak'>{formula}</p>
                    </div>
                  }
                  mouseEnterDelay={1.5}
                >
                  {tileGen(metricName, title)}
                </Tooltip>
              </Dropdown>
            )
          } else if (_.startsWith(metricName, '_localMetric_')) {
            if (!localMetricDict || !localMetricDict[metricName]) {
              return null
            }
            let menu = this.renderLocalMetricDropDownMenu(metricName)
            let fakeDbMetric = LocalMetric.dbMetricAdapter(metricName, localMetricDict[metricName], dataSourceMeasures, tempMetricDict)
            return (
              <Dropdown
                key={metricName}
                overlay={menu}
                trigger={['click']}
                visible={visiblePopoverKey === `localMetricDropDown-${metricName}`}
                onVisibleChange={visible => {
                  PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && `localMetricDropDown-${metricName}`)
                }}
              >
                <Tooltip key={metricName} title={<p className='wordbreak'>{fakeDbMetric.title}</p>} mouseEnterDelay={1.5}>
                  {tileGen(metricName, fakeDbMetric.title, { style: { cursor: 'default' }, key: metricName })}
                </Tooltip>
              </Dropdown>
            )
          } else {
            // 指标
            let metricModel = _.find(dataSourceMeasures, dbM => dbM.name === metricName)
            if (!metricModel) {
              return null
            }
            let menu = this.renderDbMetricDropDownMenu(metricModel)
            return (
              <Dropdown
                key={metricName}
                overlay={menu}
                trigger={['click']}
                visible={visiblePopoverKey === `dbMetricDropDown-${metricName}`}
                onVisibleChange={visible => {
                  PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && `dbMetricDropDown-${metricName}`)
                }}
              >
                <Tooltip
                  key={metricName}
                  title={
                    <div>
                      <p className='wordbreak'>{metricModel.title}</p>
                      <p className='wordbreak'>{metricModel.formula}</p>
                    </div>
                  }
                  mouseEnterDelay={1.5}
                >
                  {tileGen(metricName, metricModel.title, { style: { cursor: 'default' } })}
                </Tooltip>
              </Dropdown>
            )
          }
        }}
      />
    )
  }

  isHasInitTimeFlt() {
    let { filters } = this.props
    let timeDimName = this.getTimeDim()
    return _.some(filters, flt => flt.col === timeDimName && flt.op === 'in' && flt._willChange)
  }

  onMaxTimeLoaded = data => {
    let { maxTime } = data || {}
    const { updateHashState, mainTimeDimName } = this.props
    if (!maxTime || maxTime === '0000-00-00') {
      updateHashState(prevState => {
        let timeFltIdx = _.findIndex(prevState.filters, flt => flt.col === mainTimeDimName)
        return immutateUpdate(prevState, ['filters', timeFltIdx], flt => _.omit(flt, '_willChange'))
      })
      return
    }

    debug(maxTime, 'maxTime-----')

    updateHashState(prevState => {
      let timeFltIdx = _.findIndex(prevState.filters, flt => flt.col === mainTimeDimName)
      if (timeFltIdx < 0) {
        return prevState
      }

      // 如果 maxTime 在 analyticDefaultTime 时间范围内，则无须偏移
      let timeFlt = prevState.filters[timeFltIdx]
      let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
      let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)
      if (moment(maxTime).isAfter(since) && moment(maxTime).isBefore(until)) {
        return immutateUpdate(prevState, ['filters', timeFltIdx], flt => _.omit(flt, '_willChange'))
      }

      let newDateFlt = {
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
      return {
        filters: immutateUpdate(prevState.filters, [timeFltIdx], () => newDateFlt)
      }
    }, true)
  }

  getTimeDim(props = this.props) {
    let { dataSourceDimensions, mainTimeDimName } = props
    if (!mainTimeDimName) {
      return false
    }
    return _.some(dataSourceDimensions, dim => dim.name === mainTimeDimName) ? mainTimeDimName : null
  }

  render() {
    let {
      style,
      className,
      visiblePopoverKey,
      tempMetricDict,
      updateHashStateByPath,
      spWidth,
      dataSourceId,
      dataSourceDimensions,
      filters,
      timezone,
      mainTimeDimName,
      projectCurrent,
      customDimensions,
      drillDownFn
    } = this.props

    let { metricWhichSettingFormat, dateStringComparingFormatDict, isSliceStale, isFetchingSliceData, isFetchingMaxTime } = this.state

    let dropAreaWidth = spWidth - 64

    // 如果是从单图加载，则不查询 maxTime
    let isOpeningSlice = _.startsWith(window.location.search, '?sliceId=')
    return (
      <div ref={ref => (this._rootDiv = ref)} style={style} className={className}>
        {analytics_manual_load_chart_data ? (
          <div className='bg-white corner'>
            <div style={{ width: `calc(100% - ${ButtonPartWidth}px)` }} className='itblock'>
              {this.renderFilterDropArea(dropAreaWidth)}
              {this.renderDimensionDropArea(dropAreaWidth)}
              {this.renderMetricDropArea(dropAreaWidth)}
            </div>
            <div
              style={{
                width: ButtonPartWidth,
                height: ((this._rootDiv && this._rootDiv.offsetHeight) || 120) - 10,
                minHeight: 120 - 10
              }}
              className='itblock absolute borderl pd2'
            >
              <Button
                className='font14 center-of-relative'
                type={isSliceStale ? 'primary' : 'success'}
                loading={isFetchingSliceData || isFetchingMaxTime}
                onClick={() => {
                  PubSub.publish('analytic.auto-load')
                  drillDownFn([])
                }}
              >
                执行查询
              </Button>
            </div>
          </div>
        ) : (
          <div className='bg-white corner'>
            {this.renderFilterDropArea(dropAreaWidth)}
            {this.renderDimensionDropArea(dropAreaWidth)}
            {this.renderMetricDropArea(dropAreaWidth)}
          </div>
        )}

        <MetricFormatSettingModal
          visible={visiblePopoverKey === 'metricFormatSettingModal'}
          onVisibleChange={visible => {
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'metricFormatSettingModal')
            if (!visible) {
              this.setState({
                metricWhichSettingFormat: null
              })
            }
          }}
          value={(metricWhichSettingFormat && _.get(tempMetricDict, `${metricWhichSettingFormat}.format`)) || ',.2f'}
          onChange={newFormat => {
            let dictName = _.startsWith(metricWhichSettingFormat, '_localMetric_') ? 'localMetricDict' : 'tempMetricDict'
            updateHashStateByPath(`${dictName}["${metricWhichSettingFormat}"].format`, () => newFormat)
          }}
        />

        {/* 先查一条数据，取得 dateString 的对比格式 */}
        <DruidDataFetcher
          dataSourceId={dataSourceId}
          doFetch={!dateStringComparingFormatDict && _.some(dataSourceDimensions, dbDim => dbDim.type === DruidColumnType.DateString)}
          filters={filters}
          customDimensions={customDimensions}
          timezone={timezone}
          select={['*']}
          selectLimit={1}
          selectOrderDirection={'desc'}
          onError={err => {
            // 屏蔽报错
            throw err
          }}
          onData={data => {
            let dateStringCols = dataSourceDimensions.filter(dbDim => dbDim.type === DruidColumnType.DateString).map(dbDim => dbDim.name)
            let subSet = _.pick(data[0], dateStringCols)
            this.setState({
              dateStringComparingFormatDict: _.mapValues(subSet, val => parseFormat(val))
            })
          }}
        />

        <BoundaryTimeFetcher
          timeDimName={mainTimeDimName}
          dataSourceId={dataSourceId}
          forceLuceneTimeSeries={!!projectCurrent.parent_id}
          childProjectId={projectCurrent.parent_id ? projectCurrent.id : null}
          doQueryMinTime={false}
          onFetchingStateChange={isFetching => {
            this.setState({ isFetchingMaxTime: isFetching })
          }}
          timezone={timezone}
          doFetch={!isOpeningSlice && !!dataSourceId && this.getTimeDim() && this.isHasInitTimeFlt() /* 如果更改过时间过滤器，则不再拿 maxTime */}
          onTimeLoaded={this.onMaxTimeLoaded}
        />
      </div>
    )
  }
}
