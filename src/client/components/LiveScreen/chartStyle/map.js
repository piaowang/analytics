import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getMap(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: ['#00bde1'],
      visualMap: {
        inRange: {
          color: ['#FF37B6', '#8D4CF8']
        },
        outOfRange: {
          color: ['#422772']
        },
        textStyle: {
          color: '#fff'
        }
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
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
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
          value: _.get(styleConfig, 'series[0].zoom', 1),
          onChange(v) {
            updateFn('series[0].zoom', () => v)
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
              value: _.get(styleConfig, 'series[0].center[0]', 104),
              onChange(v) {
                updateFn('series[0].center[0]', () => v)
              }
            }),
            new StyleItem({
              title: '纬度',
              name: 'latitude',
              type: 'number',
              value: _.get(styleConfig, 'series[0].center[1]', 37),
              onChange(v) {
                updateFn('series[0].center[1]', () => v)
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
          title: '最高值颜色',
          name: 'maxColor',
          type: 'color',
          value: _.get(styleConfig, 'visualMap.inRange.color[0]', '#FF37B6'),
          onChange(color) {
            updateFn('visualMap.inRange.color[0]', () => color)
          }
        }),
        new StyleItem({
          title: '最低值颜色',
          name: 'minColor',
          type: 'color',
          value: _.get(styleConfig, 'visualMap.inRange.color[1]', '#8D4CF8'),
          onChange(color) {
            updateFn('visualMap.inRange.color[1]', () => color)
          }
        }),
        new StyleItem({
          title: '无数据颜色',
          name: 'unColor',
          type: 'color',
          value: _.get(styleConfig, 'series[0].itemStyle.normal.areaColor', '#fff'),
          onChange(color) {
            updateFn('series[0].itemStyle.normal.areaColor', () => color)
          }
        }),
        new StyleItem({
          title: '边线颜色',
          name: 'borderColor',
          type: 'color',
          value: _.get(styleConfig, 'series[0].itemStyle.normal.borderColor', '#000'),
          onChange(color) {
            updateFn('series[0].itemStyle.normal.borderColor', () => color)
          }
        }),
        new StyleItem({
          title: '边线宽度',
          name: 'borderWidth',
          type: 'number',
          min: 1,
          value: _.get(styleConfig, 'series[0].itemStyle.normal.borderWidth', 1),
          onChange(v) {
            updateFn('series[0].itemStyle.normal.borderWidth', () => v)
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
