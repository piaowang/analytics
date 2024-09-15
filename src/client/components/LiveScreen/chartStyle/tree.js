import _ from 'lodash'
import StyleItem from '../models/styleItem'
import commonStyleItem from './common'
import EchartBaseOptions from '../../../common/echart-base-options'
import {immutateUpdates} from '../../../../common/sugo-utils'

export default function genStyleItems(styleConfig, updateFn) {
  if(_.isEmpty(styleConfig)) {
    const defaultStyle = {
      _reactKey: 0,
      grid: {
        top:30,
        left:30
      },
      series: [{
        symbol: 'circle',
        symbolSize: 7,
        label: {
          normal: {
            position: 'left',
            show: true,
            fontSize: 12,
            color: '#ffffff'
          }
        },
        leaves: {
          label: {
            normal: {
              position: 'right'
            }
          }
        },
        itemStyle: {
          color: '#fff',
          borderWidth: 0
        },
        lineStyle: {
          color: '#ccc',
          width: 1.5
        }
      }]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '基础样式',
      name: 'title',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '连线',
          name: 'line',
          type: 'editorGroup',
          items: [
            new StyleItem({
              title: '连线颜色',
              name: 'lineColor',
              type: 'color',
              value: _.get(styleConfig, 'series[0].lineStyle.color', '#ccc'),
              onChangeDebounce: 500,
              onChange(v) {
                updateFn('', s => immutateUpdates(s,
                  'series[0].lineStyle.color', () => v,
                  '_reactKey', k => k + 1))
              }
            }),
            new StyleItem({
              title: '连线粗细',
              name: 'lineWidth',
              type: 'numberDebounced',
              min: 1,
              value: _.get(styleConfig, 'series[0].lineStyle.width', 1.5),
              onChange(v) {
                updateFn('', s => immutateUpdates(s,
                  'series[0].lineStyle.width', () => v,
                  '_reactKey', k => k + 1))
              }
            })
          ]
        }),
        new StyleItem({
          title: '圆点',
          name: 'dot',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.radius, {
              type: 'slider',
              min: 1,
              max: 100,
              value: _.get(styleConfig, 'series[0].symbolSize', 7),
              onChange(v) {
                updateFn('series[0].symbolSize', () => v)
              }
            }),
            new StyleItem({
              title: '颜色',
              name: 'symbolColor',
              type: 'color',
              value: _.get(styleConfig, 'series[0].itemStyle.color', EchartBaseOptions.color[0]),
              onChange(v) {
                updateFn('series[0].itemStyle.color', () => v)
              }
            }),
            new StyleItem({
              title: '数据标签',
              name: 'dataDisplay',
              type: 'editorGroup',
              hidable: true,
              checked: _.get(styleConfig, 'series[0].label.normal.show', true),
              onChangeVisible: (e) => {
                e.stopPropagation()
                const checked = e.target.checked
                updateFn('series[0].label.normal.show', () => checked)
              },
              items: !_.get(styleConfig, 'series[0].label.normal.show', true) ? [] : [
                new StyleItem({
                  title: '位置',
                  name: 'position',
                  type: 'select',
                  value: _.get(styleConfig, 'series[0].label.normal.position', 'top'),
                  onChange(v) {
                    updateFn('series[0].label.normal.position', () => v)
                  },
                  options: [
                    {key: 'top', value: '上'},
                    {key: 'left', value: '左'},
                    {key: 'right', value: '右'},
                    {key: 'bottom', value: '下'},
                    {key: 'inside', value: '里面'},
                    {key: 'insideLeft', value: '左(圆点里面)'},
                    {key: 'insideRight', value: '右(圆点里面)'},
                    {key: 'insideTop', value: '上(圆点里面)'},
                    {key: 'insideBottom', value: '下(圆点里面)'},
                    {key: 'insideTopLeft', value: '左上(圆点里面)'},
                    {key: 'insideBottomLeft', value: '左下(圆点里面)'},
                    {key: 'insideTopRight', value: '右上(圆点里面)'},
                    {key: 'insideBottomRight', value: '右下(圆点里面)'}
                  ]
                }),
                new StyleItem(commonStyleItem.fontSize, {
                  value: _.get(styleConfig, 'series[0].label.normal.fontSize', '12'),
                  onChange(v) {
                    updateFn('series[0].label.normal.fontSize', () => v)
                  }
                }),
                new StyleItem(commonStyleItem.color, {
                  title: '颜色',
                  name: 'fontColor',
                  value: _.get(styleConfig, 'series[0].label.normal.color', '#fff'),
                  onChange(v) {
                    updateFn('series[0].label.normal.color', () => v)
                  }
                })
              ]
            }),
            new StyleItem({
              title: '叶子数据标签',
              name: 'leavesDataDisplay',
              type: 'editorGroup',
              hidable: true,
              checked: _.get(styleConfig, 'series[0].leaves.label.normal.show', true),
              onChangeVisible: (e) => {
                e.stopPropagation()
                const checked = e.target.checked
                updateFn('series[0].leaves.label.normal.show', () => checked)
              },
              items: !_.get(styleConfig, 'series[0].leaves.label.normal.show', true) ? [] : [
                new StyleItem({
                  title: '位置',
                  name: 'position',
                  type: 'select',
                  value: _.get(styleConfig, 'series[0].leaves.label.normal.position', 'top'),
                  onChange(v) {
                    updateFn('series[0].leaves.label.normal.position', () => v)
                  },
                  options: [
                    {key: 'top', value: '上'},
                    {key: 'left', value: '左'},
                    {key: 'right', value: '右'},
                    {key: 'bottom', value: '下'},
                    {key: 'inside', value: '里面'},
                    {key: 'insideLeft', value: '左(圆点里面)'},
                    {key: 'insideRight', value: '右(圆点里面)'},
                    {key: 'insideTop', value: '上(圆点里面)'},
                    {key: 'insideBottom', value: '下(圆点里面)'},
                    {key: 'insideTopLeft', value: '左上(圆点里面)'},
                    {key: 'insideBottomLeft', value: '左下(圆点里面)'},
                    {key: 'insideTopRight', value: '右上(圆点里面)'},
                    {key: 'insideBottomRight', value: '右下(圆点里面)'}
                  ]
                }),
                new StyleItem(commonStyleItem.fontSize, {
                  value: _.get(styleConfig, 'series[0].leaves.label.normal.fontSize', _.get(styleConfig, 'series[0].label.normal.fontSize', '12')),
                  onChange(v) {
                    updateFn('series[0].leaves.label.normal.fontSize', () => v)
                  }
                }),
                new StyleItem(commonStyleItem.color, {
                  title: '颜色',
                  name: 'fontColor',
                  value: _.get(styleConfig, 'series[0].leaves.label.normal.color', _.get(styleConfig, 'series[0].label.normal.color', '#fff')),
                  onChange(v) {
                    updateFn('series[0].leaves.label.normal.color', () => v)
                  }
                })
              ]
            })
          ]
        })
      ]
    })
  ]
}
