import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import {isEqualWithFunc, stringMapper, immutateUpdate} from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import _ from 'lodash'
import {ReplaceNullOrEmpty, RESPONSIVE_PAGE_MAX_WIDTH} from '../../../../common/constants'
import 'echarts-gl'
// const AlwaysDisplayLabelItemCount = 20

export default class EchartsPie extends Component {
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
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  render() {
    let {
      data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, showLegend,
      isThumbnail, ...rest
    } = this.props
    if (dimensions.length !== 1 || metrics.length !== 1) {
      return <Alert msg={'请为饼图选择一个维度和指标'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let xAxisName = dimensions[0]
    let yAxisName = metrics[0]

    let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])

    let xFormatter = dimensionColumnFormatterGen(xAxisName, {showComplete: true}) || _.identity

    let pieValues = data.map(d => isFinite(d[yAxisName]) ? d[yAxisName] : 0)
    let total = _.sum(pieValues)
    // const displayLabelIfBiggerThanOrEqual = pieValues.length <= AlwaysDisplayLabelItemCount
    //   ? 0 : _.orderBy(pieValues, _.identity, 'desc')[AlwaysDisplayLabelItemCount - 1] / total
    const displayLabelIfBiggerThanOrEqual = data.length <= 25 ? 0 : 0.018
    let option = {
      ...baseOptions,
      tooltip: {
        confine: true,
        trigger: 'item',
        // formatter: '{b} : {c} ({d}%)'
        formatter: (params) => {
          if (!xFormatter) {
            return `${stringMapper(data[params.dataIndex][xAxisName], ReplaceNullOrEmpty)} : ${metricFormatter(params.value)} (${params.percent}%)`
          }
          return `${xFormatter(data[params.dataIndex][xAxisName])} : ${metricFormatter(params.value)} (${params.percent}%)`
        }
      },
      legend: {
        type: 'scroll',
        show: showLegend
      },
      title: {
        text: translationDict[yAxisName] || yAxisName,
        show: false,
        textStyle: {
          fontStyle: 'normal',
          fontSize: 13,
          color: '#777'
        }
      },
      backgroundColor: 'transparent',
      series: [
        {
          type: 'pie',
          radius: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? ['20%', '40%'] : ['33%', '55%'],
          center: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? ['50%', '55%'] : ['50%', '50%'],
          avoidLabelOverlap: data.length <= 25,
          label: {
            normal: {
              show: true,
              formatter: (params) => {
                if (!xFormatter) {
                  return `${stringMapper(data[params.dataIndex][xAxisName], ReplaceNullOrEmpty)} : ${metricFormatter(params.value)} (${params.percent}%)`
                }
                return `${xFormatter(data[params.dataIndex][xAxisName])} : ${metricFormatter(params.value)} (${params.percent}%)`
              }
            }
          },
          data: data.map((d, idx) => {
            let percent = isFinite(d[yAxisName]) ? d[yAxisName] / total : 0
            let show = isFinite(percent) ? displayLabelIfBiggerThanOrEqual <= percent : idx < 25
            return {
              name: stringMapper(xFormatter(d[xAxisName]), ReplaceNullOrEmpty),
              value: d[yAxisName],
              label: {
                normal: isThumbnail
                  ? { show, formatter: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH
                    ? params => `${params.name}：${metricFormatter(params.value)}`
                    : params => `${params.name}\n${metricFormatter(params.value)}`
                  }
                  : { show },
                emphasis: { show: true }
              },
              labelLine: {
                normal: {
                  show
                },
                emphasis: { show: true }
              }
            }
          }),
          itemStyle: {
            emphasis: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        },
        {
          type: 'pie',
          radius: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? ['20%', '40%'] : ['33%', '55%'],
          center: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? ['50%', '55%'] : ['50%', '50%'],
          avoidLabelOverlap: data.length <= 25,
          data: data.map((d, idx) => {
            let percent = isFinite(d[yAxisName]) ? d[yAxisName] / total : 0
            let show = isFinite(percent) ? displayLabelIfBiggerThanOrEqual <= percent : idx < 25
            return {
              name: stringMapper(xFormatter(d[xAxisName]), ReplaceNullOrEmpty),
              value: d[yAxisName],
              label: {      
                normal:{
                  show: true,
                  position:'inner',
                  formatter: params => {
                    if(params.percent<10){
                      return ' '
                    }
                    return `${params.percent}%\n${metricFormatter(params.value)}`
                  }
                },
                emphasis: { show: true }
              },
              labelLine: {
                normal: {
                  show: true,
                  length: 20,
                  length2: 10
                },
                emphasis: { show: true }
              }
            }
          })
        }
      ]
    }
    // 多余７个不显示
    if (option.legend.show) {
      let data = option.series[0].data.map(d => d.name)
      if(data.length<=7){
        option.legend.data = data
      } else{
        option.legend.show = false
      }
    }

    let onEchartsEvents = {
      click: (params, echart) => {
        if (rest.onEvents && rest.onEvents.click) {
          let fn = rest.onEvents.click
          fn(params, echart)
        }
        let { data, dimensions, applyInteractionCode, paramsData } =this.props
        applyInteractionCode({...paramsData, params, data, dimensions})
      }
    }

    return (
      <ReactEcharts 
        theme={this.props.theme}
        {...rest} 
        option={option}
        notMerge 
        onEvents={rest.onEvents ? {...rest.onEvents, onEchartsEvents} : onEchartsEvents}         
      />
    )
  }
}
