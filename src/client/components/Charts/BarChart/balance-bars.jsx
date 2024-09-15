import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import echartBaseOptions from '../../../common/echart-base-options'
import _ from 'lodash'
import * as d3 from 'd3'
import Alert from '../../Common/alert'
import {Select, InputNumber} from 'antd'
import measureTextWidth from '../../../common/measure-text-width'
import {isEqualWithFunc, immutateUpdate, stringMapper} from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {ReplaceNullOrEmpty} from '../../../../common/constants'
import {genShowTooltipEventListener} from './show-tooltip-when-hover-axis-label'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../../common/echarts-option-generator'
import { chartDarkTHeme,chartLightTheme } from '../../../common/echartThemes'

const BalanceTypeEnum = {
  Average: '平均值',
  Median: '中位数',
  Custom: '自定义'
}

export default class BalanceBarChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    settings: PropTypes.object,
    onSettingsChange: PropTypes.func,
    isThumbnail: PropTypes.bool,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {},
    settings: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  calcChartData(druidData, metric, settings) {
    let vals = druidData.map(d => d[metric])
    let delta = 0
    switch(settings.balanceType) {
      case 'Median':
        delta = d3.median(vals)
        break
      case 'Custom':
        delta = settings.customDelta || 0
        break
      case 'Average':
      default:
        delta = d3.mean(vals)
        break
    }
    return delta === 0 ? vals : vals.map(v => v - delta)
  }
  
  onEchartsEvents = genShowTooltipEventListener(this)

  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, settings, onSettingsChange, isThumbnail,
      showLegend = true, dimensionColumnFormatterGen,theme='light', ...rest} = this.props
    
    let targetTheme = theme==='light'?chartLightTheme:chartDarkTHeme

    let themeOption = genOptionHas1DimensionsAndMultiMeasures({
      data,
      xAxisName: dimensions[0],
      yAxisNames: metrics,
      chartType: 'bar',
      translationDict,
      metricsFormatDict,
      dimensionColumnFormatterGen,
      showLegend,
      theme
    })

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let groupBy = dimensions[0]

    let timeFormat = dimensionColumnFormatterGen(groupBy, {showComplete: true})
    let timeShorterFormat = dimensionColumnFormatterGen(groupBy)

    let yAxisLabels = timeShorterFormat
      ? data.map(d => timeShorterFormat(d[groupBy]))
      : data.map(d => stringMapper(d[groupBy], ReplaceNullOrEmpty))

    let metricFormatter = metricFormatterFactory(metricsFormatDict[metrics[0]])
    let option = {
      ...echartBaseOptions,
      tooltip : {
        trigger: 'axis',
        axisPointer : {
          type : 'shadow'
        },
        formatter: params => {
          let {seriesIndex, dataIndex} = params[0]

          let datum = data[dataIndex]
          let val = datum[metrics[seriesIndex]]
          let arr = params.map(p => {
            let series = stringMapper(p.seriesName, ReplaceNullOrEmpty)
            return `<span style='display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color}'></span>${series}: ${metricFormatter( val || 0 )}`
          })
          let xVal = timeFormat ? timeFormat(datum[groupBy]) : stringMapper(datum[groupBy], ReplaceNullOrEmpty)
          return `${xVal}<br />${arr.join('<br />')}`
        },
        extraCssText:_.get(targetTheme,'tooltip.extraCssText')
      },
      grid: {
        left: 'auto',
        right: 10,
        bottom: 5,
        top: showLegend ? 50 : 10
      },
      xAxis: {
        type : 'value',
        position: 'top',
        splitLine: {lineStyle:{type:'dashed'}},
        axisLabel: {show: false}
      },
      yAxis : {
        type : 'category',
        inverse: true,
        axisTick : { show: false },
        data : yAxisLabels,
        triggerEvent: true
      },
      legend: {
        show: showLegend,
        data: metrics.map(m => translationDict[m] || m)
      },
      backgroundColor: 'transparent',
      series : metrics.map(m => ({
        name: translationDict[m] || m,
        type:'bar',
        barMaxWidth: 20,
        data: this.calcChartData(data, m, settings)
      }))
    }

    let {customDelta, balanceType = BalanceTypeEnum.Average} = settings

    // 计算 grid.left，截取字符的操作在 slice-chart-setheight
    rest.optionsOverwriter = _.flow([rest.optionsOverwriter, options => {
      let formatter = _.get(options, 'yAxis.axisLabel.formatter') || _.identity
      let data = options.yAxis.data.map(formatter)
      let maxText = _.maxBy(data, measureTextWidth)
      let maxTextWidth = measureTextWidth(maxText)

      return immutateUpdate(options, 'grid.left', () => {
        return maxTextWidth + 10 // * 1.1 为临时解决方案，兼容 windows，最好还是找到原因
      })
    }].filter(_.identity))

    option = _.defaultsDeep(option,{
      xAxis:{
        splitLine:themeOption.xAxis.splitLine,
        axisLabel:themeOption.xAxis.axisLabel,
      },
      yAxis:{
        splitLine:themeOption.yAxis.splitLine,
        axisLabel:{
          color:themeOption.yAxis.axisLabel.color
        },
      },
      legend:themeOption.legend,
      tooltip:{
        backgroundColor:_.get(targetTheme,'tooltip.backgroundColor'),
        textStyle:{
            color:_.get(targetTheme,'tooltip.textStyle.color')
        },
      }
    })
    if (isThumbnail) {
      return <ReactEcharts {...rest} option={option} notMerge />
    }

    return (
      <div
        className="height-100"
        style={{position: 'relative'}}
      >
        <div
          style={{
            height: '30px',
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 4
          }}
        >
          <div
            className="iblock mg1r"
          >偏移值</div>
          <Select
            value={balanceType}
            defaultWeight={1}
            style={{width: '100%'}}
            className="iblock mg1r width100"
            onChange={val => onSettingsChange({...settings, balanceType: val})}
          >
            {Object.keys(BalanceTypeEnum).map(k => <Select.Option key={k} value={k}>{BalanceTypeEnum[k]}</Select.Option>)}
          </Select>
          <InputNumber
            defaultWeight={1}
            className="iblock width100"
            disabled={balanceType !== 'Custom'}
            value={customDelta || 0}
            onChange={val => onSettingsChange({...settings, customDelta: val})}
          />
        </div>
        <ReactEcharts
          {...rest}
          option={option}
          notMerge
          onEvents={rest.onEvents ? {...rest.onEvents, ...this.onEchartsEvents} : this.onEchartsEvents}
        />
      </div>
    )
  }

}

