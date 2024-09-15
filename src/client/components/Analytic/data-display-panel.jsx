import { analyticVizTypeChartComponentMap, vizTypeHintMap } from '../../constants/viz-component-map'
import React from 'react'
import _ from 'lodash'
import { message, Button } from 'antd'
import { withHashStateDec } from '../Common/hash-connector'
import PubSub from 'pubsub-js'
import { includeCookie, noCache, recvJSON } from '../../common/fetch-utils'
import SliceChartFacade from '../Slice/slice-chart-facade'
import { decompressUrlQuery, tryJsonParse, compressUrlQuery, immutateUpdate, immutateUpdates } from '../../../common/sugo-utils'
import moment from 'moment'
import { DruidColumnTypeInverted, isTimeDimension, isNumberDimension, isCustomDimension, isDesensitizDimension } from '../../../common/druid-column-type'
import { dbMetricAdapter, singleDbMetricAdapter } from '../../../common/temp-metric'
import FetchFinal from '../../common/fetch-final'
import extractNumberRange from '../../../common/number-range'
import { customMetricProperties, formatUseOriginalPattern, handlePreMetrics, sliceParamsProperties } from '../../../common/druid-query-utils'
import { EMPTY_VALUE_OR_NULL, DIMENSION_TYPES } from '../../../common/constants'
import { convertSubTagToGroup } from '../../../common/subTagGroup'
import { connect } from 'react-redux'
import * as actions from '../../actions/institutions'
import { bindActionCreators } from 'redux'
import copyTextToClipboard from '../../common/copy'

let noCacheParams = _.defaultsDeep({}, recvJSON, noCache, includeCookie)

let wrapperStyleGen = vizType => {
  if (_.startsWith(vizType, 'table')) {
    return {
      padding: '10px',
      borderTop: '10px solid white',
      borderBottom: '10px solid white'
    }
  }
  return { padding: '10px' }
}

let { analytics_manual_load_chart_data: manualLoadData = false } = window.sugo

@connect(state => _.pick(state.common, ['institutionsList', 'institutionsTree']), dispatch => bindActionCreators(actions, dispatch))
@withHashStateDec(state => {
  return { ...state, dataSourceId: state.selectedDataSourceId }
})
export default class DataDisplayPanel extends React.Component {
  state = {
    tempSlice: null
  }

  batchSetFilters(dimensions, vals, dataSourceDimensions, selectType) {
    let cols = _.take(dimensions, vals.length)

    let emptyOrNot = selectType === 'exclude' ? 'not ' : ''

    let fGen = (dimension, value) => prevState => {
      let { filters } = prevState
      let originalFilter = _.find(filters, flt => flt.col === dimension && flt.op !== 'lookupin')
      let alreadyHasFilter = !!originalFilter

      let dbDim = _.find(dataSourceDimensions, dbDim => dbDim.name === dimension)

      if (!dbDim) {
        throw new Error(`Can not find dimension: ${dimension}`)
      }

      let newFlt = {
        col: isDesensitizDimension(dbDim) ? `${dimension}__encode` : dimension,
        op: `${emptyOrNot}in`,
        type: DruidColumnTypeInverted[dbDim.type]
        // eq: null,
        // containsNull: false
      }
      if (isTimeDimension(dbDim)) {
        if (selectType === 'exclude') {
          message.warn('暂不支持排除时间范围')
          return prevState
        }
        if (!value) {
          newFlt.op = `${emptyOrNot}in-ranges`
          newFlt.eq = [EMPTY_VALUE_OR_NULL]
          newFlt.containsNull = true
        } else {
          let granularity = _.get(prevState, `dimensionExtraSettingDict.${dimension}.granularity`) || 'P1D'
          newFlt.eq = [value, formatUseOriginalPattern(moment(value).add(moment.duration(granularity)))]
        }
      } else if (isNumberDimension(dbDim)) {
        // let granularity = _.get(prevState, `dimensionExtraSettingDict.${dimension}.granularity`) || 10
        let range = extractNumberRange(value)
        if (range) {
          let [from, to] = range
          newFlt.eq = [from, to]
        } else if (_.isNumber(value) && isCustomDimension(dbDim)) {
          newFlt.eq = [value]
          newFlt.op = `${emptyOrNot}equal`
        } else {
          newFlt.op = `${emptyOrNot}nullOrEmpty`
          newFlt.eq = [EMPTY_VALUE_OR_NULL]
        }
      } else {
        if (originalFilter && newFlt.op === originalFilter.op) {
          // 如果原来就有同样 op 的 filter，则合并
          let newVal = !value ? EMPTY_VALUE_OR_NULL : value
          newFlt.eq = originalFilter ? _.orderBy(_.uniq([newVal, ...originalFilter.eq]), val => (val === EMPTY_VALUE_OR_NULL ? -1 : 0)) : [newVal]
          newFlt.containsNull = originalFilter ? originalFilter.containsNull || !value : !value
        } else {
          newFlt.eq = [!value ? EMPTY_VALUE_OR_NULL : value]
          newFlt.containsNull = !value
        }
      }

      // 不影响 用户分群 的 filter
      let newFilters = alreadyHasFilter ? filters.map(flt => (flt === originalFilter ? newFlt : flt)) : filters.concat([newFlt])
      return { ...prevState, filters: newFilters }
    }

    let stateMappers = _.zip(cols, vals)
      .map(([dim0, val0]) => (val0 !== undefined ? fGen(dim0, val0) : null))
      .filter(_.identity)

    return _.flow(stateMappers)
  }

