import _ from 'lodash'

export function flattenData(data, unstackXAxisNames, stackData = {}) {
  if (!data.length) {
    return data
  }
  
  if (!data[0].children) {
    if (data[0] && data[0].isTotalRow) {
      // 含有总计行
      let totalRow = _.take(data, 1)
      return totalRow.concat(flattenData(_.drop(data, 1), unstackXAxisNames, stackData))
    } else {
      return data.map(d => {
        return Object.assign({}, d, stackData)
      })
    }
  }
  
  let extraCol = _.first(unstackXAxisNames)
  let restUnstackXAxisNames = _.drop(unstackXAxisNames, 1)
  
  return _.flatMap(data, d => {
    let preStack = {[extraCol]: d[extraCol]}
    return [d, ...flattenData(d.children || [], restUnstackXAxisNames, Object.assign({}, stackData, preStack))]
  })
}
