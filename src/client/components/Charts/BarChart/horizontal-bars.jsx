import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../../common/echarts-option-generator'
import _ from 'lodash'
import Alert from '../../Common/alert'
import {isEqualWithFunc, immutateUpdate} from '../../../../common/sugo-utils'
import metricFormatterFactory  from '../../../common/metric-formatter-factory'
import measureTextWidth from '../../../common/measure-text-width'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {smartIntervalForLeanDateLabel} from '../../Slice/slice-chart-setheight'
import moment from 'moment'
import {genShowTooltipEventListener} from './show-tooltip-when-hover-axis-label'

let truncator = _.partialRight(_.truncate, {length: 10})

export default class HorizontalBarChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    isThumbnail: PropTypes.bool,
    showLegend: PropTypes.bool,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  calcExtraMarginRight(option, metrics, metricsFormatDict) {
    // 解决缩略图右边数字不能完全显示
    let extraMarginRight = _.max(option.series.map((s, si) => {
      let metric = metrics[si]
      let metricFormat = metricsFormatDict[metric]
      let metricFormatter = metricFormatterFactory(metricFormat)
      let maxValInThisSeries = _.max(s.data) || 0
      let labelStrLength = metricFormatter(maxValInThisSeries)
      return measureTextWidth(labelStrLength + '0') * 1.1 / 2
    }))
    return Math.round(extraMarginRight)
  }
  
  onEchartsEvents = genShowTooltipEventListener(this)

  render() {
    let {data, dimensions, metrics, translationDict, isThumbnail, metricsFormatDict,
      dimensionColumnFormatterGen, showLegend,theme='light', ...rest} = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let option = genOptionHas1DimensionsAndMultiMeasures({
      data,
      xAxisName: dimensions[0],
      yAxisNames: metrics,
      chartType: 'bar',
      translationDict,
      metricsFormatDict,
      dimensionColumnFormatterGen,
      showLegend,
      theme
    })

    option = _.defaultsDeep({
      grid: {
        right: 5 + this.calcExtraMarginRight(option, metrics, metricsFormatDict)
      },
      tooltip: {
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: { triggerEvent: true }
    }, option)

    let xAxis = option.xAxis
    option.xAxis = option.yAxis
    option.yAxis = xAxis

    option.yAxis.inverse = true
    if (isThumbnail) {
      option.xAxis.splitNumber = 1

      // 缩略图下，截取字符
      option = immutateUpdate(option, 'yAxis.axisLabel.formatter', prevFormatter => {
        return prevFormatter ? _.flow(prevFormatter, truncator) : truncator
      })
    }

    // 计算 grid.left，截取字符的操作在 slice-chart-setheight
    // 时间列偶尔需要设置 grid.left，其他列用 auto 即可，echarts 的 bug ？
    /*    if (moment(_.get(option, 'yAxis.data[0]') || '').isValid()) {
      rest.optionsOverwriter = _.flow([rest.optionsOverwriter, options => {
        let formatter = _.get(options, 'yAxis.axisLabel.formatter') || _.identity
        let data = options.yAxis.data.map(formatter)
        let maxText = _.maxBy(data, measureTextWidth)
        let maxTextWidth = measureTextWidth(maxText)
        return immutateUpdate(options, 'grid.left', () => {
          return maxTextWidth // * 1.1 为临时解决方案，兼容 windows，最好还是找到原因
        })
      }].filter(_.identity))
    }*/

    return (
      <ReactEcharts
        {...rest}
        option={option}
        notMerge
        onEvents={rest.onEvents ? {...rest.onEvents, ...this.onEchartsEvents} : this.onEchartsEvents}
      />
    )
  }

}

