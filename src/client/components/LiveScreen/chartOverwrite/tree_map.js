import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function treeMap(rop, seriesStyle) {

  rop = immutateUpdates(
    rop,'tooltip',
    () => {
      return {
        ...rop.tooltip,
        show: seriesStyle && seriesStyle.tooltipShow,
        formatter: (params) => {
          return `${params.name}:${params.value}${seriesStyle && seriesStyle.componentUnit || ' '}`
        }
      }
    },
    'tooltip.textStyle', 
    () => {
      return seriesStyle && seriesStyle.tooltipStyle || {}
    }
  )
  return rop
}