  metricToFilter = async (metricName, selectType) => {
    let { dataSourceMeasures, dataSourceDimensions, tempMetricDict } = this.props

    let dbMetric = _.startsWith(metricName, '_tempMetric_')
      ? singleDbMetricAdapter(metricName, tempMetricDict[metricName])
      : _.find(dataSourceMeasures, dbM => dbM.name === metricName)

    let res = dbMetric && (await FetchFinal.get('/app/measure/convert-formula-to-filters', { formula: dbMetric.formula }))
    if (!res) {
      return _.identity
    }
    let { result: filtersInMetric } = res

    if (!filtersInMetric || !filtersInMetric.length) {
      return _.identity
    }
    if (selectType === 'exclude') {
      // 排除则取反
      filtersInMetric = filtersInMetric.map(flt => ({ ...flt, op: _.startsWith(flt.op, 'not ') ? flt.op.substr(4) : `not ${flt.op}` }))
    }
    return prevState => {
      this.canNotMergeFilterReason = null
      let nextFilters = this.mergeFilters(prevState.filters, filtersInMetric, dataSourceDimensions)
      this.reportCanNotMatchReasons()
      return {
        ...prevState,
        filters: nextFilters
      }
    }
  }

  setCanNotMergeFilterReason(filter, reason) {
    if (!this.canNotMergeFilterReason) {
      this.canNotMergeFilterReason = {}
    }
    let { col, op, eq } = filter
    let prevReasons = this.canNotMergeFilterReason[col] || []
    this.canNotMergeFilterReason = { ...this.canNotMergeFilterReason, [col]: _.uniq([...prevReasons, reason]) }
  }

  reportCanNotMatchReasons() {
    let canNotMergeFilterReason = this.canNotMergeFilterReason
    if (!canNotMergeFilterReason) {
      return
    }
    message.warning(
      <div className='itblock'>
        {Object.keys(canNotMergeFilterReason).map((col, idx) => {
          return <p key={idx}>{canNotMergeFilterReason[col].join('，')}</p>
        })}
      </div>,
      5
    )
  }

