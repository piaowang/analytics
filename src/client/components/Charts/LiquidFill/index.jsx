import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance/lazyLoadEcharts'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import { isEqualWithFunc } from '../../../../common/sugo-utils'
import BigNumberChart from '../BigNumberChart'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import echarts from 'echarts/lib/echarts'
import 'echarts/lib/component/title'
import 'echarts-liquidfill'
import 'zrender/lib/svg/svg'
import _ from 'lodash'
import {chartDarkTHeme, chartLightTheme} from '../../../common/echartThemes'

export default class EchartsLiquidFill extends Component {
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
    const dom = e._dom.children[0]

    let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver
    this.observer = new MutationObserver(_.throttle(() => {
      if (dom.clientWidth < 284 || dom.clientHeight < 284) {
        e.setOption(this.changeShowState(this.option,true))
      } else {
        e.setOption(this.changeShowState(this.option,false))
      }
    },500))
    this.observer.observe(dom, { attributes: true, attributeFilter: ['style'], attributeOldValue: true })
  }
  
  changeShowState(option,bool) {
    option.title.show = bool
    option.series[0].data[0].label.normal.show = !bool
    option.series[0].data[0].labelLine.normal.show = !bool
    option.series[0].label.show = !bool
    return option
  }

  render() {
    let {
      data, metrics, dimensions, translationDict, metricsFormatDict, isThumbnail, theme = 'light', ...rest
    } = this.props
    //为了满足农商行定制大屏水泡图，这里暂时注释
    // if (metrics.length === 1) {
    //   return <Alert msg={'请为水泡图选择一个指标'} {...rest} />
    // }
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let yAxisName = metrics[0]
    let data0 = data[0][yAxisName]

    //为了满足农商行定制大屏水泡图，这里暂时注释
    // if (data0 > 1) {
    //   return <BigNumberChart {...this.props}/>
    // }

    let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])

    let value = metricFormatter(data0)
    value = value.includes('%') ? value : (value * 100 + '%')
    
    let themeDefine = theme === 'light' ? chartLightTheme : chartDarkTHeme
    this.option = {
      color: _.get(themeDefine, 'color'),
      title: {
        show: false,
        text: `${(translationDict[yAxisName] || yAxisName)}\n${metricFormatter(data0)}`,
        x: 'left',
        y: '10%',
        textStyle: {
          fontWeight: 'normal',
          fontSize: '100%',
          color: _.get(themeDefine,'liquidFill.title.textStyle.color'),
        }
      },
      series: [
        // 标题
        {
          type: 'liquidFill',
          radius: isThumbnail ? '70%' : '50%',
          outline: {
            borderDistance: _.get(themeDefine, 'liquidFill.outline.borderDistance'),
            itemStyle: {
              color: 'none',
              borderWidth: _.get(themeDefine, 'liquidFill.outline.itemStyle.borderWidth'),
              borderColor: _.get(themeDefine, 'liquidFill.outline.itemStyle.borderColor'),
              shadowColor: _.get(themeDefine, 'liquidFill.outline.itemStyle.shadowColor'),
              shadowBlur: _.get(themeDefine, 'liquidFill.outline.itemStyle.shadowBlur')
            }
          },
          data: [
            {
              value: data0*0.8,
              itemStyle: {
                color: _.get(themeDefine, 'color[0]'),
                shadowColor: _.get(themeDefine, 'liquidFill.itemStyle.shadowColor'),
                shadowBlur: _.get(themeDefine, 'liquidFill.itemStyle.shadowBlur'),
                opacity: 0.6
              },
              label: {
                normal: {
                  color: _.get(themeDefine, 'liquidFill.label.titleColor'),
                  insideColor: _.get(themeDefine, 'liquidFill.label.insideColor'),
                  fontFamily:_.get(themeDefine, 'liquidFill.label.fontFamily'),
                  fontWeight: 'normal',
                  show: true,
                },
                emphasis: { show: true }
              }
            }
          ],
          backgroundStyle: {
            borderWidth: 0,
            borderColor: 'transparent',
            color: 'transparent'
          },
          label: {
            show: true,
            position: ['50%', '30%'],
            formatter: () => `${(translationDict[yAxisName] || yAxisName)}`,
            fontSize: _.get(themeDefine, 'liquidFill.label.nameFontSize'),
            fontFamily:_.get(themeDefine, 'liquidFill.label.fontFamily'),
          }
        },
        // 值
        {
          type: 'liquidFill',
          radius: isThumbnail ? '70%' : '50%',
          outline: {show: false},
          data: [
            {
              period: 4000,
              itemStyle: {
                color: _.get(themeDefine, 'color[1]'),
                shadowColor: _.get(themeDefine, 'liquidFill.itemStyle.shadowColor'),
                shadowBlur: _.get(themeDefine, 'liquidFill.itemStyle.shadowBlur'),
                opacity: 0.6
              },
              value: data0,
              label: {
                normal: {
                  color: _.get(themeDefine, 'liquidFill.label.color'),
                  insideColor: _.get(themeDefine, 'liquidFill.label.insideColor'),
                  fontFamily:_.get(themeDefine,'liquidFill.textStyle.fontFamily'),
                  show: true,
                },
                emphasis: { show: true },
              }
            }
          ],
          backgroundStyle: {
            borderWidth: 0,
            borderColor: 'transparent',
            color: 'transparent'
          },
          label: {
            show: true,
            formatter: () => `\n\n${value.replace(/%$/, '{x|%}')}`,
            fontSize: _.get(themeDefine, 'liquidFill.label.valueFontSize'),
            textStyle:{
              rich: {
                x: {
                  fontSize: 14,
                  verticalAlign: 'middle',
                  fontWeight:600,
                  // color: _.get(themeDefine, 'liquidFill.label.color'),
                  // insideColor: _.get(themeDefine, 'liquidFill.label.insideColor'),
                  padding: [-25, 0, 0, 5],
                }
              }
            }
          }
        }
      ]
    }
    return (
      <ReactEcharts
        {...rest}
        echarts={echarts}
        theme={theme}
        // onChartReady={(e) => this.listenWidthChange(e)}
        option={this.option}
        notMerge
      />
    )
  }
}

