import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function getChord(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: [
        '#2DA3FB', '#66D99E', '#FFD200', '#FA424A',
        '#AE77EF', '#fc6e51', '#a0d468', '#ec87c0'
      ],
      'legend':{
        show: false,
        textStyle: {
          color: '#fff',
          fontSize: 12
        }
      },
      series: [{
        'lineStyle':{
          'normal':{
            'color':'#fff',
            'width':6,
            'type':'solid',
            'opacity':0.2,
            'curveness':0.3
          }
        }
      }]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '位置', name: 'position', type: 'editorGroup', items: [
        new StyleItem(commonStyleItem.radius, {
          title: '水平位置',
          name: 'x',
          value: parseFloat(_.get(styleConfig, 'series[0].left', '50%')) / 100.0,
          onChange(v) {
            updateFn('series[0].left', prev => `${v * 100}%`)
          }
        }),
        new StyleItem(commonStyleItem.radius, {
          title: '垂直位置',
          name: 'y',
          value: parseFloat(_.get(styleConfig, 'series[0].top', '10%')) / 100.0,
          onChange(v) {
            updateFn('series[0].top', prev => `${v * 100}%`)
          }
        })
      ]
    }),
    new StyleItem({
      title: '线条样式', name: 'lineStyle', type: 'editorGroup', items: [
        new StyleItem({
          title: '线型颜色',
          name: 'color',
          type: 'color',
          value: _.get(styleConfig, 'series[0].lineStyle.normal.color', '#e53935'),
          onChange(v) {
            updateFn('series[0].lineStyle.normal.color', () => v )
          }
        }),
        new StyleItem({
          title: '线型宽度',
          name: 'lineWidth',
          type: 'number',
          min: 1,
          value: _.get(styleConfig, 'series[0].lineStyle.normal.width', 2),
          onChange(v) {
            updateFn('series[0].lineStyle.normal.width', () => v)
          }
        })
      ]
    }),
    new StyleItem(commonStyleItem.fontSize, {
      value: _.get(styleConfig, 'series[0].label.normal.fontSize.', '18') + '',
      onChange: function (fontSize) {
        updateFn('series[0].label.normal.fontSize', () => ~~fontSize)
      }
    }),
    commonStyleItem.getColorItem(styleConfig, updateFn),
    commonStyleItem.getLegendItem(styleConfig, updateFn)
  ]
}