  mergeFilters(prevFilters, extraFilters, dbDims) {
    if (!extraFilters || !extraFilters.length) {
      return prevFilters
    }
    let [headFlt, ...rest] = extraFilters
    let { col, op, eq } = headFlt
    let existedSameColFilterIdx = _.findIndex(prevFilters, flt => flt.col === col)
    if (existedSameColFilterIdx === -1) {
      return this.mergeFilters([...prevFilters, headFlt], rest, dbDims)
    }
    let existedSameColFilter = prevFilters[existedSameColFilterIdx]
    let dbDim = _.find(dbDims, dbD => dbD.name === col)
    if (isTimeDimension(dbDim) || isNumberDimension(dbDim)) {
      this.setCanNotMergeFilterReason(headFlt, `暂不支持合并时间或数值的指标条件：${dbDim.title || dbDim.name}`)
      return this.mergeFilters(prevFilters, rest, dbDims)
    }
    // 合并同 col 的 filter
    switch (existedSameColFilter.op) {
      case 'in':
        if (op === 'in' || op === 'equal') {
          let mergedFilters = immutateUpdate(prevFilters, `[${existedSameColFilterIdx}].eq`, prevEq => _.uniq([...prevEq, ...eq]))
          return this.mergeFilters(mergedFilters, rest, dbDims)
        } else {
          this.setCanNotMergeFilterReason(headFlt, `${dbDim.title || col} 列的指标筛选条件与已有的条件不兼容`)
        }
        break
      case 'not in':
        if (op === 'not in' || op === 'not equal') {
          let mergedFilters = immutateUpdate(prevFilters, `[${existedSameColFilterIdx}].eq`, prevEq => _.uniq([...prevEq, ...eq]))
          return this.mergeFilters(mergedFilters, rest, dbDims)
        } else {
          this.setCanNotMergeFilterReason(headFlt, `${dbDim.title || col} 列的指标筛选条件与已有的条件不兼容`)
        }
        break
      case 'equal':
        if (op === 'in' || op === 'equal') {
          let mergedFilters = immutateUpdate(prevFilters, `[${existedSameColFilterIdx}]`, prevFlt => {
            return { ...prevFlt, op: 'in', eq: _.uniq([...prevFlt.eq, ...eq]) }
          })
          return this.mergeFilters(mergedFilters, rest, dbDims)
        } else {
          this.setCanNotMergeFilterReason(headFlt, `${dbDim.title || col} 列的指标筛选条件与已有的条件不兼容`)
        }
        break
      case 'not equal':
        if (op === 'not in' || op === 'not equal') {
          let mergedFilters = immutateUpdate(prevFilters, `[${existedSameColFilterIdx}]`, prevFlt => {
            return { ...prevFlt, op: 'not in', eq: _.uniq([...prevFlt.eq, ...eq]) }
          })
          return this.mergeFilters(mergedFilters, rest, dbDims)
        } else {
          this.setCanNotMergeFilterReason(headFlt, `${dbDim.title || col} 列的指标筛选条件与已有的条件不兼容`)
        }
        break
      default:
        this.setCanNotMergeFilterReason(headFlt, `${dbDim.title || col} 列的指标筛选条件与已有的条件不兼容`)
        return this.mergeFilters(prevFilters, rest, dbDims)
    }

    return this.mergeFilters(prevFilters, rest, dbDims)
  }

  converSubTagFilter(analyticParams, dimVals, dim) {
    const dimMap = _.keyBy(dim, p => p.name)
    let { dimensionExtraSettingDict = {}, dimensions = {}, customDimensions = [], filters = [] } = analyticParams
    const subTagSetting = _.mapValues(dimensionExtraSettingDict, (v, k) => v.numberSplitType === 'subTag')
    const newFilters = []
    const newAnalyticParams = _.cloneDeep(analyticParams)
    const newDimVals = _.cloneDeep(dimVals)
    let oldFilters = _.cloneDeep(filters)
    _.forEach(dimensions, (p, i) => {
      if (_.get(subTagSetting, p, false)) {
        oldFilters = oldFilters.filter(f => f.col !== p)
        if (!dimVals[i]) {
          return
        }
        const dimSubTag = customDimensions.find(d => d.name === p) || {}
        const filterVal = _.get(dimSubTag, `customGroup.${dimVals[i]}`, [])
        let itemType = _.get(dimMap, `${p}.type`, -1)
        const isNumber =
          itemType === DIMENSION_TYPES.int ||
          itemType === DIMENSION_TYPES.float ||
          itemType === DIMENSION_TYPES.double ||
          itemType === DIMENSION_TYPES.bigDecimal ||
          itemType === DIMENSION_TYPES.long
        const isDate = itemType === DIMENSION_TYPES.date

        let filter = { op: 'in', col: p, eq: filterVal }
        if (isNumber) {
          filter = { op: 'in', col: p, eq: filterVal }
        } else if (isDate) {
          let [start, end] = filterVal.length === 1 ? [filterVal[0], filterVal[0]] : filterVal
          start = moment(start).startOf('d').toISOString()
          end = moment(end).endOf('d').toISOString()
          {
            filter = { op: 'in', col: p, eq: [start, end] }
          }
        }
        newFilters.push(filter)
        newDimVals[i] = undefined
      }
    })
    newAnalyticParams.filters = [...oldFilters, ...newFilters]
    newAnalyticParams.customDimensions = {}
    return {
      newAnalyticParams,
      newDimVals
    }
  }

