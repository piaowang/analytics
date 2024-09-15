import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getWordCloud(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const colors = [
      '#2DA3FB', '#66D99E', '#FFD200', '#FA424A',
      '#AE77EF', '#fc6e51', '#a0d468', '#ec87c0'
    ]
    const defaultStyle = {
      series: [{
        type: 'wordCloud',
        shape: 'square',
        left: '10%',
        top: '10%',
        width: '70%',
        height: '80%',
        right: null,
        bottom: null,
        sizeRange: [14, 50],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 8,
        drawOutOfBound: false,
        textStyle: {
          normal: {
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            // Color can be a callback function or a color string
            color: function () {
              // Random color
              return colors[parseInt(Math.random() * 8)]
            }
          },
          emphasis: {
            shadowBlur: 10,
            shadowColor: '#333'
          }
        }
      }]
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
          value: parseFloat(_.get(styleConfig, 'series[0].left', '10%')) / 100.0,
          onChange(v) {
            updateFn('series[0].left', prev => `${v * 100}%`)
          }
        }),
        new StyleItem(commonStyleItem.radius, {
          title: '垂直位置',
          name: 'y',
          value: parseFloat(_.get(styleConfig, 'series[0].top', '10%')) / 100.0,
          onChange(v) {
            updateFn('series[0].top', prev => `${v * 100}%`)
          }
        })
      ]
    }),
    new StyleItem({
      title: '文字大小范围', name: 'wordCloudFontSize', type: 'editorGroup', items: [
        new StyleItem({
          title: '最小值',
          name: 'minFontSize',
          type: 'slider',
          min: 0,
          max: 100,
          step: 1,
          defaultValue: ~~_.get(styleConfig, 'series[0].sizeRange[0]', 14) ,
          onChange(fontSize) {
            updateFn('series[0].sizeRange[0]', () => ~~fontSize)
          }
        }),
        new StyleItem({
          title: '最大值',
          name: 'maxFontSize',
          type: 'slider',
          min: 0,
          max: 100,
          step: 1,
          defaultValue: ~~_.get(styleConfig, 'series[0].sizeRange[1]', 50) ,
          onChange(fontSize) {
            updateFn('series[0].sizeRange[1]', () => ~~fontSize)
          }
        })
      ]
    })
  ]
}
