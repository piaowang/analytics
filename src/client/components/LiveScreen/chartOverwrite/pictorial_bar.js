import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function pictorial_bar(rop, seriesStyle) {
  let legendSettings = seriesStyle 
        && seriesStyle.legendSettings || {}
  let { showLegend = true, legendType = 'circle', legendIconSrc, pointSize, pointColor } = legendSettings
  rop = immutateUpdates(
    rop,'series',
    (series) => {
      let seriesData = series.map((item, idx) => {
        return {
          ...item,
          symbol:legendType === 'custom'
            ? 'image://'+legendIconSrc
            : legendType,
          symbolSize: pointSize || 16,  
          itemStyle:{
            normal: {
              ...(item.itemStyle && item.itemStyle.normal || {}),
              color: pointColor
            }
          }    
        }
      })
      return seriesData
    },'legend.data',(data) => {
      return data.map(item => {
        if (_.isPlainObject(item)) {
          return showLegend 
            ? {
              name: item.name,
              icon:legendType === 'custom'
                ? 'image://'+legendIconSrc
                : legendType
            } 
            : {}
        }
        return showLegend 
          ? {name: item, 
            icon: legendType === 'custom'
              ? 'image://'+legendIconSrc
              : legendType
          } 
          : {}
      })
    })
  return rop
}