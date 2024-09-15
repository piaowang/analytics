import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function getGauge(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
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
              color: [[1,'#4d5bd1']] 
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
              'color':[[1,'#646BFA']],
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
              'color': [[1,'#F6E594']],
              'width': 6
            }
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
          pointer: {
            show: false,
            length: '75%',
            width: 20 //指针粗细
          }
        }
      ]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '图形颜色',
      type: 'editorGroup',
      name: 'graphColor',
      addable: false,
      items: [
        new StyleItem({
          title: '刻度颜色',
          name: 'splitLine-color',
          type: 'color',
          value: _.get(styleConfig, 'series[0].splitLine.lineStyle.color', '#00C1DE'),
          onChange: (color) => updateFn('series', prev => immutateUpdate(prev, '[0].splitLine.lineStyle.color', () => color))

        })
      ]
    }),
    new StyleItem({
      title: '目标值',
      type: 'editorGroup',
      name: 'number',
      addable: false,
      items: [
        new StyleItem({
          title: '内圈目标值',
          name: 'data0',
          type: 'number',
          value: _.get(styleConfig, 'target.data0', 90),
          onChange(v) {
            updateFn('target.data0', () => v)
          }
        }),
        new StyleItem({
          title: '外圈目标值',
          name: 'data1',
          type: 'number',
          value: _.get(styleConfig, 'target.data1', 90),
          onChange(v) {
            updateFn('target.data1', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '仪表盘刻度',
      name: 'gauge-calibration',
      type: 'editorGroup',
      hidable: true,
      items: [
        new StyleItem({
          title: '最大刻度值',
          name: 'calibration',
          type: 'numberStep10',
          min:0,
          value: _.get(styleConfig, 'series[0].max', 160),
          onChange(v) {
            updateFn('series[0]', () => ({...styleConfig.series[0],max:v,splitNumber: v/10}))
          }
        }),
        new StyleItem({
          title: '刻度标签',
          name: 'axisLabel',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[0].axisLabel.show', true),
          onChangeVisible: function (e) {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0].axisLabel.show', () => checked)
          },
          items: [
            new StyleItem({
              title: '文字颜色',
              name: 'axisLabel-color',
              type: 'color',
              value: _.get(styleConfig, 'series[0].axisLabel.color', '#00C1DE'),
              onChange(v) {
                updateFn('series[0].axisLabel.color', () => v)
              }
            }),
            new StyleItem(commonStyleItem.fontSize, {
              value: _.get(styleConfig, 'series[0].axisLabel.fontSize', '12') + '',
              onChange: function (fontSize) {
                updateFn('series[0].axisLabel.fontSize', () => fontSize)
              }
            })
          ]
        })
      ]
    })
  ]
}
