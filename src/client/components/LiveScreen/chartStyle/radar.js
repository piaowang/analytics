import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'
import { dbMetricAdapter } from '../../../../common/temp-metric.js'

export default function getRadar(styleConfig, updateFn, dimensions, metrics, tempMetricDict, measureList, accessData) {
  tempMetricDict=_.isEmpty(tempMetricDict) ? {} : tempMetricDict
  metrics=_.isEmpty(metrics) ? [] : metrics
  accessData=_.isEmpty(accessData) ? [] : JSON.parse(accessData)
  
  let newMeasureList = (measureList || []).filter(item => _.includes(metrics, item.name))
  let newTempMetricDict = metrics.length === 2 
    ? accessData.map(item => ({title: item[dimensions[0]]}))
    : _.concat(newMeasureList,...dbMetricAdapter(tempMetricDict))
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      target:{
        max:1
      },
      color: ['#00bde1', '#8e47e7', '#ff5f74', '#fcc04e'],//: ['#2DA3FB', '#66D99E', '#FFD200'],
      'legend': {
        'left': '10%',
        'right': '10%',
        textStyle: {
          fontSize: '12',
          color: '#fff'
        }
      },
      'radar': {
        'name': {
          'textStyle': {
            'color': '#E3F7FF',
            'splitNumber': 6,
            'borderRadius': 3,
            'padding': [3, 5]
          }
        },
        'center': ['50%', '60%']
      }
      // "series": [
      //   {
      //     "name": "雷达图",
      //     "type": "radar",
      //     "data": [
      //       {
      //         "name": "全局",
      //         "value": [Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
      //         itemStyle: {
      //           normal: {
      //             color: '#2DA3FB'
      //           }
      //         }
      //       }, {
      //         "name": "上海市",
      //         "value": [Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
      //         itemStyle: {
      //           normal: {
      //             color: '#66D99E'
      //           }
      //         }
      //       }, {
      //         "name": "北京市",
      //         "value": [Math.random(), Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
      //         itemStyle: {
      //           normal: {
      //             color: '#FFD200'
      //           }
      //         }
      //       }
      //     ]
      //   }
      // ]
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
          value: parseFloat(_.get(styleConfig, 'radar.center[0]', '50%')) / 100.0,
          onChange(v) {
            updateFn('radar.center', prev => [`${v * 100}%`, prev ? prev[1] : '50%'])
          }
        }),
        new StyleItem(commonStyleItem.radius, {
          title: '垂直位置',
          name: 'y',
          value: parseFloat(_.get(styleConfig, 'radar.center[1]', '50%')) / 100.0,
          onChange(v) {
            updateFn('radar.center', prev => [prev ? prev[0] : '50%', `${v * 100}%`])
          }
        })
      ]
    }),
    new StyleItem({
      title: '标签', name: 'Radarlabel', type: 'editorGroup', items: [
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'radar.name.textStyle.fontSize.', '12') + '',
          onChange: function (fontSize) {
            updateFn('radar.name.textStyle.fontSize', () => ~~fontSize)
          }
        }),
        new StyleItem({
          title: '文字颜色',
          name: 'RadarName-color',
          type: 'color',
          value: _.get(styleConfig, 'radar.name.textStyle.color', '#E3F7FF'),
          onChange(v) {
            updateFn('radar.name.textStyle.color', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '每个指标的最大值',
      name: 'RadarData',
      type: 'editorGroup',
      items: [
        ...(newTempMetricDict.map(item => {
          return new StyleItem({
            title:item.title,
            name:item.title,
            type:'number',
            min:1,
            value: _.get(styleConfig, `indicators.${item.title}`, 1),
            onChange: function (v) {
              updateFn(`indicators.${item.title}`, () => v)
            }
          })
        }))  
      ]
    }),
    // new StyleItem({
    //   title: '线形颜色',
    //   name: 'radarLineColor',
    //   type: 'editorGroup',
    //   items: styleConfig.series[0].data.map((data, i) => new StyleItem(commonStyleItem.color, {
    //     title: `颜色${i+1}`,
    //     name: `color${i}`,
    //     value: _.get(styleConfig,`series[0].data[${i}].itemStyle.normal.color`, '#ffffff'),
    //     onChange(color) {
    //       updateFn(`series[0].data[${i}].itemStyle.normal.color`, () => color)
    //     }
    //   }))
    // })
    commonStyleItem.getColorItem(styleConfig, updateFn),
    commonStyleItem.getLegendItem(styleConfig, updateFn)
  ]
}
