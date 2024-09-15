
/*
 * 检查value是否是正确的赋值
 */
import _ from 'lodash'

export default function (value, action) {
  if(value === '' || typeof value === 'undefined') return false
  if(_.isArray(value) && !value.length) return false
  if(action === 'between') {
    if (
      !_.isArray(value) ||
      value.length !== 2 ||
      !_.isNumber(value[0]) ||
      !_.isNumber(value[1]) ||
      value[0] > value[1]
    ) return false
  }
  return true
}
