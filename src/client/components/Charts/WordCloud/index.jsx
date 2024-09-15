import React, { Component } from 'react'
import ReactEcharts from '../ReactEchartsEnhance/lazyLoadEcharts'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import echarts from 'echarts/lib/echarts'
import 'echarts/lib/component/title'
import 'echarts-wordcloud'
import 'zrender/lib/svg/svg'
import {NULL_VALUE} from '../../../../common/constants'

export default class WordCloud extends Component {
  // static propTypes = {
  //   metrics: PropTypes.array,
  //   data: PropTypes.array,
  //   translationDict: PropTypes.object,
  //   metricsFormatDict: PropTypes.object,
  //   optionsOverwriter: PropTypes.func
  // }

  // static defaultProps = {
  //   metricsFormatDict: {}
  // }
  
  render() {
    let { data, metrics, dimensions, translationDict, metricsFormatDict, dimensionColumnFormatterGen, ...rest } = this.props
    if (dimensions.length !== 1 || metrics.length !== 1) {
      return <Alert msg={'请为饼图选择一个维度和指标'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let xAxisName = dimensions[0]
    let yAxisName = metrics[0]

    // let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])

    // let xFormatter = dimensionColumnFormatterGen(xAxisName, {showComplete: true}) || _.identity
    const colors = [
      '#2DA3FB', '#66D99E', '#FFD200', '#FA424A',
      '#AE77EF', '#fc6e51', '#a0d468', '#ec87c0'
    ]
    
    this.option = {
      ...baseOptions,
      //应该没有这两个
      // tooltip: {
      //   confine: true,
      //   trigger: 'item',
      //   // formatter: '{b} : {c} ({d}%)'
      //   formatter: (params) => {
      //     if (!xFormatter) {
      //       return `${stringMapper(data[params.dataIndex][xAxisName], ReplaceNullOrEmpty)} : ${metricFormatter(params.value)} (${params.percent}%)`
      //     }
      //     return `${xFormatter(data[params.dataIndex][xAxisName])} : ${metricFormatter(params.value)} (${params.percent}%)`
      //   }
      // },
      // title: {
      //   text: translationDict[yAxisName] || yAxisName,
      //   show: false,
      //   textStyle: {
      //     fontStyle: 'normal',
      //     fontSize: 13,
      //     color: '#777'
      //   }
      // },
      backgroundColor: 'transparent',
      series: [{
        type: 'wordCloud',
        shape: 'square',
        left: 'center',
        top: 'center',
        width: '95%',
        height: '95%',
        right: null,
        bottom: null,
        sizeRange: [14, 50],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 8,
        drawOutOfBound: false,
        textStyle: {
          normal: {
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            // Color can be a callback function or a color string
            color: function () {
              // Random color
              return colors[parseInt(Math.random() * 8)]
            }
          },
          emphasis: {
            shadowBlur: 10,
            shadowColor: '#333'
          }
        },
        data: data.map( d => ({
          name: d[xAxisName] || NULL_VALUE,
          value: d[yAxisName]
        }))
      }]
    }

    return (
      <ReactEcharts
        key={Date.now()} // 修正重叠问题
        {...rest}
        echarts={echarts}
        option={this.option}
        opts={{renderer: 'svg'}}
        notMerge
      />
    )
  }
}

