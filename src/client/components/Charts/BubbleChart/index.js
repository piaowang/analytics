import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import * as d3 from 'd3'
import Alert from '../../Common/alert'
import {Select} from 'antd'
import FixWidthHelper from '../../../components/Common/fix-width-helper-no-hidden'
import HorizontalSplitHelper from '../../../components/Common/horizontal-split-helper'
import {isEqualWithFunc, stringMapper} from '../../../../common/sugo-utils'
import metricFormatterFactory, {axisFormatterFactory} from '../../../common/metric-formatter-factory'
import measureTextWidth from '../../../common/measure-text-width'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import echartsBaseOption from '../../../common/echart-base-options'
import {ReplaceNullOrEmpty} from '../../../../common/constants'

const commaFormatter = d3.format(',')

const MAX_SYMBOL_SIZE = 1e5

function data2dGen(preScale = 1, lowerBound = 50) {
  return data => {
    // 防止数据为 0 时点看不到，所以最小值为 50
    let v = Math.abs(data[2] || 0) * preScale + lowerBound
    return Math.sqrt(v / Math.PI) * 2
    // return Math.pow((3 * v / Math.PI / 4), 1/3) * 2
  }
}

export function symbolSizeFunGen(datum, valMapper = _.identity, upperBound = MAX_SYMBOL_SIZE, lowerBound = 50) {
  let ext = d3.extent(datum || [], d => Number(valMapper(d)[2]) || 0)
  if (ext[1] < upperBound) {
    return data2dGen(1, lowerBound)
  }

  let preScale = upperBound / ext[1] // < 1

  return data2dGen(preScale, lowerBound)
}