  componentDidMount() {
    this.autoReloadSubscribeToken = PubSub.subscribe('analytic.auto-load', (msg, opt) => {
      let isFetchingDruidData = _.get(this._sliceChartFacade, 'props.isFetchingDruidData')
      if (isFetchingDruidData) {
        // 防止用户太频繁点击刷新，导致中断正在查询的请求
        return
      }
      if (opt === 'whenNotQueryBefore' && !_.isEmpty(this.state.tempSlice)) {
        return
      }
      let reloadDruidDataFunc = _.get(this._sliceChartFacade, 'props.reloadDruidData')
      if (manualLoadData) {
        let tempSlice = this.genSliceFromProps(this.props)
        // 如果单图设置一样，则强制刷新
        if (_.isEqual(tempSlice, this.state.tempSlice)) {
          reloadDruidDataFunc(undefined, noCacheParams)
        } else {
          this.setState({ tempSlice })
        }
        PubSub.publish('analytic.isSliceStale', false)
      } else if (reloadDruidDataFunc) {
        reloadDruidDataFunc(undefined, noCacheParams)
      }
    })
    PubSub.subscribe('analytic.select-multi-dimension-value', async (msg, { dimVals, metricName, selectType }) => {
      let { updateHashState, dataSourceDimensions, dimensions, customDimensions } = this.props
      const newDbDim = dataSourceDimensions.map(p => convertSubTagToGroup(customDimensions, p))
      let stateUpdater = _.isEmpty(dimVals) ? _.identity : this.batchSetFilters(dimensions, dimVals, newDbDim, selectType)
      if (metricName) {
        let stateUpdater0 = await this.metricToFilter(metricName, selectType)
        stateUpdater = _.flow(stateUpdater, stateUpdater0)
      }
      updateHashState(stateUpdater)
    })

    PubSub.subscribe('analytic.generate-inspect-source-data-url', async (msg, { dimVals, metricName, urlCallback }) => {
      let { dataSourceDimensions, dimensions } = this.props
      let analyticParams = tryJsonParse(decompressUrlQuery(location.hash.slice(1)))
      let { newDimVals, newAnalyticParams } = _.isEmpty(dimVals)
        ? { newDimVals: dimVals, newAnalyticParams: analyticParams }
        : this.converSubTagFilter(analyticParams, dimVals, dataSourceDimensions)
      let stateUpdater = _.isEmpty(newDimVals) ? _.identity : this.batchSetFilters(dimensions, newDimVals, dataSourceDimensions)
      if (metricName) {
        let stateUpdater0 = await this.metricToFilter(metricName)
        stateUpdater = _.flow(stateUpdater, stateUpdater0)
      }

      let newState = stateUpdater(newAnalyticParams)

      let nextHash = compressUrlQuery(JSON.stringify(newState))

      urlCallback(`/console/analytic/inspect-source-data#${nextHash}`)
    })
    PubSub.subscribe('analytic.get-chart-data', (msg, callback) => {
      let { druidData, total, isFetchingDruidData } = _.get(this._sliceChartFacade, 'props') || {}
      if (isFetchingDruidData) {
        message.warn('图表数据正在加载，请稍后再试')
        return
      }
      if (_.isEmpty(druidData) && _.isEmpty(total)) {
        message.warn('图表无数据或未进行查询')
        return
      }
      callback({ chartSlice: this.state.tempSlice, druidData, total, isFetchingDruidData })
    })
    window.logSliceComponentInfo = (copy = false, standalone = false) => {
      let p = _.pick(this._sliceChartFacade.props, ['slice', 'druidData', 'total', 'dataSourceMeasures', 'dataSourceDimensions'])
      let usingDimsSet = new Set(_.get(p.slice, 'params.dimensions') || [])
      let usingMetricsSet = new Set(_.get(p.slice, 'params.metrics') || [])
      p.dataSourceMeasures = (p.dataSourceMeasures || []).filter(m => usingMetricsSet.has(m.name) && m.title).map(m => ({ name: m.name, title: m.title, formula: m.formula }))
      p.dataSourceDimensions = (p.dataSourceDimensions || []).filter(d => usingDimsSet.has(d.name) && d.title).map(m => ({ name: m.name, title: m.title }))
      if (standalone) {
        let dbMetricDict = _.keyBy(p.dataSourceMeasures, 'name')
        p = immutateUpdates(p, 'slice.params', sliceParams => {
          // 将数据库指标转换为临时指标
          let customMetrics = handlePreMetrics(sliceParams.customMetrics || []).concat(dbMetricAdapter(sliceParams.tempMetricDict).map(obj => _.pick(obj, customMetricProperties)))

          return {
            ..._.omit(sliceParams, 'tempMetricDict'),
            metrics: _.filter(sliceParams.metrics, mName => !(mName in dbMetricDict) && !_.startsWith(mName, '_tempMetric_')),
            customMetrics: [...customMetrics, ...p.dataSourceMeasures.map(dbMetric => ({ ...dbMetric, name: `_tempMetric_${dbMetric.name}` }))]
          }
        })
      }
      const str = JSON.stringify(p, null, 2)
      console.log(str)
      if (copy) {
        copyTextToClipboard(str)
      }
    }
    this.props.getInstitutions()
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!manualLoadData || _.isEqual(this.props, prevProps)) {
      return
    }

