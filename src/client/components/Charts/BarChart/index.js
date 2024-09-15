import { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../../common/echarts-option-generator'
import _ from 'lodash'
import Alert from '../../Common/alert'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {genShowTooltipEventListener} from './show-tooltip-when-hover-axis-label'


export default class BarChart extends Component {
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
  
  onEchartsEvents = genShowTooltipEventListener(this)

  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, showLegend,theme='light', ...rest} = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let option = genOptionHas1DimensionsAndMultiMeasures({
      data,
      xAxisName: dimensions[0],
      yAxisNames: metrics,
      chartType: 'bar',
      showLegend,
      translationDict, metricsFormatDict, dimensionColumnFormatterGen,
      timeFormat: null,
      theme
    })

    option = _.defaultsDeep({
      tooltip: {
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: { triggerEvent: true }
    }, option)

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

