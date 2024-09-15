import _ from 'lodash'
//检查JSON字符串是否含有数组中任意一个字符串
export default (str, arr) => {
  return typeof _.find(arr, st => {
    return str.includes(`"${st}"`)
  }) !== 'undefined'
}
