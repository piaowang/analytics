import React from 'react'
import PropTypes from 'prop-types'
import {
  checkVizTypeEnable,
  vizTypeChartComponentMap,
  vizTypeHintMapForUserAction
} from '../../constants/viz-component-map'
import Alert from '../Common/alert'
import _ from 'lodash'
import classNames from 'classnames'
import {withDruidDataDec} from '../Fetcher/druid-data-fetcher'
import {DBDIM_NS, dbDimSagaModelGen} from '../Fetcher/data-source-dimensions-fetcher'
import {DBMETRICS_NS, dbMetricSagaModelGen} from '../Fetcher/data-source-measures-fetcher'
import {dictBy, exportFile, compressUrlQuery, immutateUpdates} from '../../../common/sugo-utils'
import {message, Spin, Tooltip} from 'antd'
import Timer from '../Common/timer'
import {includeCookie, noCache, recvJSON} from '../../common/fetch-utils'
import {dbMetricAdapter} from '../../../common/temp-metric'
import {dateFormatterGenerator, leanDateFormatterGenerator} from '../../common/date-format-util'
import {isCharDimension, isNumberDimension, isTimeDimension, DruidColumnTypeInverted} from '../../../common/druid-column-type'
import {withDimAndMetricsChecker} from './dim-and-metric-permission-checker.jsx'
import {rotateAxisText, smartIntervalForLeanDateLabel, truncateDisplayText} from './slice-chart-setheight'
import * as LocalMetric from '../../../common/local-metric'
import metricFormatterFactory from '../../common/metric-formatter-factory'
import * as d3 from 'd3'
import moment from 'moment'
import PubSub from 'pubsub-js'
import {flattenData} from '../Charts/TableChart/flatten-druid-data'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {connect} from 'react-redux'
import {EMPTY_STRING, NULL_VALUE, RESPONSIVE_PAGE_MAX_WIDTH, RowKeyName} from '../../../common/constants'
import {NoMetricBecomeQuerySourceData} from '../../../common/druid-query-utils'
import {browserHistory} from 'react-router'
import Fetch from '../../common/fetch-final'
import {doQuerySliceData, genTranslationDict} from '../../common/slice-data-transform'
import {generate} from 'shortid'
import { scaleBand } from 'd3'
import warnOption from '../../components/LiveScreen/chartOverwriteForWarning'
let noCacheParams = _.defaultsDeep({}, recvJSON, noCache, includeCookie)
import { jsx, css } from '@emotion/core'

// TODO 反向逻辑
const chartAlwaysMergeTotalSet = new Set(['table', 'number', 'number_lift', 'progress_bar', 'table_flat', 'radar', 'rich_text_list', 'rich_text_list_for_smart', 'chord', 'bullet', 'step_progress'])
const chartMergeTotalWhenNoData = new Set(['pie', 'tree_map', 'dist_bar', 'horizontal_bar', 'pictorial_bar',
  'line', 'multi_dim_bar', 'multi_dim_line', 'gauge', 'gauge_1', 'beauty_gauge', 'liquidFill',
  'wordCloud', 'input_number'])

const GranularityEnum = {
  PT1M: 'minute',
  PT1H: 'hour',
  P1D: 'day',
  P1W: 'week',
  P1M: 'month',
  P1Y: 'year'
}

let canNotUpdateSlice = () => {
  message.info('只能在单图明细页面修改此值', 5)
}

