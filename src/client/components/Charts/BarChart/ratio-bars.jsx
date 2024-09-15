import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import {genOptionHas2DimensionsAndSingleMeasures, legendColorMemoize} from '../../../common/echarts-option-generator'
import _ from 'lodash'
import Alert from '../../Common/alert'
import * as PubSub from 'pubsub-js'
import {isEqualWithFunc, immutateUpdate} from '../../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {genShowTooltipEventListenerForMultiDim} from './show-tooltip-when-hover-axis-label'

export default class RatioBar extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    isThumbnail: PropTypes.bool,
    showLegend: PropTypes.bool,
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
    let {data, dimensions, metrics, translationDict, metricsFormatDict, isThumbnail, showLegend,
      dimensionColumnFormatterGen, dimensionExtraSettingDict, theme='light', ...rest} = this.props

    if (dimensions.length !== 2) {
      return <Alert msg={'请设置两个维度；第一维度为堆叠维度，第二个维度作为 X 轴'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    try {
      // Y 轴 格式化成百分比
      let metricsFormatDict2 = {...metricsFormatDict, [metrics[0]]: '.0%'}

      let option = this.genOption({data, dimensions, yAxisName: metrics[0], chartType: 'bar',
        metricsFormatDict: metricsFormatDict2, dimensionColumnFormatterGen, dimensionExtraSettingDict,theme})

      this.notifyColorChange(option)

      option.series = option.series.map(s => ({...s, stack: '总量' }))

      let showingLegend = showLegend && option.legend.data.length <= (isThumbnail ? 4 : 16)
      option = _.defaultsDeep({
        legend: {
          show: showingLegend
        },
        grid: {
          top: showingLegend ? '55px' : '10px'
        },
        tooltip: {
          axisPointer: {
            type: 'shadow'
          }
        },
        xAxis: { triggerEvent: true }
      }, option)

      // 将 series data 转换成比例值
      option = immutateUpdate(option, 'series', sArr => {
        let colSumArr = sArr.reduce((sumArr, currS) => {
          return currS.data.map((val, idx) => (sumArr[idx] || 0) + (val || 0))
        }, [])
        return sArr.map(s => {
          return {...s, data: s.data.map((v, vIdx) => v === 0 ? 0 : v / colSumArr[vIdx])}
        })
      })
      option = immutateUpdate(option, 'yAxis', prevYAxis => {
        return {
          ...prevYAxis,
          min: 0,
          max: 1
        }
      })


      return (
        <ReactEcharts
          theme={this.props.theme}
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

