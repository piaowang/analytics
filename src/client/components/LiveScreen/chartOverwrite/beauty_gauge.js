import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'
import echarts from 'echarts'

export default function beauty_gauge(rop, seriesStyle) {

  let data0 = 90
  let data1 = 90
  if(!_.isEmpty(seriesStyle.target)){
    data0 = seriesStyle.target.data0 ? seriesStyle.target.data0 : 90 
    data1 = seriesStyle.target.data1 ? seriesStyle.target.data1 : 90 
  }
  let colorGreen = new echarts.graphic.LinearGradient(0, 0, 1, 0, [{
    offset: 0,
    color: '#1bb83c' // 0% 处的颜色
  },
  {
    offset: 0.17,
    color: '#45cc61' // 100% 处的颜色
  },
  {
    offset: 0.9,
    color: '#b6e4c5' // 100% 处的颜色
  },
  {
    offset: 1,
    color: '#daeae0' // 100% 处的颜色
  }
  ])
  let colorRed = new echarts.graphic.LinearGradient(0, 0, 1, 0, [{
    offset: 0,
    color: '#d2230c' // 0% 处的颜色
  },
  {
    offset: 0.17,
    color: '#dd513f' // 100% 处的颜色
  },
  {
    offset: 0.9,
    color: '#d9877d' // 100% 处的颜色
  },
  {
    offset: 1,
    color: '#e1bcb8' // 100% 处的颜色
  }
  ])
  rop = immutateUpdates(
    rop,
    'series[1].axisLine.lineStyle.color',
    () => {
      if (rop.series[1].data[0].value * 100 >= data0) {
        return [[rop.series[1].data[0].value / seriesStyle.series[0].max, colorGreen]]
      }else{
        return [[rop.series[1].data[0].value / seriesStyle.series[0].max, colorRed]]
      }
    },
    'series[2].axisLine.lineStyle.color',
    () => {
      if (rop.series[2].data[0].value*100 >= data1) {
        return [[rop.series[2].data[0].value, colorGreen]]
      }else{
        return [[rop.series[2].data[0].value, colorRed]]
      }
    }
  )
  return rop
}