@withRuntimeSagaModel([props => {
  let dataSourceId = _.get(props, 'slice.druid_datasource_id') || ''
  
  return dbDimSagaModelGen({
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId,
    // 用户需要知道哪些维度/指标是没权限，哪些是已经删除了的；所以这里要先查出全部的维度/指标，再进行判断
    useOpenAPI: true,
    datasourceType: 'all',
    exportNameDict: true
  })
}, props => {
  let dataSourceId = _.get(props, 'slice.druid_datasource_id') || ''
  
  return dbMetricSagaModelGen({
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId,
    // 用户需要知道哪些维度/指标是没权限，哪些是已经删除了的；所以这里要先查出全部的维度/指标，再进行判断
    useOpenAPI: true,
    datasourceType: 'all',
    exportNameDict: true
  })
}])
@connect((state, ownProps) => {
  let dataSourceId = _.get(ownProps, 'slice.druid_datasource_id') || ''
  
  const dbDimsSagaState = state[`${DBDIM_NS}_${dataSourceId}`] || {}
  const dbMetricsSagaState = state[`${DBMETRICS_NS}_${dataSourceId}`] || {}
  return {
    ...dbDimsSagaState,
    ...dbMetricsSagaState
  }
})
@withDimAndMetricsChecker
@withDruidDataDec(props => {
  let {slice, dataSourceDimensions: dbDims = [], dataSourceMeasures: dbMetrics, publicAccess, onDruidData } = props
  //console.log('====', props)
  if (!slice || (!publicAccess && dbDims.length === 0 && dbMetrics.length === 0)) {
    return {
      dataSourceId: '',
      doFetch: false
    }
  }
  let params = slice.params
  let vizType = params.vizType || 'table'
  let noPresetData = _.isEmpty(props.druidData) && _.isEmpty(props.total)
  if (vizType === 'table_flat' || vizType === 'table_transfer') {
    params = NoMetricBecomeQuerySourceData(params)
  }
  return {
    dataSourceId: slice.druid_datasource_id,
    childProjectId: slice.child_project_id,
    datasourceName: slice.datasource_name,
    onFetchingStateChange: props.onLoadingStateChange,
    onError: () => {
      return props.onErrorHintChange && props.onErrorHintChange(null)
    },
    splitType: vizType === 'table_flat' || vizType === 'table_transfer' ? 'groupBy' : 'tree',
    ...params,
    onData: onDruidData,
    doFetch: !!(noPresetData && (slice.druid_datasource_id || slice.params.offline_calc_table_id) && checkVizTypeEnable(vizType, params)
      && (!_.isEmpty(params.metrics) || !_.isEmpty(params.select))),
    dbDimensions: dbDims,
    ..._.pick(props, ['useOpenAPI', 'sCache', 'cCache', 'queryInQueue', 'mode', 'serviceName', 'socketCacheParams'])
  }
})
export default class SliceChartFacade extends React.Component {

  static propTypes = {
    slice: PropTypes.object.isRequired,
    renderHint: PropTypes.bool
  }

  static defaultProps = {
    // 是否显示hint
    renderHint: true
  }

  state = {
    totalData: []
  }

  componentDidMount() {
    let {
      innerRef
    } = this.props
    if (innerRef) {
      innerRef(this)
    }
    this.subToken = PubSub.subscribe('dashBoardForm.slice-chart-facade-export', (msg, {sliceId, callBack}) => {
      const { slice } = this.props
      if (sliceId !== slice.id) {
        return
      }
      let jsonData = this.prepareFlatSliceData(slice)
      if (callBack) {
        callBack(_.size(jsonData) < 2 ? null : jsonData)
        return
      }
      if (_.size(jsonData) < 2) {
        message.warning('没有数据，无法导出')
        return
      }
      let content = d3.csvFormatRows(jsonData)
      exportFile(`看板_单图_时间${moment().format('YYYYMMDDHHmmss')}.csv`, content)
    })
  }

  componentWillReceiveProps(nextProps){
    let {
      slice, dataSourceMeasures, dataSourceDimensions, total, linkage, druidData
    } = nextProps
    this.getLinkageData(slice, dataSourceMeasures, dataSourceDimensions, total, linkage, druidData)
  }

  componentWillUnmount() {
    let {innerRef} = this.props
    if (innerRef) {
      innerRef(null)
    }
    let {onUnmount} = this.props
    if (onUnmount) {
      onUnmount()
    }
    PubSub.unsubscribe(this.subToken)
  }