    let nextSlice = this.genSliceFromProps(this.props)
    if (!_.isEqual(prevState.tempSlice, nextSlice)) {
      let changingProject = _.get(prevState.tempSlice, 'druid_datasource_id') !== nextSlice.druid_datasource_id
      let initHash = _.isEmpty(nextSlice.params.metrics)

      if (changingProject || initHash) {
        this.setState({ tempSlice: null })
      } else {
        PubSub.publish('analytic.isSliceStale', true)
      }
    }
  }

  genSliceFromProps(props) {
    // 如果维度属性中有机构维度（params.isInstitution）则默认加上机构条件过滤
    // const { dataSourceDimensions, institutionsList } = props
    // const dim = _.find(dataSourceDimensions, p => _.get(p, 'params.isInstitution', false))
    // if (_.isEmpty(dim)) {
    //   return {
    //     druid_datasource_id: props.dataSourceId,
    //     child_project_id: props.child_project_id,
    //     params: _.pick(props, sliceParamsProperties)
    //   }
    // }
    // let filters = _.cloneDeep(props.filters)
    // if(_.findIndex(filters, p=> p.col === dim.name && p.op === 'in') < 0) {
    //   const institutions_id =  _.get(sugo, 'user.role_institutions', '') || _.get(sugo, 'user.institutions_id', '')
    //   const data = getHasPromessinInstitutions(institutionsList, institutions_id)
    //   filters.push({ col: dim.name, op: 'in', eq: [data.map(p => p.serialNumber)] })
    // }
    // return {
    //   druid_datasource_id: props.dataSourceId,
    //   child_project_id: props.child_project_id,
    //   params: { ..._.pick(props, sliceParamsProperties), filters }
    // }
    return {
      druid_datasource_id: props.dataSourceId,
      child_project_id: props.child_project_id,
      params: _.pick(props, sliceParamsProperties)
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe(this.autoReloadSubscribeToken)
    PubSub.unsubscribe('analytic.select-multi-dimension-value')
    PubSub.unsubscribe('analytic.generate-inspect-source-data-url')
    PubSub.unsubscribe('analytic.get-chart-data')
    window.logSliceComponentInfo = undefined
  }

  //判断是否可以下钻，单维度并且是饼图才可以下钻
  isDrillDown = () => {
    let { dimensionLayer = [], dataSourceDimensions } = this.props
    let { tempSlice } = this.state
    let dimensions = _.get(tempSlice, 'params.dimensions', [])
    let vizType = _.get(tempSlice, 'params.vizType', '')
    if (dimensions.length !== 1 || vizType !== 'pie') return false
    let dim = (dataSourceDimensions && _.find(dataSourceDimensions, { name: dimensions[0] })) || {}
    let dimLayer = []
    dimensionLayer.map(d => {
      if (_.includes(d.dimension_id, dim.id)) {
        dimLayer = d.dimension_id
      }
    })
    if (_.isEmpty(dimLayer)) return false
    let index = _.indexOf(dimLayer, dim.id)
    if (index === dimLayer.length - 1) return false
    return _.find(dataSourceDimensions, { id: dimLayer[index + 1] }).name
  }

  //图例点击下钻功能
  legendselectchangedObject = {
    legendselectchanged: e => {
      let { dimensions, dataSourceDimensions, updateHashState, drillDownData, drillDownFn } = this.props
      let { tempSlice } = this.state
      let isDrillDown = this.isDrillDown()
      if (!isDrillDown) return
      let dbDim = _.find(dataSourceDimensions, { name: dimensions[0] })
      updateHashState(
        prevState => {
          drillDownFn([...drillDownData, prevState])
          let filters = _.cloneDeep(prevState.filters)
          let findFilterIndex = _.findIndex(prevState.filters, { col: dimensions[0] })
          const GranularityEnum = {
            PT1M: 'minute',
            PT1H: 'hour',
            P1D: 'day',
            P1W: 'week',
            P1M: 'month',
            P1Y: 'year'
          }
          let selectTime = _.get(tempSlice, `params.dimensionExtraSettingDict.${dimensions[0]}.granularity`, 'P1D')
          let changeName = isTimeDimension(dbDim) ? e.name.replace(/['年','月','日', '时', '周', '一', '二', '三','四', '五', '六']/g, '.') : ''
          let eq = isTimeDimension(dbDim) ? [moment(changeName).startOf(GranularityEnum[selectTime]), moment(changeName).endOf(GranularityEnum[selectTime])] : [e.name]
          if (findFilterIndex >= 0) {
            filters = filters.map((f, i) => {
              return i === findFilterIndex ? { ...f, eq, op: 'in', containsNull: false } : f
            })
          } else {
            filters.push({ col: dimensions[0], op: 'in', type: DruidColumnTypeInverted[dbDim.type], eq })
          }
          return {
            dimensions: [isDrillDown],
            filters
          }
        },
        false,
        () => {
          PubSub.publish('analytic.auto-load')
        }
      )
      // PubSub.publish('analytic.auto-load')
    }
  }

  render() {
    let { style, className, updateHashStateByPath, drillDownFn, drillDownData, updateHashState, linkage } = this.props
    let { tempSlice } = this.state
    if (!manualLoadData) {
      tempSlice = this.genSliceFromProps(this.props)
    } else if (!tempSlice) {
      return (
        <div style={style} className={className}>
          <div className='bg-white corner height-100 relative'>
            <div className='center-of-relative aligncenter '>
              <img className='itblock' src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`} alt='Error hint' />
              <div className='mg2t font13' style={{ color: '#595959' }}>
                请执行查询
              </div>
            </div>
          </div>
        </div>
      )
    }
    let isDrillDown = this.isDrillDown()

    let optionsOverwriter = option => {
      if (!isDrillDown) return option
      const bloc_arrows = `<svg t="1583487878163" class="icon" viewBox="0 0 1024 1024" version="1.1" 
      xmlns="http://www.w3.org/2000/svg" p-id="10269" width="200" height="200">
      <path d="M832 576L512 1024 192 576h192V0h256v576z" fill="#ffffff" p-id="10270"></path></svg>`
      let createSvgByColor = (svgSrc, fill) => {
        const finalSrc = svgSrc.replace(/fill="[^"]+"/, `fill="${fill}"`)
        return `image://data:image/svg+xml;base64,${btoa(finalSrc)}`
      }

      return immutateUpdate(option, 'legend.data', data => {
        if (_.isEmpty(data)) return data
        return data.map((item, i) => {
          let icon = createSvgByColor(bloc_arrows, option.color[i] || 'black')
          if (_.isPlainObject(item)) {
            return { ...item, icon }
          } else {
            return { name: item, icon }
          }
        })
      })
    }

    return (
      <div style={style} className={className + ' relative'}>
        {!_.isEmpty(drillDownData) ? (
          <Button
            style={{ position: 'absolute', left: '50px', top: '10px', zIndex: '100' }}
            onClick={() => {
              if (_.isEmpty(drillDownData)) return
              let data = drillDownData[drillDownData.length - 1]
              updateHashState(prevState => {
                return data
              })
              PubSub.publish('analytic.auto-load')
              drillDownFn(_.take(drillDownData, drillDownData.length - 1))
            }}
          >
            返回上层
          </Button>
        ) : null}
        <SliceChartFacade
          innerRef={ref => (this._sliceChartFacade = ref)}
          wrapperClassName='height-100 bg-white corner'
          wrapperStyle={wrapperStyleGen(tempSlice.params.vizType)}
          style={{ height: '100%' }}
          slice={tempSlice}
          isThumbnail={false}
          showLegend={!_.startsWith(tempSlice.params.vizType, 'multi_')}
          onSettingsChange={(newChartSettings, replaceHistory = false) => {
            updateHashStateByPath('chartExtraSettings', () => newChartSettings, replaceHistory)
            PubSub.publish('analytic.auto-load')
          }}
          linkage={linkage}
          vizTypeHintMap={vizTypeHintMap}
          componentVizTypeMap={analyticVizTypeChartComponentMap}
          onLoadingStateChange={isFetching => {
            PubSub.publish('analytic.isFetchingSliceData', isFetching)
          }}
          optionsOverwriter={optionsOverwriter}
          onEvents={this.legendselectchangedObject}
        />
      </div>
    )
  }
}
