import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function radar(rop, seriesStyle) {
  rop = immutateUpdates(
    rop,
    'radar.indicator',
    (arr) => {
      return arr.map(item => {
        // seriesStyle.indicators && seriesStyle.indicators[item.name] || 
        return {...item, max: seriesStyle.indicators && seriesStyle.indicators[item.name] || 1}
      })
    }
  )
  return rop
}