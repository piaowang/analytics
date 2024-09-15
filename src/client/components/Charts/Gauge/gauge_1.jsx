import React, {Component} from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import Alert from '../../Common/alert'
import echarts from 'echarts'
import { isEqualWithFunc } from '../../../../common/sugo-utils'
import './css.styl'

// const AlwaysDisplayLabelItemCount = 20

export default class EchartsGuage1 extends Component {
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
    if (metrics.length !== 1) {
      return <Alert msg={'请为仪表盘选择一个指标'} {...rest} />
    }
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    let yAxisName = metrics[0]
    let data0 = data[0][yAxisName]
    // if (data0 > 1) {
    //   return <BigNumberChart {...this.props}/>
    // }
    //\n${(translationDict[yAxisName] || yAxisName)}
    let value = (data0 * 100)
    let valuePercent = value.toFixed(2) + '%'
    this.option = {
      title: [
        {
          show: false,
          text: `${valuePercent}`,
          left:'center',
          top:'58%',
          padding:[-30,0], 
          textStyle:{
            color:'#fff',
            fontSize:24, 
            fontFamily:'Source Han Sans CN',
            fontWeight:'bold',
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
              return v.toFixed(0)
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
          name: '指针',
          type: 'gauge',
          title: {
            show: false
          },
          detail: {
            show: false
          },
          'data': [{
            'value': value / 160 * 100
          }],
          radius: '59%',
          itemStyle: {
            color: '#F6E594'
          },
          axisLine: {
            lineStyle: {
              show: true,
              width: 2,
              color: [
                [10, '#314376']
              ]
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
          pointer: {
            show: true,
            length: '73%',
            width: 2 //指针粗细
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
                [50, '#F6E594']
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
            show: false
          },
          'title': {
            color: '#fff',
            'fontSize': 10,
            'offsetCenter': [0, '60%']
          }, 
          'data': [{
            'value': value
          }],
          pointer: {
            show: false
          }
        },
        { //内圆
          type: 'pie',
          radius: '45%',
          center: ['50%', '50%'],
          z: 1,
          itemStyle: {
            normal: {
              color: new echarts.graphic.RadialGradient(.5, .5, .8, [{
                offset: 0,
                color: '#2B386A'
              },
              {
                offset: .5,
                color: '#2B386A'
              },
              {
                offset: 1,
                color: '#3F4A9A'
              }
              ], false),
              label: {
                show: false
              },
              labelLine: {
                show: false
              }
            }
          },
          hoverAnimation: false,
          label: {
            show: false
          },
          tooltip: {
            show: false
          },
          data: [100],
          animationType: 'scale'
        }
        
      ]
    }
    return (
      <ReactEcharts 
        {...rest} 
        option={this.option} 
        notMerge 
        className={`${this.props.className} gauge1Chart`}
      />
    )
  }
}
