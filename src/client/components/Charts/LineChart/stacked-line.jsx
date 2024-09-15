import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import {genOptionHas2DimensionsAndSingleMeasures, legendColorMemoize} from '../../../common/echarts-option-generator'
import Alert from '../../Common/alert'
import * as PubSub from 'pubsub-js'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {genShowTooltipEventListenerForMultiDim} from '../BarChart/show-tooltip-when-hover-axis-label'

export default class StackedLineChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    mainTimeColumn: PropTypes.string,
    translationDict: PropTypes.object,
    data: PropTypes.array,
    showLegend: PropTypes.bool,
    isThumbnail: PropTypes.bool,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func,
    dimensionExtraSettingDict: PropTypes.object,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    showLegend: true,
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  genOption = legendColorMemoize(genOptionHas2DimensionsAndSingleMeasures)

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  notifyColorChange(option) {
    let {color, legend: {data}} = option
    let colorDict = _.zip(data, color).reduce((prev, [legend, color]) => {
      prev[legend] = color
      return prev
    }, {})
    PubSub.publish('analytic.onLegendColorUpdate', colorDict)
  }
  
  onEchartsEvents = genShowTooltipEventListenerForMultiDim(this)

  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, showLegend, isThumbnail,
      dimensionColumnFormatterGen, dimensionExtraSettingDict,theme='light', ...rest} = this.props

    if (dimensions.length !== 2) {
      return <Alert msg={'请设置两个维度，第一维度为对比维度、第二个维度作为 X 轴'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    try {
      let option = this.genOption({data, dimensions, yAxisName: metrics[0], chartType: 'line',
        metricsFormatDict, dimensionColumnFormatterGen, dimensionExtraSettingDict,theme})

      this.notifyColorChange(option)

      option.legend.data = option.legend.data.map(d => ({icon: 'circle', name: d}))

      option.series = option.series.map(s => _.assign({}, s, {
        areaStyle: {normal: {}},
        stack: '总量',
        smooth: true
      }))

      //let showingLegend = showLegend && option.legend.data.length <= (isThumbnail ? 5 : 16)
      option = _.defaultsDeep({
        legend: {
          show: false
        },
        grid: {
          top: '10px'
        },
        xAxis: {
          boundaryGap: false,
          triggerEvent: true
        }
      }, option)

      return (
        <ReactEcharts
          {...rest}
          option={option}
          notMerge
          onEvents={rest.onEvents ? {...rest.onEvents, ...this.onEchartsEvents} : this.onEchartsEvents}
        />
      )
    } catch (e) {
      return <Alert msg={e.message} {...rest} />
    }
  }
}
