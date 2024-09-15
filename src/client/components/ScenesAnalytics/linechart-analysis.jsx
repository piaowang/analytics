import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../Charts/ReactEchartsEnhance'
import _ from 'lodash'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../common/echarts-option-generator'
import Alert from '../Common/alert'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../common/echarts-option-generator'
import {Spin} from 'antd'
import EchartBaseOptions from '../../common/echart-base-options'

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
    let {data, dimension, metric, translationDict, metricsFormatDict, names, dimensionColumnFormatterGen,theme='light'} = this.props
    console.log(this.props,'linechart-analysis')
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
      smooth: true,
      name: names[i],
      areaStyle: _.size(names) === 1 ? { normal: { color: '#9986ff', opacity: 0.3 } } : null,
      lineStyle: {
        normal: { width: 2 }
      },
      sampling: true
    }))

    option.color = ['#9986ff', ...EchartBaseOptions.color]
    return option
  }

  render() {
    let {data, dimension, metric, translationDict, metricsFormatDict, dimensionColumnFormatterGen, other, isLoading, ...rest} = this.props

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
