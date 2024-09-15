import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getDistBar(styleConfig, updateFn) {
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
        barWidth: '40%',
        itemStyle: {
          barBorderRadius: [0,0,0,0]
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
            }),
            new StyleItem(commonStyleItem.fontSize, {
              title: '圆角(px)',
              name: 'barRadius',
              min: 1,
              max: 100,
              value: parseFloat(_.get(styleConfig, 'series[0].itemStyle.barBorderRadius.1', 0)),
              onChange(v) {
                updateFn('series[0].itemStyle.barBorderRadius', () => [v, v, 0, 0])
              }
            })
          ]
        }),
        new StyleItem({
          title: '折线样式',
          name: 'line',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.lineStyle, {
              title: '线条样式',
              name: 'lineStyle',
              value: _.get(styleConfig, 'series[1].lineStyle.normal.type', 'solid'),
              onChange(v) {
                updateFn('series[1].lineStyle.normal.type', () => v)
              }
            }),
            new StyleItem({
              title: '折线粗细',
              name: 'lineWidth',
              type: 'number',
              min: 1,
              value: _.get(styleConfig, 'series[1].lineStyle.normal.width', 2),
              onChange(v) {
                updateFn('series[1].lineStyle.normal.width', () => v)
              }
            }),
            new StyleItem({
              title: '平滑折线',
              name: 'smooth',
              type: 'checkbox',
              checked: _.get(styleConfig, 'series[1].smooth', true),
              onChange: (e) => {
                const checked = e.target.checked
                updateFn('series[0].smooth', () => checked)
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
        new StyleItem({
          title: '圆点',
          name: 'dot',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[1].showSymbol', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[1].showSymbol', () => checked)
          },
          items: _.get(styleConfig, 'series[1].showSymbol', true) ? [
            // new StyleItem({
            //   title: '形状',
            //   name: 'symbol',
            //   type: 'select',
            //   options: [
            //     { key: 'emptyCircle', value: '空圆点'},
            //     { key: 'circle', value: '圆点'},
            //     { key: 'rect', value: '长方'},
            //     { key: 'roundRect', value: '圆长方'},
            //     { key: 'triangle', value: '三角形'},
            //     { key: 'diamond', value: '钻石'},
            //     { key: 'pin', value: '针'},
            //     { key: 'arrow', value: '箭头'}
            //   ],
            //   value: _.get(styleConfig, 'series[0].symbol', 'emptyCircle'),
            //   onChange(v) {
            //     updateFn('series[0].symbol', () => v)
            //   }
            // }),
            new StyleItem(commonStyleItem.radius, {
              type: 'slider',
              min: 1,
              max: 100,
              value: _.get(styleConfig, 'series[0].symbolSize', 10),
              onChange(v) {
                updateFn('series[0].symbolSize', () => v)
              }
            }),
            new StyleItem({
              title: '颜色',
              name: 'symbolColor',
              type: 'color',
              value: _.get(styleConfig, 'series[1].itemStyle.normal.color', '#00bde1'),
              onChange(v) {
                updateFn('series[1].itemStyle.normal.color', () => v)
              }
            })
          ]: []
        }),
        commonStyleItem.getColorItem(styleConfig, updateFn),
        new StyleItem({
          title: '柱状数据标签',
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
                  },
                  onChangeDebounce: 500
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
        }),
        new StyleItem({
          title: '折线数据标签',
          name: 'dataDisplay',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[1].label.normal.show', false),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[1].label.normal.show', () => checked)
          },
          items:  _.get(styleConfig, 'series[1].label.normal.show', true) ? [
            new StyleItem({
              title: '位置',
              name: 'position',
              type: 'select',
              value: _.get(styleConfig, 'series[1].label.normal.position', 'top'),
              onChange(v) {
                updateFn('series[1].label.normal.position', () => v)
              },
              options: [
                { key: 'top', value: '上'},
                { key: 'left', value: '左'},
                { key: 'right', value: '右'},
                { key: 'bottom', value: '下'},
                { key: 'inside', value: '里面'},
                { key: 'insideLeft', value: '左(圆点里面)'},
                { key: 'insideRight', value: '右(圆点里面)'},
                { key: 'insideTop', value: '上(圆点里面)'},
                { key: 'insideBottom', value: '下(圆点里面)'},
                { key: 'insideTopLeft', value: '左上(圆点里面)'},
                { key: 'insideBottomLeft', value: '左下(圆点里面)'},
                { key: 'insideTopRight', value: '右上(圆点里面)'},
                { key: 'insideBottomRight', value: '右下(圆点里面)'}
              ]
            }),
            new StyleItem(commonStyleItem.fontSize, {
              value: _.get(styleConfig, 'series[1].label.normal.textStyle.fontSize', '12'),
              onChange(v) {
                updateFn('series[1].label.normal.textStyle.fontSize', () => v)
              }
            }),
            new StyleItem(commonStyleItem.color, {
              title: '颜色',
              name: 'fontColor',
              value: _.get(styleConfig, 'series[1].label.normal.textStyle.color', '#fff'),
              onChange(v) {
                updateFn('series[1].label.normal.textStyle.color', () => v)
              }
            })
          ] : []
        })
      ]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn),
    commonStyleItem.getxAxisItem(styleConfig, updateFn),
    commonStyleItem.getyAxisItem(styleConfig, updateFn)
  ]
}
