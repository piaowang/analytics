/**
 * Created by heganjie on 2017/7/15.
 */
import _ from 'lodash'

const numberRangeReg = /^[[(]([^,]+),\s*([^)]+)[)\]]$/

export default function extractNumberRange(str) {
  let m0 = _.isString(str) && str.match(numberRangeReg)
  return m0 ? [m0[1], m0[2]].map(str => isFinite(+str) ? +str : null) : null
}
