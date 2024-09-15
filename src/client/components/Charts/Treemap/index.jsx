import React, {Component} from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import _ from 'lodash'

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
      return <Alert msg={'请为矩形树图选择一个维度和指标'} {...rest} />
    }
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let xAxisName = dimensions[0]
    let yAxisName = metrics[0]

    let option = {
      ...baseOptions,
      color: ['#C67D52'],
      tooltip: {
        confine: true,
        trigger: 'item',
        // formatter: '{b} : {c} ({d}%)'
        formatter: (params) => {
          return `${params.name}:${params.value}`
        }
      },
      legend: {
        show: false
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
      series: [
        {
          type: 'treemap',
          nodeClick: false,
          roam: false,
          name: '全部内容',
          data: data.map((d) => {
            return {
              name: d[xAxisName],
              value: d[yAxisName]
            }
          }),
          breadcrumb:{
            show:false
          },
          //leafDepth: 4, //呈现层级，若为1加载时仅展开一层，接下来的每一层通过单击进入，如上面的效果图所示，  
          //每一层级呈现的样式  
          levels: [{
            colorSaturation: [0.2, 0.8],
            itemStyle: {
              normal: {
                borderColor: '#77564E',
                borderWidth: 1,
                gapWidth: 1
              }
            }
          },
          {
            'colorSaturation': [
              0.3,
              0.7
            ],
            'colorMappingBy': 'id',
            'itemStyle': {
              'normal': {
                'borderColor': '#77564E',
                'gapWidth': 1,
                'borderWidth': 1
              }
            }
          }
          ]
        }
      ]
    }
    return (
      <ReactEcharts {...rest} option={option}  notMerge/>
    )
  }
}