  prepareFlatSliceData = slice => {
    let {dimensions = [], metrics = []} = _.get(slice, 'params') || {}
    let { translationDict, metricsFormatDict, data } = this.prepareTranslateAndFormatDict(slice)
  
    function groupToChildren(data) {
      const keyMapper = (val, key) => _.isArray(val) || _.endsWith(key, '_GROUP') ? 'children' : key
      const valMapper = val => _.isArray(val) ? groupToChildren(val) : val
      return data.map(d => {
        d = _.mapKeys(d, keyMapper)
        d = _.mapValues(d, valMapper)
        return d
      })
    }
    
    data = groupToChildren(data)
  
    const formatOpts = { showComplete: true }
    let dimFormatters = dimensions.map(dimName => this.dimensionColumnFormatterGenerator(dimName, formatOpts))
    let applyDimFormatters = dimIndex => (val, record) => {
      if (!record) {
        return val
      }
      if (record.isTotalRow) {
        return val || '(全局)'
      }
      let colFormatter = dimFormatters[dimIndex]
      return colFormatter ? colFormatter(val) : val
    }
    let withSpanTitleForDimColumn = val => {
      if (val === '') {
        return EMPTY_STRING
      }
      if (_.isNil(val)) {
        return NULL_VALUE
      }
      return val
    }
  
    const tableColumns = [...dimensions, ...metrics].map((k, i) => {
      let translated = translationDict[k] || k
      return {
        title: translated,
        dataIndex: k,
        render: i < dimensions.length
          ? _.flow([applyDimFormatters(i), withSpanTitleForDimColumn])
          : _.identity
      }
    })
  
    data = flattenData(data, dimensions)
  
    let sortedKeys = tableColumns.map(tCol => tCol.title)
    let sortedRows = data.map(d => tableColumns.map(tCol => {
      let render = tCol.render
      let val = d[tCol.dataIndex]
      return render ? render(val, d) : val
    }))
  
    return [sortedKeys, ...sortedRows]
  }

  prepareTranslateAndFormatDict = (slice) => {
    let {
      druidData: data,
      dataSourceMeasures: dbMetrics = [],
      dataSourceDimensions: dbDims = [],
      total
    } = this.props
    let params = slice.params
    let tempMetrics = dbMetricAdapter(params.tempMetricDict)
    let localMetrics = _.keys(params.localMetricDict)
      .map(m => LocalMetric.dbMetricAdapter(m, params.localMetricDict[m], dbMetrics, params.tempMetricDict))

    let metricNameSet = new Set(params.metrics)
    let dbMetricsInUse = dbMetrics.filter(dbM => metricNameSet.has(dbM.name))
    let translationDict = genTranslationDict(slice, dbDims, dbMetrics)

    // 格式化输出格式为 "时长" 的数据，type=5
    dbMetricsInUse = dbMetricsInUse.map(dbM => (dbM.type === 5 ? {...dbM, pattern: 'duration-complete'} : dbM))
  
    let metricsFormatDict = dictBy(
      [...dbMetricsInUse, ...(params.customMetrics || []), ...tempMetrics, ...localMetrics].filter(m => m.pattern && m.pattern !== 'none'),
      m => m.name,
      m => m.pattern)

    // 加入总计数据
    if (total && _.keys(total).length) {
      let rowTitleKey = params.dimensions && params.dimensions.length && params.dimensions.join(', ') || null
      let totalWithTitle = rowTitleKey
        ? { ...total, [rowTitleKey]: '全局', isTotalRow: true }
        : total
      // 总是合并总计的图表
      if (totalWithTitle && chartAlwaysMergeTotalSet.has(params.vizType)) {
        data = [totalWithTitle].concat(data || [])
      }
      // 没有数据再合并总计的图表
      if (totalWithTitle && chartMergeTotalWhenNoData.has(params.vizType) && (!data || !data[0])) {
        data = [totalWithTitle]
      }
    }
    return {
      data,
      translationDict,
      metricsFormatDict
    }
  }


  dimensionColumnFormatterGenerator = (dimension, opts) => {
    let {slice, dimNameDict} = this.props
    if (dimension in dimNameDict) {
      let pattern = _.get(slice, `params.dimensionExtraSettingDict.${dimension}.pattern`)
      if (isTimeDimension(dimNameDict[dimension])) {
        if (pattern) {
          return dateFormatterGenerator(pattern)
        }
        let {showComplete} = opts || {}
        let granularity = _.get(slice, `params.dimensionExtraSettingDict.${dimension}.granularity`) || 'P1D'
        return leanDateFormatterGenerator(granularity, showComplete)
      }
      if (isNumberDimension(dimNameDict[dimension]) && pattern) {
        return d3.format(pattern)
      }
    }
    // null 意味着不进行格式化
    return null
  }

