import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../../common/echarts-option-generator'
import Alert from '../../Common/alert'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {genShowTooltipEventListener} from '../BarChart/show-tooltip-when-hover-axis-label'
import {browserHistory} from 'react-router'

export default class SingleDimensionLineChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    mainTimeColumn: PropTypes.string,
    translationDict: PropTypes.object,
    data: PropTypes.array,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func,
    showLegend: PropTypes.bool
  }

  static defaultProps = {
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }
  
  onEchartsEvents = genShowTooltipEventListener(this)
  
  render() {
    let {
      data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, showLegend,
      theme = 'light', ...rest
    } = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let option = genOptionHas1DimensionsAndMultiMeasures({
      data,
      xAxisName: dimensions[0],
      yAxisNames: metrics,
      chartType: 'line',
      theme,
      translationDict, metricsFormatDict, dimensionColumnFormatterGen, showLegend: true
    })
    option.xAxis.boundaryGap = false
    option.xAxis.triggerEvent = true

    option.legend.data = option.legend.data.map(d => ({ icon: 'circle', name: d }))
    option.legend.type = 'scroll'

    let withArea = false //metrics.length === 1
    option.series = option.series.map(s => _.assign({}, s, {
      areaStyle: withArea ? { normal: {} } : undefined,
      smooth: true
    }))
    
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
