import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import {
  defaultDimensionColumnFormatterGen,
  genOptionHas1DimensionsAndMultiMeasures
} from '../../../common/echarts-option-generator'
import _ from 'lodash'
import Alert from '../../Common/alert'
import {immutateUpdate, isEqualWithFunc} from '../../../../common/sugo-utils'
import {extent} from 'd3'
import {genShowTooltipEventListener} from '../BarChart/show-tooltip-when-hover-axis-label'
import {RESPONSIVE_PAGE_MAX_WIDTH} from '../../../../common/constants'
import measureTextWidth from '../../../common/measure-text-width'

/**
 * n			log10
 * 1000		3
 * 100		2
 * 10			1
 * 1			0
 * 0.1		-1
 * 0.01		-2
 * 0.001	-3
 *
 * 175		2.24	2
 * 980		2.99	2
 * -0.045	-1.34	-2
 * @param n
 * @returns {number}
 */
function getMagnitude(n) {
  let log10 = Math.log10(Math.abs(n))
  return _.floor(log10)
}

export default class BarAndLineChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props) || this.props.theme !== nextProps.theme
  }
  
  onEchartsEvents = genShowTooltipEventListener(this)

  render() {
    let {
      data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, showLegend,
      isThumbnail, theme='light',...rest
    } = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    // make multi yAxis
    let optionsPreMerge = metrics.map((m, idx) => {
      return genOptionHas1DimensionsAndMultiMeasures({
        data,
        xAxisName: dimensions[0],
        yAxisNames: [m],
        chartType: metrics.length - 1 === idx ? 'line' : 'bar',
        showLegend,
        translationDict, metricsFormatDict, dimensionColumnFormatterGen,
        timeFormat: null,
        theme
      })
    })

    let axisOffsetAcc = 0
    let option = {
      ...optionsPreMerge[0],
      legend: {
        ...optionsPreMerge[0].legend,
        data: metrics.map(n => translationDict[n] || n),
        show: showLegend,
        ...(window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? {
          textStyle: {...optionsPreMerge[0].legend.textStyle,fontSize: 8 },
          itemWidth: 21,
          itemHeight: 10
        } : {})
      },
      yAxis: optionsPreMerge.map((o, idx) => {
        let [min, max] = extent(o.series[0].data.filter(isFinite))
        max = Math.max(0, max) // start from 0
        min = Math.min(0, min) // start from 0
        if (max === min) {
          max = min + 1
        }
        let magMin = getMagnitude(min), magMax = getMagnitude(max)

        // 对 y 轴的最大最小值进行调整，使得 y 轴分隔 5 行

        // scale to proper value, e.g 175 -> 200, 10111 -> 12000
        // max < X < max + 1/4 * (max - min) * Math.sign(max)
        let targetMagMax = _.minBy(_.range(_.clamp(magMax + Math.sign(magMax), -10, 10)), mag => {
          let x = _.ceil(max, -mag)
          return Math.pow(x - max, 2) + Math.pow(max + Math.sign(max) * (max - min) / 4 - x, 2)
        })
        // scale to proper value, e.g 0.045 -> 0.1
        // min + Math.sign(min) * 1/4 * (max - min) < X < min
        let targetMagMin = _.minBy(_.range(_.clamp(magMin + Math.sign(magMin), -10, 10)), mag => {
          let x = _.floor(min, -mag)
          return Math.pow(min - x, 2) + Math.pow(x - (min + Math.sign(min) * (max - min) / 4), 2)
        })

        // precision === - magnitude
        let minFloor = _.floor(min, -targetMagMin), maxCeil = _.ceil(max, -targetMagMax)

        // 4 => 5
        if (1 < Math.abs(maxCeil) && Math.abs(maxCeil) % 5 !== 0) {
          maxCeil += Math.sign(maxCeil) * (5 - Math.abs(maxCeil) % 5)
        }
        if (1 < Math.abs(minFloor) && Math.abs(minFloor) % 5 !== 0) {
          minFloor += Math.sign(minFloor) * (5 - Math.abs(minFloor) % 5)
        }
        let currAxisOffsetAcc = axisOffsetAcc
        if (1 <= idx) {
          axisOffsetAcc += measureTextWidth(`${_.get(o.yAxis, 'axisLabel.formatter', _.identity)(maxCeil)}`) + 20
        }
        return {
          ...o.yAxis,
          min: minFloor,
          max: maxCeil,
          interval: (maxCeil - minFloor) / 5,
          offset: idx === 0 ? undefined : currAxisOffsetAcc,
          position: idx === 0 ? 'left' : 'right',
          show: true,
          axisLine: {
            lineStyle: {
              color: optionsPreMerge[0].color[idx]
            }
          }
        }
      }),
      series: optionsPreMerge.map((o, idx) => ({
        ...o.series[0],
        yAxisIndex: idx
      }))
    }
    
    option.xAxis.triggerEvent = true

    option.grid.right = 1 === metrics.length ? '4%' : axisOffsetAcc - 60
    
    if (window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH) {
      option = immutateUpdate(option, 'grid.top', () => {
        let top = Math.ceil(_.size(metrics) / 2) * 25
        return `${top}px`
      })
    }


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