  onEchartsEvents = {
    ...(this.props.onEvents || {}),
    click: async(params, myChart)=> {
      let { slice, changeDashBoardState, dashBoardSlicesSettings={}, jumpConfiguration = {}, 
        onEvents, dashboards, dataSourceDimensions, activeKey} = this.props
      onEvents && onEvents.click ? onEvents.click(params, myChart) : null
      let dimensions = _.get(slice, 'params.dimensions', [])
      let granularityForSeriesName = _.get(slice, `params.dimensionExtraSettingDict.${dimensions[0]}.granularity`, 'P1D')
      let granularityForName = _.get(slice, `params.dimensionExtraSettingDict.${dimensions[dimensions.length-1]}.granularity`, 'P1D')
      
      let currentSettings = _.get(dashBoardSlicesSettings, `${activeKey}${slice.id}` || {})
      let newjumpConfiguration = dashBoardSlicesSettings &&  _.includes(Object.keys(dashBoardSlicesSettings), `${activeKey}${slice.id}`)
        ? currentSettings 
        : _.get(jumpConfiguration, `${slice.id}`) || []
      // 看板单图存在配置且维度小于2时可跳转
      if (!_.isEmpty(newjumpConfiguration) && dimensions.length <= 2 ) {
        let dashboardId = _.get(newjumpConfiguration[0], 'id', '')
        if ( dashboardId ) {
          let pathName = window.parent.location.pathname.match(/^\/share/)
          if (!_.find(dashboards, {id: dashboardId})) return message.warning('跳转看板被删除')
          changeDashBoardState({selectDashboard: dashboardId})
          let data = compressUrlQuery(JSON.stringify({jumpConfiguration: newjumpConfiguration, 
            name: params.name, granularityForName, seriesName: params.seriesName, granularityForSeriesName,
            projectId: slice.druid_datasource_id}))
          if (!_.isEmpty(pathName)) {
            //分享看板跳转
            let {result} = await Fetch.get('/app/sharing')
            let shareId = _.find(result, {content_id: dashboardId})  
            if (!shareId) return message.warning('无法跳转到没有发布的看板') 
            let eq = []
            let nextFilters = []
            newjumpConfiguration[0].carryParams.map((name, idx) => {
              let dbDim = _.find(dataSourceDimensions, {name})
              if (DruidColumnTypeInverted[dbDim.type] === 'date'){
                eq = dimensions[dimensions.length - 1] === name  
                  ? [moment(params.name).startOf(GranularityEnum[granularityForName]).format('YYYY-MM-DD HH:mm:ss'), 
                    moment(params.name).endOf(GranularityEnum[granularityForName]).format('YYYY-MM-DD HH:mm:ss')]
                  : [moment(params.seriesName).startOf(GranularityEnum[granularityForSeriesName]).format('YYYY-MM-DD HH:mm:ss'), 
                    moment(params.seriesName).endOf(GranularityEnum[granularityForSeriesName]).format('YYYY-MM-DD HH:mm:ss')]
              }else{
                eq = dimensions[dimensions.length - 1] === name  ? [params.name] : [params.seriesName]
              }
              nextFilters.push({
                col: dbDim.name,
                op: 'in',
                eq,
                type: DruidColumnTypeInverted[dbDim.type]
              })
            })  
            let filter = encodeURIComponent(JSON.stringify(nextFilters))
            window.parent.location.href = window.parent.location.origin + `/share/${shareId.id}?rawFilters=${filter}`
          } else {
            //看板跳转
            browserHistory.push(
              `/console/dashboards/${dashboardId}?value=${data}`
            )
          }
        }else{
          message.warning('没有选择看板')
        }
      }
    }
  }
  
