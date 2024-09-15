


const typeMap = {
  str: 'string',
  num: 'number'
}

/*
 * 把子项目过滤条件转换为单图过滤条件
 * @param {object} filter 把子项目过滤条件
 * @return {array} 单图过滤条件
 */
export default function (filter) {
  let {filters = []} = filter
  return filters.map(filter => {
    let {dimension: col, action, actionType, value, hidden} = filter
    if (!col) return filter
    let eq = value
    let op = action
    if (action === '>=') {
      eq = [value, null]
    } else if (action === 'between') {
      op = 'in'
    } else if (action === '<=') {
      eq = [null, value]
    } else if (action === '=') {
      eq = value
      op = 'equal'
    } else if (action === '=') {
      eq = value
      op = 'equal'
    } else if (action === '≠') {
      eq = value
      op = 'not equal'
    }
    return {
      op,
      hidden,
      typeMap: typeMap[actionType],
      type: typeMap[actionType],
      col,
      eq
    }
  })
}

