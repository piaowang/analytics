import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import {immutateUpdates, isEqualWithFunc} from '../../../../common/sugo-utils'
import BigNumberChart from '../BigNumberChart'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import {chartDarkTHeme, chartLightTheme} from '../../../common/echartThemes'
import _ from 'lodash'
import {withSizeProviderDec} from '../../Common/size-provider'
import {RESPONSIVE_PAGE_MAX_WIDTH} from '../../../../common/constants'

// const AlwaysDisplayLabelItemCount = 20

@withSizeProviderDec()
export default class EchartsGuage extends Component {
  static propTypes = {
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {}
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  componentWillUnmount() {
    if (this.observer) this.observer = null
  }

  listenWidthChange(e) {
    const { cancelListener } = this.props
    if (cancelListener) return
    // const dom = document.getElementsByClassName('echarts-for-react')[0].children[0]
    // console.log(e);
    const dom = e._dom.children[0]
    let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver
    this.observer = new MutationObserver(_.throttle((mutationList) => {
      if (dom.clientWidth < 426 || dom.clientHeight < 350) {
        e.setOption(this.changeShowState(this.option, true))
      } else {
        e.setOption(this.changeShowState(this.option, false))
      }
    },500))
    this.observer.observe(dom, { attributes: true, attributeFilter: ['style'], attributeOldValue: true })
  }

  changeShowState(option, bool) {
    option.title.show = bool,
    option.series[2].title.show = !bool
    option.series[2].detail.show = !bool
    return option
  }

  render() {
    let {
      data, metrics, dimensions, translationDict, metricsFormatDict, isThumbnail, theme = 'light', spWidth, spHeight,
      ...rest
    } = this.props
    if (metrics.length !== 1) {
      return <Alert msg={'请为仪表盘选择一个指标'} {...rest} />
    }
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let yAxisName = metrics[0]
    let data0 = data[0][yAxisName]
    if (data0 > 1) {
      return <BigNumberChart {...this.props}/>
    }
    const themeDefine = theme === 'light' ? chartLightTheme : chartDarkTHeme

    const [filledColor, unfilledColor] = _.get(themeDefine, 'gauge.color') || [baseOptions.color[0], 'ddd']
    const metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
  
    const nameColor = _.get(themeDefine, 'gauge.title.subtextStyle.color')
    const valueColor = _.get(themeDefine, 'gauge.title.textStyle.color')
    // const valueColor = _.get(themeDefine, 'gauge.')
    const tickCount = 120
    const progress = data0
    const minBound = Math.min(spWidth, spHeight) * (window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? 1 : 0.85)
    const series0 = {
      type: 'gauge',
      startAngle: 195,
      endAngle: -15,
      min: 0,
      max: 1,
      radius: 0.612 * minBound,
      //splitNumber: 3,
      center: ['50%', '65%'],
      axisLine: {
        show: true,
        lineStyle: {
          width: 0.183 * minBound,
          shadowBlur: 0,
          color: [
            ...Array.from({length: tickCount}, (v, i) => {
              let color = i / tickCount <= progress ? filledColor : unfilledColor
              return [i / tickCount, i % 3 === 0 ? color : 'transparent']
            }),
            [1, 1 <= progress ? filledColor : unfilledColor]
          ]
        }
      },
      axisTick: {show: false},
      axisLabel: {show: false},
      splitLine: {show: false},
      pointer: {show: false},
      itemStyle: {
        normal: {
          color: 'rgba(255, 255, 255, 0.8)',
          shadowBlur: 20
        }
      },
      detail: {show: false},
      data: [{value: progress}]
    }
    this.option = {
      title: {
        text: `${metricFormatter(data0).replace(/%$/, '{x|%}')}`,
        subtext: translationDict[yAxisName] || yAxisName,
        left: 'center',
        top: '55%',
        formatter: `${metricFormatter(data0).replace(/%$/, '{x|%}')}`,
        textStyle: {
          color: valueColor, // 可根据 theme 修改
          fontSize: 48,
          fontFamily: _.get(themeDefine,'gauge.textStyle.fontFamily'),
          rich: {
            x: {
              fontSize: 14,
              color: nameColor,
              verticalAlign: 'middle',
              padding: [-28, 0, 0, 5]
            }
          }
        },
        subtextStyle: {
          color: nameColor, // 可根据 theme 修改
          fontSize: _.get(themeDefine,'gauge.title.subtextStyle.fontSize'),
          top: 'center'
        },
        itemGap: 40 //主副标题间距
      },
      grid: [{show: false}],
      series: [
        series0,
        immutateUpdates(series0,
          'radius', () => 0.398 * minBound,
          'axisLine.lineStyle.width', () => 5,
          'axisLine.lineStyle.color', colors => colors.map(v => [v[0], v[1] === 'transparent' ? 'transparent' : '#d1e1ff']))
      ]
    }
    return (
      <ReactEcharts
        {...rest}
        // onChartReady={(e) => this.listenWidthChange(e)}
        theme={theme}
        option={this.option}
        opts={{renderer: 'canvas'}}
        notMerge
      />
    )
  }
}