  getLinkageData = async(slice, dataSourceMeasures, dataSourceDimensions, total, linkage, druidData) => {
    if (!slice) {
      return null
    }
    let totalData = []
    let dimensions = _.get(slice,'params.dimensions', '')
    let localMetricDict = _.get(slice,'params.localMetricDict', {})
    let tempMetricDict = _.get(slice,'params.tempMetricDict', {})
    let newLocalMetricDict = {}
    let metrics = []
    if (!_.isEmpty(dataSourceMeasures) && _.get(slice, 'params.linkage', linkage) && !_.isEmpty(total)) {
      totalData =_.keys(total).map(name => {
        //去掉环比同比的指标
        let localData = _.get(localMetricDict, `${name}`, '')
        if (localData) return ''
        let tempData = _.get(tempMetricDict, `${name}`, '')
        if (tempData) {
          return {
            title: tempData.title,
            allData: total[name],
            name
          }
        }else{
          return {
            title: _.find(dataSourceMeasures, {name}).title,
            allData: total[name],
            name
          }
        }
      })
      totalData = _.compact(totalData)
      let currentObject = _.maxBy(druidData, `${dimensions[0]}`)
      let currentMinObject = _.minBy(druidData, `${dimensions[0]}`)
      totalData = totalData.map(item => {
        let id = generate()
        let id1 = generate()
        let metric = `_localMetric_${item.name}_${id}`
        let metric1 = `_localMetric_${item.name}_${id1}`
        newLocalMetricDict[metric] = {
          fromMetrics: [item.name],
          funcName: '环比',
          format: '.1%',
          type: 'local'
        }
        newLocalMetricDict[metric1] = {
          fromMetrics: [item.name],
          funcName: '按年同比',
          format: '.1%',
          type: 'local'
        }
        metrics = _.concat(metrics, [item.name, metric, metric1])
        return {
          ...item, 
          currentData: currentObject[item.name], 
          currentTime: currentObject[dimensions[0]],
          fisrtTime: currentMinObject[dimensions[0]],
          sequential: metric,
          compared: metric1
        }
      })
      let res = await doQuerySliceData({
        ...slice,
        params: {
          ...slice.params,
          localMetricDict: newLocalMetricDict,
          metrics
        }
      })
      this.setState({
        totalData,
        resData: _.maxBy(res[0].resultSet, `${dimensions[0]}`),
        granularity: _.get(slice, `params.dimensionExtraSettingDict.${dimensions[0]}.granularity`, 'P1D')        
      })
    }
  }


  getPopoverData = (first, next) => {
    let {granularity } = this.state
    let currentTime = ''
    let allTime = ''
    let sequential = ''
    let compared = ''
    let format = 'YYYY-MM-DD HH:mm:ss'
    let particleSize = {
      'P1D': '日',
      'P1W': '周',
      'P1M': '月',
      'P1Y': '年'
    }
    switch (granularity) {
      case 'P1D':
      case 'P1M':
      case 'P1Y':
        format = granularity === 'P1D' ? 'YYYY-MM-DD' : granularity === 'P1M' ? 'YYYY-MM' : 'YYYY'
        currentTime = moment(next).format(format)
        allTime = [moment(first).format(format), moment(next).format(format)]
        sequential = [moment(next).format(format), moment(next).subtract(1, 'months').format(format)] 
        compared = [moment(next).format(format), moment(next).subtract(1, 'years').format(format)]
        break
      case 'P1W':
        currentTime = moment(next).subtract(1, 'weeks').format('YYYY-MM-DD') + '~' + moment(next).format('YYYY-MM-DD')
        allTime = [moment(first).subtract(1, 'weeks').format('YYYY-MM-DD') + '~' + moment(first).format('YYYY-MM-DD'), 
          moment(next).subtract(1, 'weeks').format('YYYY-MM-DD') + '~' + moment(next).format('YYYY-MM-DD') 
        ]
        sequential = [moment(next).subtract(1, 'weeks').format('YYYY-MM-DD') + '~' + moment(next).format('YYYY-MM-DD'),
          moment(next).subtract(1, 'months').subtract(1, 'weeks').format('YYYY-MM-DD') + '~' 
          + moment(next).subtract(1, 'months').format('YYYY-MM-DD')] 
        compared = [moment(next).subtract(1, 'weeks').format('YYYY-MM-DD') + '~' + moment(next).format('YYYY-MM-DD'),
          moment(next).subtract(1, 'years').subtract(1, 'weeks').format('YYYY-MM-DD') + '~' 
          + moment(next).subtract(1, 'years').format('YYYY-MM-DD')] 
        break
      default:
        currentTime = moment(next).format(format)
        allTime = [moment(first).format(format), moment(next).format(format)]
        sequential = [moment(next).format(format), moment(next).subtract(1, 'months').format(format)] 
        compared = [moment(next).format(format), moment(next).subtract(1, 'years').format(format)]
        break
    }
    return {
      currentTime,
      allTime,
      sequential,
      compared,
      unit: particleSize[granularity] || '日'
    }
  }

