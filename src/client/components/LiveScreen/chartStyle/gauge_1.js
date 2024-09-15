import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function getGauge(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      title: [
        {
          show: false,
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
          name: '指针',
          type: 'gauge',
          title: {
            show: false
          },
          detail: {
            show: false
          },
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
                [1, '#F6E594']
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
          pointer: {
            show: false
          }
        },  
        { //内圆
          type: 'pie',
          radius: '45%',
          center: ['50%', '50%'],
          z: 1,
          hoverAnimation: false,
          label: {
            show: false
          },
          tooltip: {
            show: false
          },
          animationType: 'scale',
          startAngle: 225,
          data:[{
            value: 100
          }]
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

        }),
        new StyleItem({
          title: '指针颜色',
          name: 'pointer-color',
          type: 'color',
          value: _.get(styleConfig, 'series[1].itemStyle.color', '#00C1DE'),
          onChange: (color) => updateFn('series', prev => immutateUpdate(prev, '[1].itemStyle.color', () => color))
        })
      ]
    }),
    new StyleItem({
      title: '指针',
      type: 'editorGroup',
      name: 'pointer',
      addable: false,
      items: [
        new StyleItem({
          title: '指针大小',
          name: 'pointerWidth',
          type: 'number',
          min:0,
          value: _.get(styleConfig, 'series[1].pointer.width', 2),
          onChange(v) {
            updateFn('series[1].pointer.width', () => v)
          }
        }),
        new StyleItem({
          title: '指针长度（%）',
          name: 'pointerLength',
          type: 'number',
          min:0,
          value: _.get(styleConfig, 'series[1].pointer.length', 73),
          onChange(v) {
            updateFn('series[1].pointer.length', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '数值',
      name: 'title',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'title[0].show', false),
      onChangeVisible: function (e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('title[0].show', () => checked)
      },
      items: [
        new StyleItem({
          title: '数值颜色',
          name: 'title-color',
          type: 'color',
          value: _.get(styleConfig, 'title[0].textStyle.color', '#00C1DE'),
          onChange(v) {
            updateFn('title[0].textStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          name:'title-fontSize',
          title:'数值大小',
          value: _.get(styleConfig, 'title[0].textStyle.fontSize', 12),
          onChange: function (fontSize) {
            updateFn('title[0].textStyle.fontSize', () => fontSize)
          }
        }),
        new StyleItem({
          title: '数值垂直位置（%）',
          name: 'pointerLength',
          type: 'number',
          value: _.get(styleConfig, 'title[0].top', '58%').split('%')[0],
          onChange(v) {
            updateFn('title[0].top', () => v+'%')
          }
        })
      ]
    }),
    new StyleItem({
      title: '自定义数值',
      type: 'editorGroup',
      name: 'customNumber',
      addable: false,
      items: [
        new StyleItem({
          title: '目标值',
          name: 'target',
          type: 'number',
          value: _.get(styleConfig, 'target.data1', 90),
          onChange(v) {
            updateFn('target.data1', () => v)
          }
        }),
        new StyleItem({
          title: '告警值',
          name: 'warning',
          type: 'number',
          value: _.get(styleConfig, 'target.warning', 80),
          onChange(v) {
            updateFn('target.warning', () => v)
          }
        }),
        new StyleItem({
          title: '告警颜色',
          name: 'warningColor',
          type: 'color',
          value: _.get(styleConfig, 'target.warningColor', 'red'),
          onChange(v) {
            updateFn('target.warningColor', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '仪表盘刻度',
      name: 'gauge-calibration',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '最大刻度值',
          name: 'calibration',
          type: 'numberStep10',
          min:0,
          value: _.get(styleConfig, 'series[0].max', 160),
          onChange(v) {
            updateFn('series[0]', () => ({...styleConfig.series[0],max:v}))
          }
        }),
        new StyleItem({
          title: '刻度间隔数量',
          name: 'calibration-interval',
          type: 'number',
          min:0,
          value: _.get(styleConfig, 'series[0].splitNumber', 16),
          onChange(v) {
            updateFn('series[0].splitNumber', () => v)
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
