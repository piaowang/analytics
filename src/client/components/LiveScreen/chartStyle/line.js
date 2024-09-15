import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import echarts from 'echarts'
import _ from 'lodash'

export default function getLine(styleConfig, updateFn) {
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
        top: '40',
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
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: {
          normal: {
            color: '#fff'
          }
        },
        areaStyle: {
          normal: {
            // _colorType: 1,
            color: {
              type: "linear",
              x: 0,
              x2: 0,
              y: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color:'rgba(147, 235, 248,1)' },
                { offset: 1, color: '#00BAF74c' }
              ],
              globalCoord: false
            }
          }          
        },
        label: {
          normal: {
            show: true,
            position: 'top',
            textStyle: {
              color: '#fff',
              fontSize: '12'
            }
          }
        }
      }]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }

  let areaColor = _.get(styleConfig, 'series[0].areaStyle.normal.color', undefined)
  areaColor = areaColor
    ? (_.isObject(areaColor) ? areaColor.colorStops.map(p => p.color) : areaColor)
    : ["#fff", "#fff"]
  return [
    new StyleItem({
      title: '基础样式',
      name: 'title',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '折线样式',
          name: 'line',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.lineStyle, {
              title: '线条样式',
              name: 'lineStyle',
              value: _.get(styleConfig, 'series[0].lineStyle.normal.type', 'solid'),
              onChange(v) {
                updateFn('series[0].lineStyle.normal.type', () => v)
              }
            }),
            new StyleItem({
              title: '折线粗细',
              name: 'lineWidth',
              type: 'number',
              min: 1,
              value: _.get(styleConfig, 'series[0].lineStyle.normal.width', 2),
              onChange(v) {
                updateFn('series[0].lineStyle.normal.width', () => v)
              }
            }),
            new StyleItem({
              title: '平滑折线',
              name: 'smooth',
              type: 'checkbox',
              checked: _.get(styleConfig, 'series[0].smooth', true),
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
        commonStyleItem.getColorItem(styleConfig, updateFn),
        new StyleItem({
          title: '区域',
          name: 'area',
          type: 'editorGroup',
          hidable: true,
          checked: !_.isEmpty(_.get(styleConfig, 'series[0].areaStyle.normal.color')) && _.get(styleConfig, 'series[0].areaStyle.normal.color') !== 'transparent',
          onChangeVisible(e) {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0].areaStyle.normal', () => checked ? ({ color: '#fff' }) : {color: 'transparent'} )
          },
          items: _.isEmpty(_.get(styleConfig, 'series[0].areaStyle.normal.color')) || _.get(styleConfig, 'series[0].areaStyle.normal.color') === 'transparent'
            ? []
            : [
              new StyleItem({
                title: '颜色',
                name: 'areaColor',
                type: 'advanceColor',
                value:areaColor,
                onChange(v) {
                  updateFn('series[0].areaStyle.normal.color', () => {
                    return _.isArray(v) 
                    ? {
                      type: 'linear',
                      x: 0,
                      x2:0, 
                      y: 0,
                      y2:1,
                      colorStops: [
                        { offset: 0, color: _.get(v, '0', 'rgba(147, 235, 248, 0)') },
                        { offset: 1, color: _.get(v, '1', '#00BAF74c') }
                      ],
                      globalCoord: false
                    }
                    : v
                  })
                }
              })
            ]
        }),
        new StyleItem({
          title: '圆点',
          name: 'dot',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[0].showSymbol', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0].showSymbol', () => checked)
          },
          items: _.get(styleConfig, 'series[0].showSymbol', true) ? [
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
              value: _.get(styleConfig, 'series[0].itemStyle.normal.color', '#00bde1'),
              onChange(v) {
                updateFn('series[0].itemStyle.normal.color', () => v)
              }
            }),
            // new StyleItem(commonStyleItem.color, {
            //   title: '颜色', 
            //   name: 'symbolColor',
            //   value: _.get(styleConfig, 'series[0].label.normal.textStyle.color', '#00bde1'),
            //   onChange(v) {
            //     updateFn('series[0].label.normal.textStyle.color', () => v)
            //   }
            // })
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
              items:  _.get(styleConfig, 'series[0].label.normal.show', true) ? [
                new StyleItem({
                  title: '位置',
                  name: 'position',
                  type: 'select',
                  value: _.get(styleConfig, 'series[0].label.normal.position', 'top'),
                  onChange(v) {
                    updateFn('series[0].label.normal.position', () => v)
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
              ] : []
            })
          ]: []
        })
      ]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn),
    commonStyleItem.getxAxisItem(styleConfig, updateFn),
    commonStyleItem.getyAxisItem(styleConfig, updateFn)
  ]
}