  renderLinkage = (slice) => {
    let {linkage} = this.props
    let { totalData, resData, granularity } = this.state
    if (!slice) {
      return null
    }

    return (
      <React.Fragment>
        {
          linkage || _.get(slice, 'params.linkage', false)
            ? totalData.map((t, idx) => {
              if (idx >= 2) return null
              let sequential = _.get(resData, `${t.sequential}`, '')
              sequential = _.isNumber(sequential) ? (sequential * 100).toFixed(1) + '%' : sequential
              let compared = _.get(resData, `${t.compared}`, '')
              compared = _.isNumber(compared) ? (compared * 100).toFixed(1) + '%' : compared
              let popoverData = this.getPopoverData(t.fisrtTime, t.currentTime)
              return (
                <div className="aligncenter mg1" key={idx} style={{transform: 'scale(0.9)', fontSize: '12px'}}>
                  <span className="bold">{t.title}：</span>
                  <Tooltip title={<div>时间粒度：{popoverData.unit}<br/>当期时间：{popoverData.currentTime}</div>}>
                    <span className="mg1">当期值：{(t.currentData).toFixed(2)}</span>
                  </Tooltip> 
                  <Tooltip title={<div>时间粒度：{popoverData.unit}<br/>累计时间：{popoverData.allTime[0]}~{popoverData.allTime[1]}</div>}>
                    <span className="mg1">累计值：{(t.allData).toFixed(2)}</span>
                  </Tooltip> 
                  <Tooltip title={<div>时间粒度：{popoverData.unit}<br/>当期时间：{popoverData.sequential[0]}
                    <br/>对比时间：{popoverData.sequential[1]}</div>}
                  >
                    <span className="mg1">环比值：{sequential}</span>
                  </Tooltip> 
                  <Tooltip title={<div>时间粒度：{popoverData.unit}<br/>当期时间：{popoverData.compared[0]}
                    <br/>对比时间：{popoverData.compared[1]}</div>}
                  >
                    <span className="mg1">同比值：{compared}</span>
                  </Tooltip> 
                </div>
              )
            })
            : null
        }
      </React.Fragment>
    )
  }

