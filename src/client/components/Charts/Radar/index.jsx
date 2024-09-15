import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import { isEqualWithFunc, stringMapper } from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import { defaultDimensionColumnFormatterGen } from '../../../common/echarts-option-generator'
import _ from 'lodash'
import {chartDarkTHeme, chartLightTheme} from '../../../common/echartThemes'

// const AlwaysDisplayLabelItemCount = 20

export default class EchartsRadar extends Component {
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
      data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, showLegend, theme = 'light', ...rest
    } = this.props
    if (dimensions.length < 1 || metrics.length < 3) {
      return <Alert msg={'请为雷达图选择至少三个指标和一个维度'} {...rest} />
    }
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    data = data.filter((item) => { return item[dimensions[0]] !== '全局' })
    const themeDefine = theme === 'light' ? chartLightTheme : chartDarkTHeme
  
    let xAxisName = dimensions[0]
    let yAxisNameArr = metrics
    // if (!data.map(data0 => yAxisNameArr.map(name => data0[name])).some( i => !i.some( j => {
    //   if (!j) return true 
    //   j = j.toString().indexOf('%') !== -1 ? j : (j.toString().replace('%', ''))
    //   return j > 1
    // }))) {
    //   return <Alert msg={'非法指标'} {...rest} />
    // }
    const metricNeedFormatter = Object.keys(metricsFormatDict)
    let showLegendTemp = !!showLegend
    if(showLegend){
      let legendData = data.map(data => !_.isNull(data[xAxisName]))
      if(legendData.length>7){
        showLegendTemp = false
      }
    }
    let option = {
      ...baseOptions,
      target:{
        max:1
      },
      tooltip:{
        formatter: (params) => {
          let value0 = data[params.dataIndex]
          let value = (_.isNull(value0[xAxisName]) ? '空(Null)' : value0[xAxisName])  + '<br/>'
          yAxisNameArr.map(i => {
            value += translationDict[i] + ':' + value0[i] + '<br/>'    
          })
          return value
        }
      },
      legend: {
        show: showLegendTemp,
        left: '10%',
        right: '10%',
        data: data.map(data => !_.isNull(data[xAxisName])) ? data[xAxisName] : '空(Null)'
      },
      radar: {
        radius: '70%',
        splitArea: themeDefine.radar.splitArea,
        name: {
          textStyle: {
            // color: '#000', // 使用 theme 控制
            splitNumber: yAxisNameArr.length,
            borderRadius: 3,
            padding: [3, 5]
          }
        },
        center: ['50%','55%'],
        indicator: yAxisNameArr.map(name => (
          { name: translationDict[name], max: 1 }))
      },
      series: [
        {
          name: '雷达图',
          type: 'radar',
          data: data.map(data0 => (
            { 
              name: _.isNull(data0[xAxisName]) ? '空(Null)' : data0[xAxisName], 
              value: yAxisNameArr.map(name => {
                if (metricNeedFormatter.includes(name)) {
                  let value = metricFormatterFactory(metricsFormatDict[name])(data0[name])
                  if (value.includes('%')) value = value.replace('%', '') * 0.01
                  return value
                }
                return data0[name]
              })
            }
          ))
        }
      ]
    }
    if (metrics.length  === 2) {
      option = {
        ...baseOptions,
        target:{
          max:1
        },
        tooltip:{
          formatter: (params) => {
            let value = params.data.name  + '<br/>'
            data.map((i, idx) => {
              value += i[xAxisName] + ':' + params.data.value[idx] + '<br/>'    
            })
            return value
          }
        },
        legend: {
          show: true,
          left: '10%',
          right: '10%',
          data: metrics.map(item => translationDict[item])
        },
        radar: {
          name: {
            textStyle: {
              color: '#000',
              splitNumber: yAxisNameArr.length,
              borderRadius: 3,
              padding: [3, 5]
            }
          },
          center: ['50%','60%'],
          indicator: data.map(item => (
            { name: item[xAxisName], max: 1 }))
        },
        series: [
          {
            name: '雷达图',
            type: 'radar',
            data: [
              { 
                name: translationDict[yAxisNameArr[0]],
                value: data.map(item => {
                  return item[yAxisNameArr[0]]
                })
              },
              { 
                name: translationDict[yAxisNameArr[1]],
                value: data.map(item => {
                  return item[yAxisNameArr[1]]
                })
              }
            ]
          }
        ]
      }
    }
    return (
      <ReactEcharts
        {...rest}
        option={option}
        notMerge
        theme={theme}
      />
    )
  }
}
