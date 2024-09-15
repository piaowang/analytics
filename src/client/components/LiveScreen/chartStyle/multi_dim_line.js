import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import {immutateUpdates, remove} from '../../../../common/sugo-utils'
import echarts from 'echarts'
import _ from 'lodash'

export default function getDistBar(styleConfig, updateFn, dimensions, metrics, tempMetricDict, measureList, accessData) {
  const color = ['#00bde1', '#8e47e7', '#ff5f74', '#fcc04e']
  let newAccessData=_.isEmpty(accessData) ? [] : JSON.parse(accessData)
  newAccessData = _.uniq(newAccessData.map(item => item[dimensions[0]]))
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      eachLineSelect: '',
      tooltip: {
        show: true
      },
      color,
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
        top: 30,
        bottom:0,
        left:20,
        right: 20
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
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 10,
        areaStyle: {
          normal: {
            color: new echarts.graphic.LinearGradient( 0, 0, 0, 1, [{
              offset: 0,
              color: '#fff'
            }, {
              offset: 1,
              color: '#fff'
            }])
          }
        }
      },{
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 10
      }]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  let areaColor = _.get(styleConfig, 'series[0].areaStyle.normal.color', undefined)
  areaColor = areaColor
    ? (_.isObject(areaColor) ? areaColor.colorStops.map(p => p.color) : areaColor)
    : ['#fff', '#fff']
  let select = _.get(styleConfig, 'eachLineSelect', newAccessData[0])
  return [
    new StyleItem({
      title: '数据系列',
      name: 'series',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '折线',
          name: 'line',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.lineStyle, {
              title: '折线样式',
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
            }),
            new StyleItem({
              title: '提示框',
              name: 'tooltip',
              type: 'checkbox',
              checked: _.get(styleConfig, 'tooltip', true),
              onChange: (e) => {
                const checked = e.target.checked
                updateFn('tooltip', () => checked)
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
          title: '网格左边位置',
          name: 'gridLeft',
          type: 'number',
          min: 1,
          max: 100,
          value: _.get(styleConfig, 'grid.left', 20),
          onChange(v) {
            updateFn('grid.left', () => v)
          }
        }),
        new StyleItem({
          title: '网格下方位置',
          name: 'gridBottom',
          type: 'number',
          min: 1,
          max: 100,
          value: _.get(styleConfig, 'grid.bottom', 20),
          onChange(v) {
            updateFn('grid.bottom', () => v)
          }
        }),
        new StyleItem({
          title: '区域',
          name: 'area',
          type: 'editorGroup',
          hidable: true,
          checked: !_.isEmpty(_.get(styleConfig, 'series[0].areaStyle.normal.color')) && _.get(styleConfig, 'series[0].areaStyle.normal.color') !== 'transparent',
          onChangeVisible(e) {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0].areaStyle.normal', () => checked ? { color: '#fff' } : {color: 'transparent'} )
          },
          items: _.isEmpty(_.get(styleConfig, 'series[0].areaStyle.normal.color')) || _.get(styleConfig, 'series[0].areaStyle.normal.color') === 'transparent' ? [] : [
            new StyleItem({
              title: '颜色',
              name: 'areaColor',
              type: 'advanceColor',
              value: areaColor,
              onChange(v) {
                updateFn('series', o => {
                  const val = _.cloneDeep(o)
                  let color = _.isArray(v) 
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
                  _.set(val, '0.areaStyle.normal.color', color)
                  _.set(val, '1.areaStyle.normal.color', color)
                  return val
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
          checked: _.get(styleConfig, 'series[0].showSymbol', false),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0].showSymbol', () => checked)
          },
          items: _.get(styleConfig, 'series[0].showSymbol', true) ? [
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
              items:  _.get(styleConfig, 'series[0].label.normal.show', false) ? [
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
            })
          ] : []
        })
      ]
      // items: _.get(styleConfig, 'series', []).map((series, i) => new StyleItem({
      //   title: `系列${i+1}`,
      //   name: `series${i}`,
      //   type: 'editorGroup',
      //   onDelete() {
      //     updateFn('series', prev => remove(prev, i))
      //   },
      //   items: [
      //     new StyleItem({
      //       title: '折线',
      //       name: 'line',
      //       type: 'editorGroup',
      //       items: [
      //         new StyleItem({
      //           title: '折线颜色',
      //           name: 'lineColor',
      //           type: 'color',
      //           value: _.get(series, 'lineStyle.normal.color', color[i] || '#00bde1'),
      //           onChange(v) {
      //             updateFn(`series[${i}].lineStyle.normal.color`, () => v)
      //           }
      //         }),
      //         new StyleItem(commonStyleItem.lineStyle, {
      //           title: '折线样式',
      //           name: 'lineStyle',
      //           value: _.get(series, 'lineStyle.normal.type', 'solid'),
      //           onChange(v) {
      //             updateFn(`series[${i}].lineStyle.normal.type`, () => v)
      //           }
      //         }),
      //         new StyleItem({
      //           title: '折线粗细',
      //           name: 'lineWidth',
      //           type: 'number',
      //           min: 1,
      //           value: _.get(series, 'lineStyle.normal.width', 2),
      //           onChange(v) {
      //             updateFn(`series[${i}].lineStyle.normal.width`, () => v)
      //           }
      //         }),
      //         new StyleItem({
      //           title: '平滑折线',
      //           name: 'smooth',
      //           type: 'checkbox',
      //           checked: _.get(series, 'smooth', true),
      //           onChange: (e) => {
      //             const checked = e.target.checked
      //             updateFn(`series[${i}].smooth`, () => checked)
      //           }
      //         })
      //       ]
      //     }),
      //     new StyleItem({
      //       title: '区域',
      //       name: 'area',
      //       type: 'editorGroup',
      //       hidable: true,
      //       checked: !_.isEmpty(_.get(series, 'areaStyle.normal')),
      //       onChangeVisible(e) {
      //         e.stopPropagation()
      //         const checked = e.target.checked
      //         updateFn(`series[${i}].areaStyle.normal`, () => checked ? ({ color: '#fff' }) : null )
      //       },
      //       items: !_.isEmpty(_.get(series, 'areaStyle.normal')) ? [
      //         new StyleItem({
      //           title: '颜色',
      //           name: 'areaColor',
      //           type: 'advanceColor',
      //           value: _.get(series, 'areaStyle.normal.color'),
      //           onChange(v) {
      //             updateFn(`series[${i}].areaStyle.normal.color`, () => v)
      //           }
      //         })
      //       ] : []
      //     }),
      //     new StyleItem({
      //       title: '圆点',
      //       name: 'dot',
      //       type: 'editorGroup',
      //       hidable: true,
      //       checked: _.get(styleConfig, 'series[0].showSymbol', true),
      //       onChangeVisible: (e) => {
      //         e.stopPropagation()
      //         const checked = e.target.checked
      //         updateFn('series[0].showSymbol', () => checked)
      //       },
      //       items: _.get(styleConfig, 'series[0].showSymbol', true) ? [
      //         new StyleItem(commonStyleItem.radius, {
      //           type: 'slider',
      //           min: 1,
      //           max: 100,
      //           value: _.get(styleConfig, 'series[0].symbolSize', 10),
      //           onChange(v) {
      //             updateFn('series[0].symbolSize', () => v)
      //           }
      //         }),
      //         new StyleItem({
      //           title: '颜色',
      //           name: 'symbolColor',
      //           type: 'color',
      //           value: _.get(styleConfig, 'series[0].itemStyle.normal.color', '#00bde1'),
      //           onChange(v) {
      //             updateFn('series[0].itemStyle.normal.color', () => v)
      //           }
      //         }),
      //         new StyleItem({
      //           title: '数据标签',
      //           name: 'dataDisplay',
      //           type: 'editorGroup',
      //           hidable: true,
      //           checked: _.get(styleConfig, 'series[0].label.normal.show', false),
      //           onChangeVisible: (e) => {
      //             e.stopPropagation()
      //             const checked = e.target.checked
      //             updateFn('series[0].label.normal.show', () => checked)
      //           },
      //           items:  _.get(styleConfig, 'series[0].label.normal.show', false) ? [
      //             new StyleItem({
      //               title: '位置',
      //               name: 'position',
      //               type: 'select',
      //               value: _.get(styleConfig, 'series[0].label.normal.position', 'top'),
      //               onChange(v) {
      //                 updateFn('series[0].label.normal.position', () => v)
      //               },
      //               options: [
      //                 { key: 'top', value: '上'},
      //                 { key: 'left', value: '左'},
      //                 { key: 'right', value: '右'},
      //                 { key: 'bottom', value: '下'},
      //                 { key: 'inside', value: '里面'},
      //                 { key: 'insideLeft', value: '左(圆点里面)'},
      //                 { key: 'insideRight', value: '右(圆点里面)'},
      //                 { key: 'insideTop', value: '上(圆点里面)'},
      //                 { key: 'insideBottom', value: '下(圆点里面)'},
      //                 { key: 'insideTopLeft', value: '左上(圆点里面)'},
      //                 { key: 'insideBottomLeft', value: '左下(圆点里面)'},
      //                 { key: 'insideTopRight', value: '右上(圆点里面)'},
      //                 { key: 'insideBottomRight', value: '右下(圆点里面)'}
      //               ]
      //             }),
      //             new StyleItem({
      //               title: '文本',
      //               name: 'text',
      //               type: 'editorGroup',
      //               items: [
      //                 new StyleItem(commonStyleItem.fontSize, {
      //                   value: _.get(styleConfig, 'series[0].label.normal.textStyle.fontSize', '12'),
      //                   onChange(v) {
      //                     updateFn('series[0].label.normal.textStyle.fontSize', () => v)
      //                   }
      //                 }),
      //                 new StyleItem(commonStyleItem.color, {
      //                   title: '颜色',
      //                   name: 'fontColor',
      //                   value: _.get(styleConfig, 'series[0].label.normal.textStyle.color', '#00bde1'),
      //                   onChange(v) {
      //                     updateFn('series[0].label.normal.textStyle.color', () => v)
      //                   }
      //                 })
      //               ]
      //             })
      //           ] : []
      //         })
      //       ] : []
      //     })
      //   ]
      // }))
    }),
    commonStyleItem.getColorItem(styleConfig, updateFn),
    commonStyleItem.getLegendItem(styleConfig, updateFn),
    commonStyleItem.getxAxisItem(styleConfig, updateFn),
    commonStyleItem.getyAxisItem(styleConfig, updateFn),
    newAccessData 
      ? new StyleItem({
        title: '每条线相关设置',
        name: 'eachLine',
        type: 'editorGroup',
        items: [  
          new StyleItem({
            title: '选择线',
            name: 'eachLineSelect',
            type: 'select',
            value:  _.get(styleConfig, 'eachLineSelect', newAccessData[0]),
            onChange(v) {
              updateFn('eachLineSelect', () => v)
            },
            options: newAccessData.map(item => {
              return { key: item, value: item}
            })
          }),   
          new StyleItem({
            title: '区域',
            name: 'eachLineAreaStyle',
            type: 'checkbox',
            checked: _.get(styleConfig, `${select}_set.showAreaStyle`,false),
            onChange: (e) => {
              const checked = e.target.checked
              updateFn(`${select}_set.showAreaStyle`, () => checked)
            }
          }),
          new StyleItem(commonStyleItem.color, {
            title: '区域颜色',
            name: 'eachLineAreaStyleColor',
            value: _.get(styleConfig, `${select}_set.areaStyleColor`, 'red'),
            onChange(v) {
              updateFn(`${select}_set.areaStyleColor`, () => v)
            }
          }),
          new StyleItem(commonStyleItem.lineStyle, {
            title: '折线样式',
            name: 'lineStyle',
            value: _.get(styleConfig, `${select}_set.lineType`, 'solid'),
            onChange(v) {
              updateFn(`${select}_set.lineType`, () => v)
            }
          }),
          new StyleItem({
            title: '折线粗细',
            name: 'lineWidth',
            type: 'number',
            min: 1,
            value: _.get(styleConfig, `${select}_set.lineWidth`, 2),
            onChange(v) {
              updateFn(`${select}_set.lineWidth`, () => v)
            }
          }),
          new StyleItem(commonStyleItem.color, {
            title: '折线颜色',
            name: 'eachLineColor',
            value: _.get(styleConfig, `${select}_set.lineColor`, 'red'),
            onChange(v) {
              updateFn(`${select}_set.lineColor`, () => v)
            }
          }),
          new StyleItem({
            title: '折线粗细',
            name: 'selectLineWidth',
            type: 'number',
            min: 1,
            value: _.get(styleConfig, `${select}_set.lineWidth`, 2),
            onChange(v) {
              updateFn(`${select}_set.lineWidth`, () => v)
            }
          }),
          new StyleItem({
            title: '平滑折线',
            name: 'selectLineSmooth',
            type: 'checkbox',
            checked: _.get(styleConfig, `${select}_set.lineSmooth`, false),
            onChange: (e) => {
              const checked = e.target.checked
              updateFn(`${select}_set.lineSmooth`, () => checked)
            }
          }),
          new StyleItem({
            title: '最小值显示',
            name: 'eachLineMinShow',
            type: 'checkbox',
            checked: _.get(styleConfig, `${select}_set.showMin`, false),
            onChange: (e) => {
              const checked = e.target.checked
              updateFn(`${select}_set.showMin`, () => checked)
            }
          }), 
          new StyleItem({
            title: '最大值显示',
            name: 'eachLineMaxShow',
            type: 'checkbox',
            checked: _.get(styleConfig, `${select}_set.showMax`,false),
            onChange: (e) => {
              const checked = e.target.checked
              updateFn(`${select}_set.showMax`, () => checked)
            }
          }),  
          new StyleItem({
            title: '最后一个值显示',
            name: 'eachLineLastShow',
            type: 'checkbox',
            checked: _.get(styleConfig, `${select}_set.showLast`, false),
            onChange: (e) => {
              const checked = e.target.checked
              updateFn(`${select}_set.showLast`, () => checked)
            }
          }),         
          new StyleItem({
            title: '值样式设置',
            name: 'eachLineMax',
            type: 'editorGroup',
            items: [   
              new StyleItem(commonStyleItem.fontSize, {
                title: '值字体大小',
                name: 'eachLineMaxFontSize',
                value: _.get(styleConfig, `${select}_set.maxFontSize`, '12'),
                onChange(v) {
                  updateFn(`${select}_set.maxFontSize`, () => v)
                }
              }),
              new StyleItem(commonStyleItem.color, {
                title: '值字体颜色',
                name: 'eachLineMaxcolor',
                value: _.get(styleConfig, `${select}_set.maxColor`, 'red'),
                onChange(v) {
                  updateFn(`${select}_set.maxColor`, () => v)
                }
              }),
              new StyleItem({
                title: '字体位置',
                name: 'eachLineMaxPosition',
                type: 'select',
                value: _.get(styleConfig, `${select}_set.maxPosition`, 'top'),
                onChange(v) {
                  updateFn(`${select}_set.maxPosition`, () => v)
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
              })            
            ]
          }),
          new StyleItem({
            title: '点设置',
            name: 'eachLinePoint',
            type: 'editorGroup',
            items: [
              new StyleItem({
                title: '点类型',
                name: 'eachLinePointType',
                type: 'select',
                value: _.get(styleConfig, `${select}_set.pointType`, 'circle'),
                onChange(v) {
                  updateFn(`${select}_set.pointType`, () => v)
                },
                options: [
                  { key: 'custom', value: '自定义图片'},
                  { key: 'circle', value: '圆'},
                  {key: 'emptyCircle', value: '空心圆'},
                  { key: 'rect', value: '方形'},
                  { key: 'roundRect', value: '方形（圆角）'},
                  { key: 'triangle', value: '三角形'},
                  { key: 'diamond', value: '菱形'},
                  { key: 'pin', value: '大头针'},
                  { key: 'arrow', value: '箭头'}
                ]
              }),
              styleConfig[select+'_set'] && styleConfig[select+'_set'].pointType === 'custom'
                ? new StyleItem({
                  title: '上传小图标',
                  name: 'iconSrc',
                  type: 'fileToDataUrl',
                  value: _.get(styleConfig, `${select}_set.pointIconSrc`) + '',
                  onChange(v){
                    updateFn(`${select}_set.pointIconSrc`, () => v)
                  }
                })
                : null,
              new StyleItem({
                title: '点大小',
                name: 'eachLinePointSize',
                type: 'number',
                min: 0,
                value: _.get(styleConfig, `${select}_set.pointSize`, 16),
                onChange(v) {
                  updateFn(`${select}_set.pointSize`, () => v)
                }
              }),
              new StyleItem(commonStyleItem.color, {
                title: '点颜色（除自定义外）',
                name: 'eachLinePointColor',
                value: _.get(styleConfig, `${select}_set.pointColor`, ''),
                onChange(v) {
                  updateFn(`${select}_set.pointColor`, () => v)
                }
              }),
              new StyleItem({
                title: '水平位置',
                name: 'eachLinePointLeft',
                type: 'number',
                value: _.get(styleConfig, `${select}_set.pointLeft`, 0),
                onChange(v) {
                  updateFn(`${select}_set.pointLeft`, () => v)
                }
              }),
              new StyleItem({
                title: '垂直位置',
                name: 'eachLinePointTop',
                type: 'number',
                value: _.get(styleConfig, `${select}_set.pointTop`, 0),
                onChange(v) {
                  updateFn(`${select}_set.pointTop`, () => v)
                }
              })
            ]
          }),
          new StyleItem({
            title: '图例设置',
            name: 'legendData',
            type: 'editorGroup',
            items: [
              new StyleItem({
                title: '图例类型',
                name: 'legendType',
                type: 'select',
                value: _.get(styleConfig, `${select}_set.legendType`, 'circle'),
                onChange(v) {
                  updateFn(`${select}_set.legendType`, () => v)
                },
                options: [
                  { key: 'custom', value: '自定义图片'},
                  { key: 'circle', value: '圆'},
                  {key: 'emptyCircle', value: '空心圆'},
                  {key: 'line', value: '直线'},
                  { key: 'rect', value: '方形'},
                  { key: 'roundRect', value: '方形（圆角）'},
                  { key: 'triangle', value: '三角形'},
                  { key: 'diamond', value: '菱形'},
                  { key: 'pin', value: '大头针'},
                  { key: 'arrow', value: '箭头'}
                ]
              }),
              styleConfig[select+'_set'] && styleConfig[select+'_set'].legendType === 'custom'
                ? new StyleItem({
                  title: '上传小图标',
                  name: 'iconSrc',
                  type: 'fileToDataUrl',
                  value: _.get(styleConfig, `${select}_set.legendIconSrc`) + '',
                  onChange(v){
                    updateFn(`${select}_set.legendIconSrc`, () => v)
                  }
                })
                : null,
              new StyleItem({
                title: '图例显示',
                name: 'showLegend',
                type: 'checkbox',
                checked: _.get(styleConfig, `${select}_set.showLegend`, true),
                onChange: (e) => {
                  const checked = e.target.checked
                  updateFn(`${select}_set.showLegend`, () => checked)
                }
              })
            ]
          })
        ]
      }):null
  ]
}
