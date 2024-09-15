import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../Charts/ReactEchartsEnhance'
import _ from 'lodash'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../common/echarts-option-generator'
import Alert from '../Common/alert'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../common/echarts-option-generator'
import {Spin} from 'antd'

export default class LineChart extends Component {
  static propTypes = {
    dimension: PropTypes.string,
    metric: PropTypes.string,
    mainTimeColumn: PropTypes.string,
    translationDict: PropTypes.object,
    data: PropTypes.array,
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

  genOption() {
    let {data, dimension, metric, translationDict, metricsFormatDict, names, dimensionColumnFormatterGen, theme='light',other} = this.props
    let option = data.reduce((prev, d) => {
      let option = genOptionHas1DimensionsAndMultiMeasures({
        data: d,
        xAxisName: dimension,
        yAxisNames: [metric],
        chartType: 'line',
        translationDict, metricsFormatDict, dimensionColumnFormatterGen,
        showLegend: true,
        theme
      })
      if(!prev) return option
      
      prev.series = prev.series.concat(option.series)
      return prev
    }, null)

    option.legend.data = names.map(name => ({icon: 'circle', name})) //设置图例

    option.series = option.series.map((s, i) => _.assign({}, s, {
      areaStyle: { normal: {} },
      smooth: true,
      name: names[i],
      ...other[i]
    }))

    option.color = other.map(o => _.get(o, 'areaStyle.normal.color'))
    option.tooltip= {
      trigger: 'item',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    }
    return option
  }

  render() {
    let {data, dimension, metric, translationDict, metricsFormatDict, dimensionColumnFormatterGen, other, isLoading, ...rest} = this.props
    console.log(this.props,'line-chart')
    return (
      <Spin spinning={isLoading}>
        {!data || data.length === 0
          ? (
            <Alert msg={'查无数据'} {...rest} />
          ) : (
            <ReactEcharts {...rest} option={this.genOption()} notMerge />
          )}
      </Spin>
    )
  }
}
