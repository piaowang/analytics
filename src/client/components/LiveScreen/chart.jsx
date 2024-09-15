import React from 'react'
import PropTypes from 'prop-types'
import SliceChartFacade from '../Slice/slice-chart-facade'
import {vizTypeHintMap} from '../../constants/viz-component-map'
import Timer from '../Common/timer'
import echarts from 'echarts'
import {immutateUpdate, immutateUpdates, isEqualWithFunc} from '../../../common/sugo-utils'
import _ from 'lodash'
import * as d3 from 'd3'
import ApiChart from './api-chart'
// jsx 注释不能去掉
/** @jsx jsx */
import { jsx, css } from '@emotion/core'
import {connect} from 'react-redux'
import PubSub from 'pubsub-js'
import {ChartsRenderAdapter} from './chartsRenderAdapter'
import moment from 'moment'
import {AccessDataType} from '../../../common/constants'
import chartOverWrite from './chartOverwrite'
import {doChangeRuntimeState} from '../LiveScreen/actions/workbench'

const ADVANCE_MODE_UTILS = {
  copyOnUpdate: immutateUpdates,
  _,
  d3,
  moment,
  doChangeRuntimeState
}

const isMysqlProject = _.memoize((druid_datasource_id, projectList) => {
  let p = druid_datasource_id && _.find(projectList, p => p.datasource_id === druid_datasource_id)
  return p && p.access_type === AccessDataType.MySQL
}, (dsId, projectList) => `${dsId || ''}|${_.size(projectList)}`)

@connect(state => {
  return {
    runtimeState: _.get(state, 'livescreen_workbench.runtimeState', {}),
    projectList: _.get(state, 'livescreen_workbench.projectList', [])
  }
})
class Chart extends React.Component {

  static propTypes = {
    type: PropTypes.string     //图表类型
  }

  static defaultProps = {
    type: 'table'
  }

  constructor(props) {
    super(props)
    this.state = {
      optionWriterName: _.isEmpty(props.style_config) ? 0 : 1,
      reloadChart: false, //刷新假数据用途
      renderChartHint: true    // 是否在Chart上显示提示：第一次加载数据时显示，之后更新数据不显示
    }
    this._debugStyleOverWriterPubSubToken = PubSub.subscribe('liveScreenCharts.debugCurrentStyleOptionsOverWriter', this.debugCurrentStyleOptionsOverWriter)
    this._debugParamsOverWriterPubSubToken = PubSub.subscribe('liveScreenCharts.debugCurrentParamsOverWriter', this.debugCurrentParamsOverWriter)
  }
  
  componentDidCatch(error, errorInfo) {
    console.error(error)
  }
  
  debugCurrentStyleOptionsOverWriter = () => {
    let activedId = _.get(window.store.getState(), 'livescreen_workbench.activedId')
    if (activedId !== this.props.id) {
      return
    }
    try {
      let overwriter = eval( _.get(this.props.style_config, 'optionsOverWriter') )
  
      if (!overwriter || !_.isFunction(overwriter)) {
        console.log('No overwriter')
        return
      }
      const {runtimeState, style_config} = this.props
      const {total, druidData} = _.get(this._sliceChartFacade, 'props', {})
      const sliceData = druidData ? {...total, resultSet: druidData} : total
      const theme = runtimeState && runtimeState.theme
      
      console.log('Original: ', style_config, 'theme: ', theme, 'data: ', sliceData, 'utils: ', ADVANCE_MODE_UTILS)
      console.log('Final: ', overwriter(_.omit(style_config, 'optionsOverWriter'), theme, sliceData, ADVANCE_MODE_UTILS))
    } catch (e) {
      console.error(e)
    }
  }
  
