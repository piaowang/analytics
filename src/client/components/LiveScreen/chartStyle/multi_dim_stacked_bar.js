import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getBarStyle(styleConfig, updateFn, dimensions = []) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: ['#00bde1', '#8e47e7', '#ff5f74', '#fcc04e'],
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
        top: '30',
        left: '0'
      },
      xAxis: { 
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            color: '#fff'
          }
        },
        axisLabel: {
          show: true,
          textStyle: {
            color: '#fff',
            fontSize: '12'
          },
          rotate: '0'
        }
      },
      yAxis: {
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#fff'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#fff'
          }
        },
        axisLabel: {
          show: true,
          textStyle: {
            color: '#fff',
            fontSize: '12'
          }
        }
      },
      series: [{
        type: 'bar',
        barWidth: 10
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
          title: '柱子样式',
          name:'style1',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.radius, {
              title: '柱子宽度',
              name: 'barPadding',
              min: 1,
              max: 100,
              value: parseFloat(_.get(styleConfig, 'series[0].barWidth', 10)),
              onChange(v) {
                updateFn('series[0]', (s0) => {
                  return {
                    ...s0,
                    barWidth: v,
                    barMaxWidth: 100
                  }
                })
              }
            })
          ]
        }),
        new StyleItem({
          title: '网格右边位置',
          name: 'gridRight',
          type: 'number',
          min: 1,
          max: 100,
          value: _.get(styleConfig, 'grid.right', 20),
          onChange(v) {
            updateFn('grid.right', () => v)
          }
        }),
        commonStyleItem.getColorItem(styleConfig, updateFn),
        new StyleItem({
          title: '数据标签',
          name: 'dataDisplay',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[0].label.normal.show', false),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0].label.normal.show', () => checked)
          },
          items: _.get(styleConfig, 'series[0].label.normal.show', false) ? [
            new StyleItem({
              title: '位置',
              name: 'position',
              type: 'select',
              value: _.get(styleConfig, 'series[0].label.normal.position', 'inside'),
              onChange(v) {
                updateFn('series[0].label.normal.position', () => v)
              },
              options: [
                { key: 'top', value: '上'},
                { key: 'left', value: '左'},
                { key: 'right', value: '右'},
                { key: 'bottom', value: '下'},
                { key: 'inside', value: '柱子里面'},
                { key: 'insideLeft', value: '左(柱子里面)'},
                { key: 'insideRight', value: '右(柱子里面)'},
                { key: 'insideTop', value: '上(柱子里面)'},
                { key: 'insideBottom', value: '下(柱子里面)'},
                { key: 'insideTopLeft', value: '左上(柱子里面)'},
                { key: 'insideBottomLeft', value: '左下(柱子里面)'},
                { key: 'insideTopRight', value: '右上(柱子里面)'},
                { key: 'insideBottomRight', value: '右下(柱子里面)'}
              ]
            }),
            new StyleItem({ 
              title: '文本',
              name: 'text',
              type: 'editorGroup',
              items: [
                new StyleItem(commonStyleItem.fontSize, {
                  value: _.get(styleConfig, 'series[0].label.normal.textStyle.fontSize', '12'),
                  onChange(v) {
                    updateFn('series[0].label.normal.textStyle.fontSize', () => v)
                  }
                }),
                new StyleItem(commonStyleItem.color, {
                  title: '颜色',
                  name: 'fontColor',
                  value: _.get(styleConfig, 'series[0].label.normal.textStyle.color', '#fff'),
                  onChange(v) {
                    updateFn('series[0].label.normal.textStyle.color', () => v)
                  }
                })
              ]
            })
          ] : []
        })]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn),
    commonStyleItem.getxAxisItem(styleConfig, updateFn),
    commonStyleItem.getyAxisItem(styleConfig, updateFn)
  ]
}
