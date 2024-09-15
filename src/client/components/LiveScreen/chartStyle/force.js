import _ from 'lodash'
import StyleItem from '../models/styleItem'
import {immutateUpdates} from '../../../../common/sugo-utils'
import commonStyleItem from './common'
import EchartBaseOptions from '../../../common/echart-base-options'

export default function genStyleItems(styleConfig, updateFn) {
  if(_.isEmpty(styleConfig)) {
    const defaultStyle = {
      _reactKey: 0,
      color: EchartBaseOptions.color,
      legend: {
        show: true,
        left: 'center',
        top: 'top',
        textStyle: {
          color: '#fff',
          fontSize: '12'
        }
      },
      grid: {
        top:30
      },
      series: [
        {
          lineStyle: {
            color: '#fff',
            width: 1
          },
          force: {
            repulsion: 120,
            edgeLength: 60,
            gravity: 0.1
          },
          draggable: true
        }
      ]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '全局样式',
      name: 'title',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '力导图参数',
          name: 'force',
          type: 'editorGroup',
          items: [
            new StyleItem({
              title: '斥力',
              name: 'repulsion',
              type: 'number',
              value: _.get(styleConfig, 'series[0].force.repulsion', 120),
              onChange(v) { updateFn('series[0].force.repulsion', () => v) }
            }),
            new StyleItem({
              title: '重力',
              name: 'gravity',
              step: 0.1,
              type: 'number',
              value: _.get(styleConfig, 'series[0].force.gravity', 0.1),
              onChange(v) { updateFn('series[0].force.gravity', () => v) }
            }),
            new StyleItem({
              title: '边长',
              name: 'edgeLength',
              type: 'number',
              value: _.get(styleConfig, 'series[0].force.edgeLength', 60),
              onChange(v) { updateFn('series[0].force.edgeLength', () => v) }
            }),
            new StyleItem({
              title: '可否拖拽',
              name: 'draggable',
              type: 'editorGroup',
              hidable: true,
              checked: _.get(styleConfig, 'series[0].draggable', true),
              onChangeVisible(e) {
                e.stopPropagation()
                const checked = e.target.checked
                updateFn('series[0].draggable', () => checked)
              }
            })
          ]
        }),
        new StyleItem({
          title: '颜色',
          name: 'legends',
          type: 'editorGroup',
          items: [
            new StyleItem({
              title: '颜色 1',
              name: 'legendColor1',
              type: 'color',
              value: _.get(styleConfig, 'color[0]', EchartBaseOptions.color[0]),
              onChange(v) { updateFn('color[0]', () => v) }
            }),
            new StyleItem({
              title: '颜色 2',
              name: 'legendColor2',
              type: 'color',
              value: _.get(styleConfig, 'color[1]', EchartBaseOptions.color[1]),
              onChange(v) { updateFn('color[1]', () => v) }
            }),
            new StyleItem({
              title: '颜色 3',
              name: 'legendColor3',
              type: 'color',
              value: _.get(styleConfig, 'color[2]', EchartBaseOptions.color[2]),
              onChange(v) { updateFn('color[2]', () => v) }
            }),
            new StyleItem({
              title: '颜色 4',
              name: 'legendColor4',
              type: 'color',
              value: _.get(styleConfig, 'color[3]', EchartBaseOptions.color[3]),
              onChange(v) { updateFn('color[3]', () => v) }
            })
          ]
        }),
        new StyleItem({
          title: '连线',
          name: 'line',
          type: 'editorGroup',
          items: [
            new StyleItem({
              title: '连线颜色',
              name: 'lineColor',
              type: 'color',
              value: _.get(styleConfig, 'series[0].lineStyle.color', '#fff'),
              onChange(v) {
                updateFn('series[0].lineStyle.color', () => v)
              }
            }),
            new StyleItem({
              title: '连线粗细',
              name: 'lineWidth',
              type: 'number',
              min: 1,
              value: _.get(styleConfig, 'series[0].lineStyle.width', 1),
              onChange(v) {
                updateFn('series[0].lineStyle.width', () => v)
              }
            })
          ]
        })
      ]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn)
  ]
}