  render() {
    let {
      wrapperStyle, wrapperClassName, style, slice, enableAutoReload = false, className,
      isFetchingDruidData, fetchingDruidDataError: error, showLegend = true, rotateXAxis = true, isThumbnail = true,
      limit = 100, reloadDruidData, onSettingsChange, componentVizTypeMap = vizTypeChartComponentMap,
      vizTypeHintMap = vizTypeHintMapForUserAction, optionsOverwriter, renderHint, dimNameDict, cancelFetching,
      downLoadEchartsPicture, translationDict: translationDictPreset,dataSourceMeasures, changeDashBoardState, total, linkage,
      option, theme,...rest
    } = this.props


    if (!slice) {
      return null
    }
    let params = slice.params

    let vizType = params.vizType || 'table'
    let warnList = params.warnList || []

    let xAxisDim = vizType === 'heat_map' ? _.first(params.dimensions) : _.last(params.dimensions)
    let xAxisDbDim = xAxisDim && dimNameDict[xAxisDim]

    let yAxisDim = (vizType === 'balance_bar' || vizType === 'horizontal_bar' || vizType === 'heat_map')
      ? _.last(params.dimensions) : null
    let yAxisDbDim = yAxisDim && dimNameDict[yAxisDim]

    if (vizType === 'table_transfer') isThumbnail = false

    optionsOverwriter = _.flow([
      optionsOverwriter,
      xAxisDbDim && isCharDimension(xAxisDbDim) ? truncateDisplayText({vizType, isThumbnail}) : null,
      rotateXAxis && rotateAxisText({vizType, isThumbnail}),
      xAxisDbDim && isTimeDimension(xAxisDbDim) ? smartIntervalForLeanDateLabel(vizType, 'xAxis') : null,
      yAxisDbDim && isTimeDimension(yAxisDbDim) ? smartIntervalForLeanDateLabel(vizType, 'yAxis') : null
    ].filter(_.identity))

    let ChartComponent = componentVizTypeMap[vizType]
    if (!ChartComponent) {
      vizType = 'table'
      ChartComponent = componentVizTypeMap[vizType]
    }


    if (!error && !checkVizTypeEnable(vizType, params)) {
      error = vizTypeHintMap[vizType]
    }
    if (error && _.isObject(error)) {
      error = error.message || error.msg || JSON.stringify(error)
    }

    // 直接返回提示信息的话会导致 react 移除 echarts，导致经常它重新加载
    let hint = null

    if (isFetchingDruidData && renderHint) {
      // 加载中...
      // <a className="color-red mg1l pointer" onClick={cancelFetching}>停止加载</a>
      hint = (
        <div className="pd2 relative" style={style}>
          <Spin className="center-of-relative" />
        </div>
      )
    }

    if (error) {
      hint = <Alert msg={error}/>
    }

    if (!hint && isThumbnail && vizType === 'table') {
      wrapperClassName = `${wrapperClassName || ''} overscroll-y hide-scrollbar-y ${window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? '' : 'always-display-scrollbar-horizontal-all'} fix-table-head-issue`
    }

    const {
      data,
      translationDict,
      metricsFormatDict
    } = this.prepareTranslateAndFormatDict(slice)
    let isAutoReloadEnabled = enableAutoReload && params.autoReloadInterval
    let hideTemp = hint && (!isAutoReloadEnabled || !data.length)
    let chartClassNames = classNames(className, {
      'ignore-mouse': hideTemp,
      [`${downLoadEchartsPicture}`]: downLoadEchartsPicture
    })

    //大屏预警功能
    let newOption = {}
    let warnColor = ''
   
    if (!_.isEmpty(warnList) && !_.isEmpty(data)){
      if (vizType === 'number'){
        let metric =  warnList[0].indexTitle
        if (warnList[0].warnOp === '0' && data[0][metric] < warnList[0].warnValue) {
          warnColor = warnList[0].warnColor
        }else if (warnList[0].warnOp === '1' && data[0][metric] === warnList[0].warnValue) {
          warnColor = warnList[0].warnColor
        }else if (warnList[0].warnOp === '2' && data[0][metric] > warnList[0].warnValue) {
          warnColor = warnList[0].warnColor
        }else{
          warnColor= ''
        } 
        let settings = params.chartExtraSettings || {} 
        newOption = _.isEmpty(warnColor) ? settings : immutateUpdates(settings,
          '_extra.option.numberStyle.color', () => warnColor,
          '_extra.option.titleStyle.color', () => warnColor,
          '_extra.option.fixStyle.color', () => warnColor
        )
      }

      optionsOverwriter = _.flow([
        optionsOverwriter,
        warnOption[vizType] ? warnOption[vizType](warnList, vizType) : null
      ].filter(_.identity))
        
    }
    
    return (
      <div style={wrapperStyle} className={wrapperClassName}>
        {this.renderLinkage(slice)}
        {hint}
        {isAutoReloadEnabled ? (
          <Timer
            interval={params.autoReloadInterval * 1000}
            onTick={() => {
              // console.info('Auto reload: ' + new Date().toISOString())
              reloadDruidData(undefined, noCacheParams)
            }}
          />
        ) : null}
        <ChartComponent
          style={_.assign({}, style, hideTemp ? {opacity: 0} : null)}
          className={chartClassNames}
          metricsFormatDict={metricsFormatDict}
          dimensionColumnFormatterGen={this.dimensionColumnFormatterGenerator}
          data={data}
          limit={limit}
          changeDashBoardState={changeDashBoardState}
          dimensions={params.dimensions}
          metrics={params.metrics}
          settings={_.isEmpty(newOption) ? params.chartExtraSettings : newOption}
          onSettingsChange={onSettingsChange || canNotUpdateSlice}
          isThumbnail={isThumbnail}
          showLegend={showLegend}
          optionsOverwriter={optionsOverwriter}
          dimensionExtraSettingDict={params.dimensionExtraSettingDict}
          sliceId={slice.id}
          sliceName={slice.slice_name}
          translationDict={translationDictPreset ? {...translationDict, ...translationDictPreset} : translationDict}
          option={option}
          {...rest}
          onEvents={this.onEchartsEvents}
          slice={slice}
          theme={theme}
        />
      </div>
    )
  }
}
