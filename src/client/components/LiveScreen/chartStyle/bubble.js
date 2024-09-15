import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getBubble(styleConfig, updateFn) {
  if(_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: ['#00bde1', '#8e47e7', '#ff5f74', '#fcc04e'],
      grid: {
        left: '80px',
        right: '20px',
        top: '35px',
        bottom: '30px'
      },
      legend: {
        show: true,
        textStyle: {
          color: '#ddd',
          fontSize: 20
        },
        itemGap: 10,
        _position: 'top'
      },
      xAxis: {
        axisLine: {
          lineStyle: {
            color: '#ddd',
            type: 'solid'
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        },
        axisLabel: {
          textStyle: {
            color: '#fff'
          }
        }
      },
      yAxis: {
        axisLine: {
          lineStyle: {
            color: '#ddd',
            type: 'solid'
          }
        },
        splitLine: {
          lineStyle: {
            color: '#ddd',
            type: 'dashed'
          }
        },
        axisLabel: {
          textStyle: {
            color: '#fff'
          }
        },
        scale: true
      },
      series: [{
        type: 'scatter',
        itemStyle: {
          normal: {
            opacity: 0.8,
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowColor: 'transparent'
          }
        }
      }]
      
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    commonStyleItem.getColorItem(styleConfig, updateFn),
    commonStyleItem.getLegendItem(styleConfig, updateFn),
    commonStyleItem.getxAxisItem(styleConfig, updateFn),
    commonStyleItem.getyAxisItem(styleConfig, updateFn)
  ]
}
