import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import Alert from '../../Common/alert'
import {dictBy, immutateUpdate, stringMapper} from '../../../../common/sugo-utils'
import measureTextWidth from '../../../common/measure-text-width'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import {
  defaultDimensionColumnFormatterGen, formatterForDisplayNull,
  NumberRangeReg
} from '../../../common/echarts-option-generator'
import {ReplaceNullOrEmpty} from '../../../../common/constants'
import { chartDarkTHeme,chartLightTheme } from '../../../common/echartThemes'

export default class EchartsHeatMap extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    isThumbnail: PropTypes.bool,
    metricsFormatDict: PropTypes.object,
    dimensionExtraSettingDict: PropTypes.object,
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
  
  onEchartsEvents = {
    mousemove: _.debounce((params, myChart) => {
      // 显示 label 对应的柱子的 tooltip
      if (params.targetType !== 'axisLabel') {
        return
      }
      let option = myChart.getOption()
      if (params.componentType === 'xAxis') {
        const targetName = params.value
        const xAxisLabelIdx = _.findIndex(_.get(option, 'xAxis[0].data', []), v => v === targetName)
        myChart.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: _.findIndex(option.series[0].data, d => d[0] === xAxisLabelIdx)
        })
      } else if (params.componentType === 'yAxis') {
        const targetName = params.value
        const yAxisLabelIdx = _.findIndex(_.get(option, 'yAxis[0].data', []), v => v === targetName)
        myChart.dispatchAction({
          type: 'showTip',
          seriesIndex: 0,
          dataIndex: _.findIndex(option.series[0].data, d => d[1] === yAxisLabelIdx)
        })
      }
      // console.log('showTip: ', data[dataIdx])
      // console.log('params: ', params)
      return true
    }, 300)
  }
  
  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, isThumbnail,
      showLegend, dimensionExtraSettingDict,theme='light', ...rest} = this.props

    let targetTheme = theme==='light'?chartLightTheme:chartDarkTHeme    
    if (dimensions.length !== 2 || metrics.length !== 1) {
      return <Alert msg={'请为热力图选择两个维度；第一维度为 X 轴，第二个维度作为 Y 轴'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let xAxisName = dimensions[0]
    let yAxisName = dimensions[1]
    let zAxisName = metrics[0]

    let innerArrKey = _.find(Object.keys(data[0]), k => _.isArray(data[0][k]))
    if (!innerArrKey) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let xAxisColNames = data.map(d => d[xAxisName])
    let yAxisColNames = _.uniq( _.flatMap(data, d => d[innerArrKey]).map(d2 => d2[yAxisName]) )

    // 实现前端排序
    let yAxisExSetting = _.get(dimensionExtraSettingDict, yAxisName)
    if (yAxisExSetting && yAxisExSetting.sortCol === yAxisName) {
      // 兼容数值范围的排序
      if (_.every(yAxisColNames.filter(_.identity), str => str.match(NumberRangeReg))) {
        yAxisColNames = _.orderBy(yAxisColNames, str => str ? +str.match(NumberRangeReg)[1] : 0, yAxisExSetting.sortDirect)
      } else {
        yAxisColNames = _.orderBy(yAxisColNames, _.identity, yAxisExSetting.sortDirect)
      }
    }

    let dataDict = dictBy(data, d => d[xAxisName], d => dictBy(d[innerArrKey], d2 => d2[yAxisName], d2 => d2[zAxisName]))

    let allVals = _.flatMap(Object.keys(dataDict), k => _.values(dataDict[k])).filter(_.isNumber)

    // 日期格式化
    let xFormatter = dimensionColumnFormatterGen(xAxisName, {showComplete: true})
    let xFormatterShort = dimensionColumnFormatterGen(xAxisName)

    let yFormatter = dimensionColumnFormatterGen(yAxisName, {showComplete: true})
    let yFormatterShort = dimensionColumnFormatterGen(yAxisName)

    let min = allVals.length && _.min(allVals) || 0
    let max = Math.max(min + 1, allVals.length && _.max(allVals) || 1)

    // 计算出最长的 y 轴 label，设置 left
    let yAxisFormatted = yFormatterShort ? yAxisColNames.map(yFormatterShort) : yAxisColNames
    let metricFormatter = metricFormatterFactory(metricsFormatDict[zAxisName])

    let option = {
      color:['#e84a50','#f57676','#ffa6a3','#ffcfcc','#fff1f0'],
      legend: {
        show: showLegend,
        data: [zAxisName].map(a => translationDict[a] || a)
      },
      tooltip: {
        confine: true,
        formatter: (params) => {
          let [xi, yi, val] = params.data
          let xAxisCol = xFormatter ? xFormatter(xAxisColNames[xi]) : stringMapper(xAxisColNames[xi], ReplaceNullOrEmpty)
          let yAxisCol = yFormatter ? yFormatter(yAxisColNames[yi]) : stringMapper(yAxisColNames[yi], ReplaceNullOrEmpty)
          let serialName = stringMapper(params.seriesName, ReplaceNullOrEmpty)
          return `${xAxisCol}，${yAxisCol}<br />${serialName} : ${metricFormatter(val)}`
        },
        extraCssText: `
          white-space: pre-wrap;      /* CSS3 */
          white-space: -moz-pre-wrap; /* Firefox */
          white-space: -pre-wrap;     /* Opera <7 */
          white-space: -o-pre-wrap;   /* Opera 7 */
          word-wrap: break-word;      /* IE */
        `+_.get(targetTheme,'tooltip.extraCssText')
      },
      xAxis: {
        type: 'category',
        data: xAxisColNames,
        axisLabel: {
          formatter: xFormatterShort ? xFormatterShort : formatterForDisplayNull
        },
        triggerEvent: true
      },
      yAxis: {
        type: 'category',
        data: yAxisFormatted,
        inverse: true,
        axisLabel: {
          // formatter: isThumbnail ? _.flow(formatterForDisplayNull, truncator) : formatterForDisplayNull
          formatter: formatterForDisplayNull
        },
        triggerEvent: true
      },
      grid: {
        top: showLegend ? 50 : 10,
        right: 10,
        // left: 10 + maxTextWidth * 1.1,
        left: 10,
        bottom: showLegend ? 70 : 60
      },
      visualMap: {
        type: 'continuous',
        min: min,
        max: max,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: ['#e84a50', '#fff1f0']
        }
      },
      series: [{
        name: translationDict[zAxisName] || zAxisName,
        type: 'heatmap',
        data: _.flatMap(xAxisColNames, (xCol, xi) => {
          return yAxisColNames.map((yCol, yi) => {
            let val = dataDict[xCol] && dataDict[xCol][yCol]
            return [xi, yi, _.isNumber(val) ? val : '-']
          })
        }).filter(d => d[2] !== '-'),
        itemStyle: {
          emphasis: {
            borderColor: '#333',
            borderWidth: 1
          }
        },
        progressive: 1000,
        animation: false
      }]
    }

    // 截取字符的操作在 slice-chart-setheight
    rest.optionsOverwriter = _.flow([rest.optionsOverwriter, options => {
      return immutateUpdate(options, 'grid.left', () => {
        let formatter = _.get(options, 'yAxis.axisLabel.formatter') || _.identity
        let maxTextWidth = _.max(options.yAxis.data.map(str => measureTextWidth(formatter(str))))
        return Math.min(200, maxTextWidth * 1.1 + 10) // * 1.1 为临时解决方案，兼容 windows，最好还是找到原因
      })
    }].filter(_.identity))

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
