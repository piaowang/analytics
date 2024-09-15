import React, {Component} from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import Alert from '../../Common/alert'
import _ from 'lodash'
import metricFormatterFactory from '../../../common/metric-formatter-factory'

// const AlwaysDisplayLabelItemCount = 20

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

  // shouldComponentUpdate(nextProps) {
  //   return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  // }

  componentWillUnmount() {
    if (this.observer) this.observer = null
  }

  listenWidthChange(e) {
    const { cancelListener } = this.props
    if (cancelListener) return
    // const dom = document.getElementsByClassName('echarts-for-react')[0].children[0]
    const dom = e._dom.children[0]
    let MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver
    this.observer = new MutationObserver(_.throttle(() => {
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
    let { data, metrics, dimensions, translationDict, metricsFormatDict, isThumbnail, ...rest } = this.props
    if (dimensions.length !== 1 || metrics.length !== 1) {
      return <Alert msg={'请为仪表盘选择两个指标'} {...rest} />
    }
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let yAxisName = metrics[0]
    let data0 = ''
    let data1 = ''
    if (data.length === 1) {
      data0 = data[0][yAxisName]
      data1 = data[0][yAxisName]
    } else if(data.length >= 2) {
      data0 = data[0][yAxisName]
      data1 = data[1][yAxisName]
    }
    let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])

    let value = metricFormatter(data0)
    value = value.includes('%') ? value : (value * 100 + '%')
    this.option = {
      title: [
        {
          show: false,
          text: `${(translationDict[yAxisName] || yAxisName)}\n${metricFormatter(data0)}`,
          left:'center',
          top:'58%',
          padding:[-30,0], 
          textStyle:{
            color:'#fff',
            fontSize:18, 
            align:'center'
          } 
        }
      ],
      backgroundColor: 'transparent',
      series: [
        {
          name: '刻度1',
          type: 'gauge',
          radius: '60%',
          min:0,//最小刻度
          max:160,//最大刻度
          splitNumber: 16, //刻度数量
          startAngle: 225,
          endAngle: -45,
          axisLine: {
            show: true,
            lineStyle: {
              width: 1,
              color: [[1,'rgba(0,0,0,0)']] 
            }
          },//仪表盘轴线
          axisLabel: {
            show: true,
            color:'#4d5bd1',
            distance:30,
            fontSize: 16,
            formatter:function(v){
              if(v%10===0){
                return v
              }
            }
          },//刻度标签。
          axisTick: {
            show: true,
            splitNumber: 7,
            lineStyle: {
              color: '#5c53de',  //用颜色渐变函数不起作用
              width: 1
            },
            length: -8
          },//刻度样式
          splitLine: {
            show: true,
            length: -20,
            lineStyle: {
              fontSize: 16,
              color: '#5c53de'  //用颜色渐变函数不起作用
            }
          },//分隔线样式
          detail: {
            show: false
          },
          pointer: {
            show: false
          }
        },
        {
          'name': '仪表盘1',
          'type': 'gauge',
          radius: '43%',
          'splitNumber': 10,
          'axisLine': {
            'lineStyle': {
              'color': [
                [data0, '#646BFA']
              ],
              'width': 6
            }
          },
          axisLabel: {
            show: false
          },
          'axisTick': {
            show: false

          },
          'splitLine': {
            'show': false
          },
          'itemStyle': {
            show: false
          },
          'detail': {
            'formatter': function(value) {
              if (value !== 0) {
                return (value*100).toFixed(0)+'%'
              } else {
                return 0
              }
            },
            'offsetCenter': [0, '70%'],
            'textStyle': {
              padding: [0, 0, 80, 0],
              'fontSize': 18,
              fontWeight: '700',
              'color': '#646BFA'
            }
          },
          'title': {
            color: '#fff',
            'fontSize': 10,
            'offsetCenter': [0, '-25%']
          }, 
          'data': [{
            'value':data0
          }],
          pointer: {
            show: false,
            length: '75%',
            width: 20 //指针粗细
          }
        },
        {
          'name': '仪表盘2',
          'type': 'gauge',
          radius: '60%',
          'splitNumber': 10,
          'axisLine': {
            'lineStyle': {
              'color': [
                [data1, '#F6E594']
              ],
              'width': 6
            }
          },
          axisLabel: {
            show: false
          },
          'axisTick': {
            show: false

          },
          'splitLine': {
            'show': false
          },
          'itemStyle': {
            show: false
          },
          'detail': {
            'formatter': function(value) {
              if (value !== 0) {
                return (value*100).toFixed(0)+'%'
              } else {
                return 0
              }
            },
            'offsetCenter': [0, '-90%'],
            'textStyle': {
              padding: [0, 0, 80, 0],
              'fontSize': 18,
              fontWeight: '700',
              'color': '#F6E594'
            }
          },
          'title': {
            color: '#fff',
            'fontSize': 10,
            'offsetCenter': [0, '-25%']
          }, 
          'data': [{
            'value': data1
          }],
          pointer: {
            show: false,
            length: '75%',
            width: 20 //指针粗细
          }
        }
      ]
    }
    return (
      <ReactEcharts {...rest} onChartReady={(e) => this.listenWidthChange(e)} option={this.option} notMerge />
    )
  }
}
