import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function getLiquidFill(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      series: [{
        type: 'liquidFill',
        radius: '50%',
        outline: {
          borderDistance: 5,
          itemStyle: {
            color: 'none',
            borderWidth: 4,
            borderColor: '#008EFD',
            shadowColor: '#008EFD',
            shadowBlur: 5
          }
        },
        data: [{
          value: 0.6,
          itemStyle: {
            color: '#008EFD',
            opacity: 0.6
          },
          label: {
            normal: {
              show: true
            },
            emphasis: {
              show: true
            }
          },
          labelLine: {
            normal: {
              show: true
            },
            emphasis: {
              show: true
            }
          }
        }],
        backgroundStyle: {
          borderWidth: 0,
          borderColor: '#E3F7FF',
          color: '#E3F7FF'
        },
        label: {
          formatter: function (param) {
            return '样例' + '\n\n' + param.value + '%'
          },
          fontSize: '12',
          itemStyle: {
            emphasis: {
              shadowBlur: 0,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      }]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '整体样式',
      type: 'editorGroup',
      name: 'wholeRadius',
      addable: false,
      items: [
        new StyleItem(commonStyleItem.radius, {
          title: '半径',
          name: 'wholeRadius',
          value: parseFloat(_.get(styleConfig, 'series[0].radius', '50%')) / 100.0,
          onChange(v) {
            updateFn('series[0].radius', prev => `${v * 100}%`)
          }
        }),
        new StyleItem({
          title: '位置', name: 'position', type: 'editorGroup', items: [
            new StyleItem(commonStyleItem.radius, {
              title: '水平位置',
              name: 'x',
              value: parseFloat(_.get(styleConfig, 'series[0].center[0]', '50%')) / 100.0,
              onChange(v) {
                updateFn('series[0].center', prev => [`${v * 100}%`, prev ? prev[1] : '50%'])
              }
            }),
            new StyleItem(commonStyleItem.radius, {
              title: '垂直位置',
              name: 'y',
              value: parseFloat(_.get(styleConfig, 'series[0].center[1]', '50%')) / 100.0,
              onChange(v) {
                updateFn('series[0].center', prev => [prev ? prev[0] : '50%', `${v * 100}%`])
              }
            })
          ]
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'series[0].label.fontSize', '12') + '',
          onChange: function (fontSize) {
            updateFn('series[0].label.fontSize', () => parseInt(fontSize))
          }
        })
      ]
    }),
    new StyleItem({
      title: '外圈样式',
      type: 'editorGroup',
      name: 'outerlineStyle',
      addable: false,
      items: [
        new StyleItem({
          title: '外圈颜色',
          name: 'outline-borderColor',
          type: 'color',
          value: _.get(styleConfig, 'series[0].outline.itemStyle.borderColor', '#294D99'),
          onChange(v) {
            updateFn('series[0].outline.itemStyle.borderColor', () => v)
          }
        }),
        new StyleItem({
          title: '外圈宽度',
          name: 'outline-borderWidth',
          type: 'slider',
          value: _.get(styleConfig, 'series[0].outline.itemStyle.borderWidth', 5),
          onChange(v) {
            updateFn('series[0].outline.itemStyle.borderWidth', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '内圈样式',
      type: 'editorGroup',
      name: 'backgroundStyle',
      addable: false,
      items: [
        new StyleItem({
          title: '内圈颜色',
          name: 'backgroundStyle-borderColor',
          type: 'color',
          value: _.get(styleConfig, 'series[0].backgroundStyle.borderColor'),
          onChange(v) {
            updateFn('series[0].backgroundStyle.borderColor', () => v)
          }
        }),
        new StyleItem({
          title: '内圈宽度',
          name: 'backgroundStyle-borderWidth',
          type: 'slider',
          value: _.get(styleConfig, 'series[0].backgroundStyle.borderWidth', 0),
          onChange(v) {
            updateFn('series[0].backgroundStyle.borderWidth', () => v)
          }
        }),
        new StyleItem({
          title: '背景颜色',
          name: 'backgroundStyle-backgroundColor',
          type: 'color',
          value: _.get(styleConfig, 'series[0].backgroundStyle.color', '#E3F7FF'),
          onChange(v) {
            updateFn('series[0].backgroundStyle.color', () => v)
          }
        }),
        new StyleItem({
          title: '波浪颜色',
          name: 'wave-color',
          type: 'color',
          value: _.get(styleConfig, 'series[0].data[0].itemStyle.color', '#294D99'),
          onChange(v) {
            updateFn('series[0].data[0].itemStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.radius,{
          title: '波浪透明度',
          name: 'wave-opacity',
          type: 'slider',
          value: _.get(styleConfig, 'series[0].data[0].itemStyle.opacity', '0.6'),
          onChange(v) {
            updateFn('series[0].data[0].itemStyle.opacity', () => v)
          }
        })
      ]
    })
  ]
}
