import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function gauge_1(rop, seriesStyle) {
  let data1 = 90
  let warning = 80
  if (!_.isEmpty(seriesStyle.target)) {
    data1 = seriesStyle.target.data1 ? seriesStyle.target.data1 : 90 
    warning = seriesStyle.target.warning ? seriesStyle.target.warning : 80   
  }
  rop = immutateUpdates(
    rop,
    'series[2].axisLine.lineStyle.color[0][0]',
    () => {
      return rop.series[2].data[0].value / seriesStyle.series[0].max
    },
    'series[1].data[0].value',
    ()=>{
      return rop.series[1].data[0].value * 160 / seriesStyle.series[0].max
    },
    'series[3].data',
    ()=>{
      let value = rop.series[2].data[0].value * 3 / seriesStyle.series[0].max / 4
      return [
        {
          value: value * 100
        },
        {
          value: 100 - value*100,
          itemStyle: {
            color: 'transparent'
          }
        }
      ]
    }
  )
  if (rop.series[2].data[0].value <= warning)  {
    rop = immutateUpdates(
      rop,'series[2].axisLine.lineStyle.color[0][1]',
      () => {
        return seriesStyle.target && seriesStyle.target.warningColor || 'red'
      },
    )
  }
  return rop
}