  debugCurrentParamsOverWriter = () => {
    let activedId = _.get(window.store.getState(), 'livescreen_workbench.activedId')
    if (activedId !== this.props.id) {
      return
    }
    try {
      let {params, runtimeState} = this.props
      let overwriter = eval( _.get(params, 'paramsOverWriter') )
  
      if (!overwriter || !_.isFunction(overwriter)) {
        console.log('No overwriter')
        return
      }
      
      console.log('Original: ', params, 'runtimeState: ', runtimeState, 'utils: ', ADVANCE_MODE_UTILS)
      console.log('Final: ', overwriter(_.omit(params, 'paramsOverWriter'), runtimeState, ADVANCE_MODE_UTILS))
    } catch (e) {
      console.error(e)
    }
  }
  
  componentWillUnmount() {
    PubSub.unsubscribe(this._debugStyleOverWriterPubSubToken)
    PubSub.unsubscribe(this._debugParamsOverWriterPubSubToken)
  }
  
  componentWillReceiveProps(nextProps) {
    if (this.props.style_config !== nextProps.style_config) {
      this.setState({
        optionWriterName: ++this.state.optionWriterName
      })
    }
  }
  
  shouldComponentUpdate(nextProps, nextState) {
    return !isEqualWithFunc(this.props.params, nextProps.params)
      || !isEqualWithFunc(this.props.runtimeState, nextProps.runtimeState)
      || !isEqualWithFunc(this.props.style_config, nextProps.style_config)
      || !isEqualWithFunc(this.state, nextState)
  }

  renderTimer(params) {
    return (
      params.autoReloadInterval > 0
        ? (
          <Timer
            interval={params.autoReloadInterval * 1000}
            onTick={() => {
              this.setState({
                reloadChart: !this.state.reloadChart
              })
            }}
          />
        )
        : null
    )
  }
  
  applyStyleOptionsOverWriter = (style_config) => {
    if (style_config && style_config.optionsOverWriter) {
      try {
        let fn = eval(style_config.optionsOverWriter)
        if (_.isFunction(fn)) {
          const {total, druidData} = _.get(this._sliceChartFacade, 'props', {})
          const sliceData = druidData ? {...total, resultSet: druidData} : total
          const theme = _.get(this.props.runtimeState, 'theme')
          return fn(_.omit(style_config, 'optionsOverWriter'), theme, sliceData, ADVANCE_MODE_UTILS) || style_config
        }
      } catch (e) {
        // debug(e.message)
      }
    }
    return style_config
  }
  
  applyParamsOverWriter = params => {
    let result = params
    if (!params) return reuslt
    try {
      if (params.paramsOverWriter) {
        let fn = eval(params.paramsOverWriter)
        if (_.isFunction(fn)) {
          result = fn(params, this.props.runtimeState, ADVANCE_MODE_UTILS) || result
        }
      }

      if (params.paramsOverWriterPreSetList) {
        params.paramsOverWriterPreSetList.map( i => {
          let fn = _.get(window.sugo, `liveScreenDiYConstCode${i}`)
          fn = eval(fn)
          if (_.isFunction(fn)) {
            result = fn(_.omit(result, 'paramsOverWriter'), this.props.runtimeState, ADVANCE_MODE_UTILS) || result
          }
        })
      }
    } catch (e) {
      // debug(e.message)
    }

    return result
  }

  applyInteractionCode = (params, runtimeState = this.props.runtimeState) => {
    let result = params
    if (!params) return params
    try {
      if (params.interactionCode) {
        let fn = eval(params.interactionCode)
        if (_.isFunction(fn)) {
          result = fn(params, runtimeState, ADVANCE_MODE_UTILS) || result
        }
      }
      if (params.interactionPreSetList) {
        params.interactionPreSetList.map( i => {
          let fn = _.get(window.sugo, `liveScreenDiYConstCode${i}`)
          fn = eval(fn)
          if (_.isFunction(fn)) {
            result = fn(_.omit(params, 'interactionCode'), runtimeState, ADVANCE_MODE_UTILS) || result
          }
        })
      }
    } catch (e) {
      // debug(e.message)
    }

    return result
  }
  