export default class BubbleChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    settings: PropTypes.object,
    showLegend: PropTypes.bool,
    isThumbnail: PropTypes.bool,
    metricsFormatDict: PropTypes.object,
    onSettingsChange: PropTypes.func,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    showLegend: true,
    metricsFormatDict: {},
    settings: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.settings, this.props.settings)) {
      let metrics = nextProps.metrics
      let {
        xAxisName = metrics[0],
        yAxisName = metrics[1],
        zAxisName = metrics[2]
      } = nextProps.settings

      let shouldUpdateSettings = false
      let keySet = new Set(metrics)
      if (!keySet.has(xAxisName)) {
        xAxisName = metrics[0]
        shouldUpdateSettings = true
      }
      if (!keySet.has(yAxisName)) {
        yAxisName = metrics[1]
        shouldUpdateSettings = true
      }
      if (zAxisName && !keySet.has(zAxisName)) {
        zAxisName = metrics[2]
        shouldUpdateSettings = true
      }
      if (shouldUpdateSettings) {
        nextProps.onSettingsChange({xAxisName, yAxisName, zAxisName}, true)
      }
    }
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  genOneDimensionOption(data, dimensions, metrics, translationDict, metricsFormatDict, xAxisName, yAxisName, zAxisName) {
    let groupBy = dimensions[0]
    let seriesName = translationDict[groupBy]

    let xAxisTitle = translationDict[xAxisName] || xAxisName
    let yAxisTitle = translationDict[yAxisName] || yAxisName
    let zAxisTitle = translationDict[zAxisName] || zAxisName

    let xAxisFormatter = metricFormatterFactory(metricsFormatDict[xAxisName])
    let yAxisFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
    let zAxisFormatter = zAxisTitle && metricFormatterFactory(metricsFormatDict[zAxisName]) || commaFormatter

    let xAxisLabelFormatter = axisFormatterFactory(metricsFormatDict[xAxisName])
    let yAxisLabelFormatter = axisFormatterFactory(metricsFormatDict[yAxisName])
    let seriesData = data.map(d => {
      return [d[xAxisName], d[yAxisName], d[zAxisName], d[groupBy]]
    })
    let {dimensionColumnFormatterGen} = this.props
    let formatter = dimensionColumnFormatterGen(groupBy, {showComplete: true}) || _.identity
    return {
      ...echartsBaseOption,
      legend: {
        show: true,
        data: [seriesName].map(str => _.isString(str) ? str : `${str}`)
      },
      grid: {
        left: '80px',
        right: '20px',
        top: '35px',
        bottom: '20px'
      },
      tooltip: {
        confine: true,
        formatter: (obj) => {
          let [xVal, yVal, val, groupName] = obj.value
          groupName = stringMapper(groupName && formatter(groupName), ReplaceNullOrEmpty)
          xVal = xAxisFormatter(xVal)
          yVal = yAxisFormatter(yVal)
          val = zAxisFormatter(val)
          return zAxisTitle
            ? `${groupName}<br />X（${xAxisTitle}） : ${xVal}<br />Y（${yAxisTitle}） : ${yVal}<br />气泡大小（${zAxisTitle}） : ${val}`
            : `${groupName}<br />X（${xAxisTitle}） : ${xVal}<br />Y（${yAxisTitle}） : ${yVal}`
        }
      },
      xAxis: {
        splitNumber: this.props.isThumbnail ? 1 : undefined,
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        axisLabel: {
          formatter: xAxisLabelFormatter
        }
      },
      yAxis: {
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        scale: true,
        axisLabel: {
          formatter: yAxisLabelFormatter
        }
      },
      series: [{
        name: _.isString(seriesName) ? seriesName : `${seriesName}`,
        data: seriesData,
        type: 'scatter',
        symbolSize: symbolSizeFunGen(seriesData),
        itemStyle: {
          normal: {
            opacity: 0.8,
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: 'transparent'
          }
        }
      }]
    }
  }

  genTwoDimensionOption(data, dimensions, metrics, translationDict, metricsFormatDict, xAxisName, yAxisName, zAxisName) {
    let {showLegend = true, isThumbnail} = this.props

    let groupBy0 = dimensions[0]
    let groupBy1 = dimensions[1]
    let arrKey = _.find(Object.keys(data[0]), k => _.isArray(data[0][k]))

    let xAxisTitle = translationDict[xAxisName] || xAxisName
    let yAxisTitle = translationDict[yAxisName] || yAxisName
    let zAxisTitle = translationDict[zAxisName] || zAxisName

    let xAxisFormatter = metricFormatterFactory(metricsFormatDict[xAxisName])
    let yAxisFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
    let zAxisFormatter = zAxisTitle && metricFormatterFactory(metricsFormatDict[zAxisName]) || commaFormatter

    let xAxisLabelFormatter = axisFormatterFactory(metricsFormatDict[xAxisName])
    let yAxisLabelFormatter = axisFormatterFactory(metricsFormatDict[yAxisName])

    let showingLegend = showLegend && data.length <= (isThumbnail ? 4 : 16)

    let {dimensionColumnFormatterGen} = this.props
    let formatter0 = dimensionColumnFormatterGen(groupBy0, {showComplete: true}) || _.identity
    let formatter1 = dimensionColumnFormatterGen(groupBy1, {showComplete: true}) || _.identity

    let legendStrs = data.map(d => d[groupBy0]).map(str => _.isString(str) ? str : `${str}`)
    let rootDomWidth = this._rootDom && this._rootDom.offsetWidth || 950
    let top = showingLegend
      ? `${(Math.ceil(measureTextWidth(legendStrs.map(s => `     ${s}`).join(''), 16) * 1.1 / rootDomWidth) * 15 + 20)}px`
      : '20px'
    return {
      ...echartsBaseOption,
      tooltip: {
        confine: true,
        formatter: (obj) => {
          let [xVal, yVal, val, groupName0, groupName1] = obj.value
          groupName0 = stringMapper(groupName0 && formatter0(groupName0), ReplaceNullOrEmpty)
          groupName1 = stringMapper(groupName1 && formatter1(groupName1), ReplaceNullOrEmpty)
          xVal = xAxisFormatter(xVal)
          yVal = yAxisFormatter(yVal)
          val = zAxisFormatter(val)
          return zAxisTitle
            ? `${groupName0}，${groupName1}<br />X（${xAxisTitle}） : ${xVal}<br />Y（${yAxisTitle}） : ${yVal}<br />气泡大小（${zAxisTitle}） : ${val}`
            : `${groupName0}，${groupName1}<br />X（${xAxisTitle}） : ${xVal}<br />Y（${yAxisTitle}） : ${yVal}`
        }
      },
      grid: {
        left: '80px',
        right: '20px',
        top: top,
        bottom: '20px'
      },
      legend: {
        show: showingLegend,
        data: legendStrs,
        formatter: formatter0,
        y: 'top',
        // textStyle: {
        //   fontSize: 16
        // }
      },
      xAxis: {
        splitNumber: this.props.isThumbnail ? 1 : undefined,
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        axisLabel: {
          formatter: xAxisLabelFormatter
        }
      },
      yAxis: {
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        scale: true,
        axisLabel: {
          formatter: yAxisLabelFormatter
        }
      },
      series: data.map((d, i) => {
        let seriesData = d[arrKey] && d[arrKey].map(d0 => {
          return [d0[xAxisName], d0[yAxisName], d0[zAxisName], d[groupBy0], d0[groupBy1]]
        })
        let name = d[groupBy0]
        return {
          name: _.isString(name) ? name : `${name}`,
          data: seriesData,
          type: 'scatter',
          symbolSize: symbolSizeFunGen(seriesData),
          itemStyle: {
            normal: {
              opacity: 0.8,
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowOffsetY: 0,
              shadowColor: 'transparent'
            }
          }
        }
      })
    }
  }

  calcMaxLabelLengthOfAxis(axisDataIndex, option, labelFormatStr) {
    // 解决缩略图右边数字不能完全显示
    if (!option.series[0].data) {
      return 10 // 一维切换到二维时，因为第二维度没有数据，这里只是临时返回
    }
    let axisProjections = option.series[0].data.map(arr => arr[axisDataIndex])
    let maxValInThisAxis = _.max(axisProjections) || 1
    let minValInThisAxis = _.min(axisProjections) || 0
    let metricFormatter = metricFormatterFactory(labelFormatStr)
    let labelStrLength = metricFormatter(maxValInThisAxis)

    // y 分割数比较多的话可能会产生小数位
    let axisGap = maxValInThisAxis - minValInThisAxis
    return (axisGap < 20
      ? measureTextWidth(labelStrLength + '.00')
      : measureTextWidth(labelStrLength)) * 1.1
  }

  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, settings, onSettingsChange,
      isThumbnail, showLegend,theme='light', ...rest} = this.props

    if (dimensions.length < 1 || metrics.length < 2) {
      return <Alert msg={'气泡图最少选择一个维度和两个指标'} {...rest} />
    }
    if (2 < dimensions.length || 3 < metrics.length) {
      return <Alert msg={'气泡图最多选择两个维度和三个指标'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let {
      xAxisName = metrics[0],
      yAxisName = metrics[1],
      zAxisName = metrics[2]
    } = settings

    let keySet = new Set(metrics)
    if (!keySet.has(xAxisName)) {
      xAxisName = metrics[0]
    }
    if (!keySet.has(yAxisName)) {
      yAxisName = metrics[1]
    }
    if (zAxisName && !keySet.has(zAxisName)) {
      zAxisName = metrics[2]
    }

    let option
    if (dimensions.length === 1) {
      option = this.genOneDimensionOption(data, dimensions, metrics, translationDict, metricsFormatDict, xAxisName, yAxisName, zAxisName)
    } else if (dimensions.length === 2) {
      option = this.genTwoDimensionOption(data, dimensions, metrics, translationDict, metricsFormatDict, xAxisName, yAxisName, zAxisName)
    }

    const X_AXIS_DATA_INDEX = 0, Y_AXIS_DATA_INDEX = 1
    let yAxisLabelMaxLength = Math.round(this.calcMaxLabelLengthOfAxis(Y_AXIS_DATA_INDEX, option, metricsFormatDict[yAxisName]))
    let xAxisMaxLength = this.calcMaxLabelLengthOfAxis(X_AXIS_DATA_INDEX, option, metricsFormatDict[xAxisName])
    option.grid.left = `${10 + yAxisLabelMaxLength}px`
    option.grid.right = `${5 + Math.round(xAxisMaxLength / 2)}px`
    

    if (isThumbnail) {
      return <ReactEcharts theme={this.props.theme} {...rest} option={option} notMerge />
    }

    return (
      <div
        className="height-100"
        ref={ref => this._rootDom = ref}
      >
        <HorizontalSplitHelper
          isAdjustable={false}
          style={{ height: '32px' }}
        >
          <FixWidthHelper
            toFix="first"
            toFixWidth="70px"
            className="itblock"
            defaultWeight={1}
          >
            <div className="line-height32 aligncenter">X 轴</div>
            <Select
              value={xAxisName}
              className="width-100"
              placeholder="X 轴所使用的指标"
              onChange={val => {
                if (val === yAxisName) {
                  // 如果切换到跟 y 轴一样，就把 y 轴弄成 x 轴
                  onSettingsChange({xAxisName: val, yAxisName: xAxisName, zAxisName})
                } else {
                  onSettingsChange({xAxisName: val, yAxisName, zAxisName})
                }
              }}
            >
              {metrics.map(m => <Select.Option key={m} value={m}>{translationDict[m] || m}</Select.Option>)}
            </Select>
          </FixWidthHelper>

          <FixWidthHelper
            toFix="first"
            toFixWidth="70px"
            className="itblock"
            defaultWeight={1}
          >
            <div className="line-height32 aligncenter">Y 轴</div>
            <Select
              value={yAxisName}
              className="width-100"
              placeholder="Y 轴所使用的指标"
              onChange={val => {
                if (val === xAxisName) {
                  // 如果切换到跟 x 轴一样，就把 x 轴弄成 y 轴
                  onSettingsChange({xAxisName: yAxisName, yAxisName: val, zAxisName})
                } else {
                  onSettingsChange({xAxisName, yAxisName: val, zAxisName})
                }
              }}
            >
              {metrics.map(m => <Select.Option key={m} value={m}>{translationDict[m] || m}</Select.Option>)}
            </Select>
          </FixWidthHelper>

          <FixWidthHelper
            toFix="first"
            toFixWidth="70px"
            className="itblock"
            defaultWeight={1}
          >
            <div className="line-height32 aligncenter">气泡大小</div>
            <Select
              value={zAxisName || undefined}
              className="width-100"
              placeholder="气泡大小所使用的指标"
              onChange={val => {
                onSettingsChange({xAxisName, yAxisName, zAxisName: val || null})
              }}
              allowClear
            >
              {metrics.map(m => <Select.Option key={m} value={m}>{translationDict[m] || m}</Select.Option>)}
            </Select>
          </FixWidthHelper>
        </HorizontalSplitHelper>

        <div className="pd1t" style={{height: 'calc(100% - 32px)'}}>
          <ReactEcharts theme={this.props.theme} {...rest} option={option} notMerge />
        </div>
      </div>
    )
  }
}
