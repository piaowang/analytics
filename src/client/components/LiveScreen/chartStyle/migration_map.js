import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import { immutateUpdates } from '../../../../common/sugo-utils'

export default function getMigrationMap(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: ['#8e47e7', '#ff5f74', '#00bde1', '#fcc04e'],
      visualMap: {
        inRange: {
          color: ['#FF37B6']
        },
        outOfRange: {
          color: ['#422772']
        },
        textStyle: {
          color: '#fff'
        },
        show: false
      },
      series: [{
        roam: true,
        center: [106, 37],
        label: {
          normal: {
            show: false
          },
          emphasis: {
            show: true
          }
        }
      }],
      legend: {
        show: true,
        textStyle: {
          color: '#fff'
        }
      },
      geo: {
        roam: false,
        itemStyle: {
          normal: {
            borderColor: '#00E8F3',
            areaColor: {
              type: 'radial',
              x: 0.5,
              y: 0.5,
              r: 0.8,
              colorStops: [
                { offset: 0, color:'rgba(147, 235, 248, 0)' },
                { offset: 1, color: '#00BAF74c' }
              ],
              globalCoord: false,
              shadowColor: 'rgba(128, 217, 248, 1)'
            }
          }
        } 
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }

  let areaColor = _.get(styleConfig, 'geo.itemStyle.normal.areaColor')
    areaColor = areaColor
      ? (areaColor.colorStops ? areaColor.colorStops.map(p => p.color) : areaColor)
      : ['rgba(147, 235, 248, 0)', '#00BAF74c']

  return [
    new StyleItem({
      title: '地图设置',
      name: 'mapconfig',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '默认缩放',
          name: 'zoom',
          type: 'slider',
          min: 0.5,
          max: 10,
          step: 0.5,
          value: _.get(styleConfig, 'geo.zoom', 1),
          onChange(v) {
            updateFn('geo.zoom', () => v)
          }
        }),
        commonStyleItem.getColorItem(styleConfig, updateFn),
        new StyleItem({
          title: '地图中心',
          name: 'center',
          type: 'group',
          items: [
            new StyleItem({
              title: '经度',
              name: 'longitude',
              type: 'number',
              value: _.get(styleConfig, 'geo.center[0]', 104),
              onChange(v) {
                updateFn('geo.center[0]', () => v)
              }
            }),
            new StyleItem({
              title: '纬度',
              name: 'latitude',
              type: 'number',
              value: _.get(styleConfig, 'geo.center[1]', 37),
              onChange(v) {
                updateFn('geo.center[1]', () => v)
              }
            })
          ]
        })
      ]
    }),

    new StyleItem({
      title: '多边形设置',
      name: 'itemStyle',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '目标点颜色',
          name: 'maxColor',
          type: 'color',
          value: _.get(styleConfig, 'visualMap.inRange.color[0]', '#FF37B6'),
          onChange(color) {
            updateFn('visualMap.inRange.color[0]', () => color)
          }
        }),
        new StyleItem({
          title: '地图背景色',
          name: 'areaColor',
          type: 'advanceColor',
          value: areaColor,
          onChange(v) {
            if (!_.isArray(v)) {
              updateFn('', p => immutateUpdates(p, 'geo.itemStyle', o => {
                return { normal: { borderColor: _.get(o, 'normal.borderColor', '#00E8F3'), areaColor: v } }
              }))
              return
            }
            updateFn('', p => immutateUpdates(p, 'geo.itemStyle', o => {
              return {
                normal: {
                  borderColor: _.get(o, 'normal.borderColor','#00E8F3'),
                  areaColor: {
                    type: 'radial',
                    x: 0.5,
                    y: 0.5,
                    r: 0.8,
                    colorStops: [
                      { offset: 0, color: _.get(v, '0', 'rgba(147, 235, 248, 0)') },
                      { offset: 1, color: _.get(v, '1', '#00BAF74c') }
                    ],
                    shadowColor: 'rgba(128, 217, 248, 1)',
                    globalCoord: false
                  }
                }
              }
            }))
          }
        }),
        new StyleItem({
          title: '边线颜色',
          name: 'borderColor',
          type: 'color',
          value: _.get(styleConfig, 'geo.itemStyle.normal.borderColor', '#000'),
          onChange(color) {
            updateFn('geo.itemStyle.normal.borderColor', () => color)
          }
        }),
        new StyleItem({
          title: '边线宽度',
          name: 'borderWidth',
          type: 'number',
          min: 1,
          max: 15,
          value: _.get(styleConfig, 'geo.itemStyle.normal.borderWidth', 1),
          onChange(v) {
            updateFn('geo.itemStyle.normal.borderWidth', () => v)
          }
        }),
        new StyleItem({
          title: '透明度',
          name: 'opacity',
          type: 'slider',
          min: 0,
          max: 1,
          step: 0.01,
          value: _.get(styleConfig, 'series[0].itemStyle.normal.opacity', 1),
          onChange(v) {
            updateFn('series[0].itemStyle.normal.opacity', () => v)
          }
        })
      ]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn)
  ]
}