  render() {
    const { type, doChangeComponentDataConfig, id, projectList, modalStyle, ...propsRest } = this.props
    const componentStyle = {
      ...propsRest
    }
    const style_config = this.applyStyleOptionsOverWriter(this.props.style_config || {})
    const params = this.applyParamsOverWriter(this.props.params || {})
    const { druid_datasource_id = 'temp' } = params
    // 图表组件的扩展参数根据实际情况传递
    const { _extra, css, cssWarn } = style_config
    
    const { optionWriterName, renderChartHint } = this.state
    // 处理气泡图的扩展参数
    if (params._extra && params._extra.bubbleZAxis) {
      if (params.metrics.length === 2) {
        params.metrics.push(params._extra.bubbleZAxis)
      }
      if (params.metrics[2] !== params._extra.bubbleZAxis) {
        params.metrics[2] = params._extra.bubbleZAxis
      }
    }
    const { accessData = '', dimensions = [], metrics = [], accessDataType, translationDict = {} } = params
    let defaultData = null
    const isDemoData = _.get(params, 'accessDataType', '') === 'json' || _.get(params, 'accessDataType', '') === 'csv'
    if (accessData && (isDemoData)) {
      defaultData = accessDataType === 'csv'
        ? d3.csvParse(accessData)
        : JSON.parse(accessData)
      if (dimensions.length >= 2 && type !== 'migration_map') {
        defaultData = _.groupBy(defaultData, p => _.get(p, dimensions[0]))
        defaultData = _.keys(defaultData).map(p => {
          let data = { [dimensions[0]]: p }
          const group2 = _.groupBy(defaultData[p], p => _.get(p, dimensions[1]))
          _.keys(group2).map((d, i) => {
            _.forEach(metrics, m => _.set(data, `${dimensions[1]}_Group.${i}.${m}`, _.sumBy(group2[d], v => _.toNumber(v[m]))))
            _.set(data, `${dimensions[1]}_Group.${i}.${dimensions[1]}`, d)
          })
          return data
        })
      }
    }
    
    let optionsOverwriter
    if (optionWriterName > 0) {
      optionsOverwriter = (option) => {
        if (type === 'table' || type === 'table_flat' || type === 'table_transfer') {
          return option
        }
        let seriesStyle = _.omit(style_config, '_extra')
        if (type !== 'gauge' && type !== 'beauty_gauge' && type !== 'gauge_1' && option.series && option.series.length > 1 && style_config.series) {
          seriesStyle.series = option.series.map((p, i) => {

            return _.merge({}, _.get(seriesStyle.series, i, {}), _.omit(seriesStyle.series[0], ['itemStyle.normal.color', 'type']))
          })
        }
        let rop = _.merge({}, option, seriesStyle)
        
        if (style_config.color && style_config.color.length > 0) {
          option.color = style_config.color
        }
        if (type === 'pie') {
          let series0_show = _.get(style_config, 'series[0].label.normal.show', true)
          let series1_normal = _.get(style_config, 'series[1].label.normal') || {}
          // 饼图的 series data 的设置覆盖了全局设置，所以这里需要移除 series data 里面的设置
          rop = immutateUpdates(rop, 'series[0].data', arr => {
            return arr && arr.map(d => {
              d.label.normal.show = series0_show
              d.labelLine.normal.show = series0_show
              if (!series0_show) {
                d.labelLine.normal.length = 0
                d.labelLine.normal.length2 = 0
                d.label.normal.formatter = () => ''
              }
              return d
            })
          },
          'series[1].data', arr => {
            return arr && arr.map(d => {
              if(series1_normal){
                d.label.normal.position = series1_normal.position
              }
              let percentShow = seriesStyle && seriesStyle.percent
              let dataShow = seriesStyle && seriesStyle.isData
              d.label.normal.show = percentShow || dataShow
              d.labelLine.normal.show = percentShow || dataShow
              d.labelLine.normal.length = percentShow || dataShow 
                ? _.get(style_config, 'series[1].labelLine.normal.length', 52) 
                : 0
              d.labelLine.normal.length2 = percentShow || dataShow 
                ? _.get(style_config, 'series[1].labelLine.normal.length2', 52)
                : 0            
              d.label.normal.formatter = params => {
                let str1 = percentShow ? `${params.percent}%\n` : ''
                let str2 = dataShow ? `${params.value}` : ''
                return str1 + str2
              }
              return d
            })
          },
          'tooltip', (obj) => {
            obj.formatter = params => {
              let percentShow = seriesStyle && seriesStyle.percent
              let dataShow = seriesStyle && seriesStyle.isData
              let str1 = percentShow ? `${params.percent}%` : ''
              let str2 = dataShow ? `${params.value}` : ''
              return `${params.name}${str1 || str2 ? ':' : ''}${str2}
              ${str1 && str2 ? '(' : ''}${str1}${str1 && str2 ? ')' : ''}`
            }
            return obj
          }
          )
        }
        if (_.get(rop, 'title.show', false)) {
          let total = 0
          _.forEach(_.get(option, 'series[0].data', []), p => {
            total += _.toNumber(_.get(p, 'value', 0))
          })
          rop.title.subtext = total
        }
        if (seriesStyle.indicatorsChange) {
          rop = immutateUpdates(
            rop,
            'legend.data',
            (arr) => {
              if (_.isArray(arr)) {
                return arr.map(item => {
                  if(_.isPlainObject(item)){
                    return {...item, name: seriesStyle.indicatorsChange[item.name] || item.name}
                  }
                  return seriesStyle.indicatorsChange[item] || item
                })
              }
              return arr
            },
            'series',
            (arr) => {
              if (_.isArray(arr)) {
                return arr.map(item => {
                  return {
                    ...item,
                    name: seriesStyle.indicatorsChange[item.name] || item.name,
                    data: _.isArray(item.data) ? item.data.map(data => {
                      if(_.isPlainObject(data)){
                        return {...data, name: seriesStyle.indicatorsChange[data.name] || data.name}
                      }
                      return data
                    }) : item.data
                  }
                })
              }
              return arr
            }
          )
        }
        // 修改每个单图样式
        if (chartOverWrite[type]) {
          let fn = chartOverWrite[type]
          rop = fn(rop, seriesStyle)
        }

        if (seriesStyle.seriesDecorate) {
          try {
            const seriesDecorate = eval(seriesStyle.seriesDecorate)
            if (_.isFunction(seriesDecorate)) rop = seriesStyle.seriesDecorate(rop)
          } catch (e) {
            console.log(e, 'seriesDecorate Error===')
          }
        }
        return rop
      }
      optionsOverwriter.toString = () => `livescreen_chart_optionsOverwriter_${optionWriterName}`
    }
    // console.log(style_config, 'style_config===')
    const tempSlice = isDemoData
      ? {
        params: {
          dimensions: dimensions.filter(_.identity),
          metrics: metrics,
          filters: [],
          customMetrics: _.get(params, 'customMetrics') || metrics.map(p => ({ name: p })),
          dimensionExtraSettingDict: {},
          tempMetricDict: {},
          autoReloadInterval: 0,
          vizType: type || 'table',
          chartExtraSettings: style_config,
          timezone: 'Asia/Shanghai',
          ..._.omit(params, ['druid_datasource_id', '_extra', 'autoReloadInterval'])
        }
      }
      : {
        druid_datasource_id,
        params: {
          filters: [],
          metrics: [],
          customMetrics: _.get(params, 'customMetrics') || [],
          vizType: type || 'table',
          dimensions: [],
          dimensionExtraSettingDict: {},
          tempMetricDict: {},
          autoReloadInterval: 0,
          chartExtraSettings: style_config,
          timezone: 'Asia/Shanghai',
          ..._.omit(params, ['druid_datasource_id', '_extra'])
        }
      }

    let chartParams = {
      innerRef: ref => this._sliceChartFacade = ref,
      wrapperClassName: 'height-100',
      enableAutoReload: tempSlice?.params?.autoReloadInterval > 0,
      style: { height: '100%', overflow: 'inherit' },
      slice: tempSlice,
      queryInQueue: !isMysqlProject(tempSlice?.druid_datasource_id, projectList),
      isThumbnail: true,
      accessData: isDemoData ? accessData : [],
      renderHint: renderChartHint,
      pagination: false,
      publicAccess: true,
      translationDict: translationDict,
      onDruidData: (data) => {
        // 一次更新之后不再显示loading数据提示
        if (renderChartHint) {
          this.setState({ renderChartHint: false })
        }
        if (_.get(this.props.style_config, 'optionsOverWriter')) {
          // 需要重新调用样式修改器
          this.forceUpdate()
        }
        let resultSet = _.get(data, '0.resultSet', [])
        if (!doChangeComponentDataConfig || !resultSet.length) {
          return
        }
        let keys = _.keys(resultSet[0])
        let groupArray = _.find(keys, k => _.includes(k, '_GROUP'))
        let dimensions = keys.filter(k => !_.includes(k, '_total') && !_.includes(k, '_GROUP'))
        let metrics = [_.find(keys, k => _.includes(k, '_total'))]
        if (groupArray) {
          keys = _.keys(_.get(resultSet, ['0', groupArray, '0']))
          metrics = [_.find(keys, k => _.includes(k, '_total'))]
          resultSet = _.reduce(resultSet, (r, v, k) => {
            let groupArrayData = _.get(v, [groupArray], [])
            const val = (_.isArray(groupArrayData) ? groupArrayData : [groupArrayData]).map(p => {
              return {
                ..._.mapValues(_.pick(v, dimensions), v => _.isString(v) ? _.truncate(v, {length: 8}) : v),
                ..._.mapValues(_.pickBy(p, k => !_.includes(k, '_total')), v => _.isString(v) ? _.truncate(v, {length: 8}) : v)
              }
            })
            return r.concat(val)
          }, [])
          dimensions.push(_.find(keys, k => !_.includes(k, '_total')))
        }
        
        doChangeComponentDataConfig({
          id,
          metrics,
          dataPath: '',
          accessData: JSON.stringify(resultSet, null, 2),
          dimensions,
          accessDataType: 'json',
          // translationDict: {
          //   "x1": "x1",
          //   "y1": "y1"
          // },
          autoReloadInterval: 0
        })
      },
      showLegend: !_.startsWith(tempSlice?.params?.vizType, 'multi_'),
      onSettingsChange: (newChartSettings, replaceHistory = false) => {
      },
      vizTypeHintMap: vizTypeHintMap,
      optionsOverwriter: optionsOverwriter,
      cancelListener: type === 'gauge' || type === 'beauty_gauge' || type === 'liquidFill' ? true : null,
      ..._extra
    }
    let compCss = css || {}
    let compCssWarn = cssWarn || {}
    if (type === 'table' || type === 'table_flat' || type === 'table_transfer') {
      const { borderLeftWidth, borderTopWidth, borderStyle, borderColor } = style_config?.border
      const boderLeftCss = `${borderLeftWidth}px ${borderStyle} ${borderColor}`
      const boderTopCss = `${borderTopWidth}px ${borderStyle} ${borderColor}`
      //顶部有个css的引用 这个对象最终由emotion实现 子组件带个className来控制样式范围
      compCss = {
        '.ant-table-bordered .ant-table-thead > tr > th': {
          ..._.mapValues(style_config?.head, p => p + ' !important'),
          fontSize: style_config?.head?.fontSize ,
          display: style_config?.head?.show ? undefined : 'none'
        },
        '.ant-table-bordered .ant-table-tbody > tr > td': {
          ..._.mapValues(style_config?.content, p => p + ' !important'),
          fontSize: style_config?.content?.fontSize
        },
        '.ant-table': {
          margin: '40px 10px 10px 10px'
        },
        '.ant-table-bordered .ant-table-thead > tr > th, .ant-table-bordered .ant-table-tbody > tr > td': {
          borderRight: boderLeftCss,
          borderBottom: boderTopCss
        },
        '.ant-table-small': {
          borderRight: boderLeftCss,
          borderBottom: boderTopCss,
          borderTop: boderTopCss,
          borderLeft: boderLeftCss
        },
        '.ant-table-small.ant-table-bordered .ant-table-content': {
          borderRight: '0'
        },
        '.ant-table-small > .ant-table-content > .ant-table-scroll > .ant-table-header > table > .ant-table-thead > tr > th': {
          borderBottom: boderTopCss,
          borderRight: boderLeftCss
        },
        '.ant-table table': {
          animation: style_config?.scrolling ? '15s scrolling infinite linear backwards' : false
        },
        '.ant-table-row-expand-icon': {
          display:  _.get(style_config, 'expand_icon.show', false) ? undefined : 'none',
          color:  _.get(style_config, 'expand_icon.color', '#000'),
          backgroundColor:  _.get(style_config, 'expand_icon.backgroundColor', '#fff'),
          width: style_config?.content?.fontSize + 'px',
          height: style_config?.content?.fontSize + 'px',
          lineHeight: style_config?.content?.fontSize + 'px',
          fontSize: style_config?.content?.fontSize + 'px'
        },
        '.ant-transfer-list-header': _.get(style_config, 'transferTitle', {
          height: 0,
          padding: 0,
          border: 0
        }),
        ...compCss,
        ...compCssWarn
      }
      if (type === 'table_transfer') {
        compCss = {
          ...compCss,
          '#table-transfer .ant-table-fixed': {
            backgroundColor: _.get(style_config, 'transferListStyle.backgroundColor')
          },
          //分页器样式 包括 背景颜色 每项字体颜色 活动项字体颜色 边框默认和背景颜色同色 没项宽(只当正方形)
          '#table-transfer .ant-pagination': {
            backgroundColor: _.get(style_config,'transferListStyle.paginationBackgroundColor', '#fff') + ' !important'
          },
          '#table-transfer .ant-pagination > .ant-pagination-item-active': {
            backgroundColor: _.get(style_config,'transferListStyle.paginationActiveBackgroundColor', '#fff'),
            borderColor: _.get(style_config,'transferListStyle.paginationBackgroundColor', '#fff')
          },
          '#table-transfer .ant-pagination > .ant-pagination-item-active > a': {
            color:  _.get(style_config,'transferListStyle.paginationActiveColor', 'red')
          },
          '#table-transfer .ant-pagination > li > a': {
            color: _.get(style_config,'transferListStyle.paginationColor', '#000'),
            borderColor: _.get(style_config,'transferListStyle.paginationBackgroundColor', '#fff')
          },
          '#table-transfer .ant-pagination > li': {
            width: _.get(style_config,'transferListStyle.paginationItemWidth', '24px'),
            height: _.get(style_config,'transferListStyle.paginationItemHeight', '24px'),
            lineHeight: _.get(style_config,'transferListStyle.paginationItemHeight', '24px'),
            fontSize: _.get(style_config,'transferListStyle.paginationFontSize', '12px')
          }
        }
      }
    }
    if (isDemoData) {
      chartParams.druidData = defaultData
    }
    
    //ChartsRenderAdapter 都是些不要数据的组件
    let ChartComp = ChartsRenderAdapter[type]
    if (ChartComp) {
      return (
        <ChartComp css={compCss} 
          params={params} 
          styleConfig={style_config} 
          applyInteractionCode={this.applyInteractionCode}
        />
      )
    }

    const others = {
      //兼容旧结构 这个要解构
      socketCacheParams: params.socketCacheParams,
      ...params.requestProtocolParams //mode serviceName 扁平化传入
    }
    return accessDataType === 'api'
      ? (
        <ApiChart
          css={compCss}
          {...chartParams}
          styleConfig={style_config}
          paramsData={params}
          applyInteractionCode={this.applyInteractionCode}
        />
      )
      : (
        <SliceChartFacade
          paramsData={params}
          applyInteractionCode={this.applyInteractionCode}
          {...chartParams}
          key={_.get(style_config, '_reactKey', 0) + _.get(this.props,'params.druid_datasource_id', '')}
          css={compCss}
          styleConfig={style_config}
          componentStyle={componentStyle}
          modalStyle={modalStyle}
          {...others}
        />
      )
  }
}

export default Chart
