import _ from 'lodash'

//根据数据判断类型
export const types =[
  'attribute_value',
  'nominal',
  'numeric',
  'integer',
  'real',
  'text',
  'binominal',
  'polynominal',
  'file_path',
  'date_time',
  'date',
  'time'
]

export const typesMap = types.reduce((prev, t) => {
  prev[t] = t
  return prev
}, {})


const integerReg = /^[1-9]\d*?$/
const realReg = /^\d*?\.\d+$/
const timeReg = /^\d{2}\:\d{2}\:\d{2}$/
const dateReg = /^\d{4}\-\d{2}\-\d{2}$/
const dateTimeReg = /^\d{4}\-\d{2}\-\d{2} \d{2}\:\d{2}\:\d{2}$/
const defaultType = typesMap.attribute_value

/**
 * 获得出现次数最多的类型
 */
const getMostType = (tps) => {
  let tree = _.groupBy(tps)
  return Object.keys(tree).sort((a, b) => {
    return tree[b].length - tree[a].length
  })[0]
}

/**
 * 检查单个数据类型
 * @param {string} data
 * @return {string}
 */
export const checkOneData = data => {
  if (integerReg.test(data)) {
    return typesMap.integer
  } else if (realReg.test(data)) {
    return typesMap.real
  } else if (timeReg.test(data)) {
    return typesMap.time
  } else if (dateReg.test(data)) {
    return typesMap.date
  } else if (dateTimeReg.test(data)) {
    return typesMap.date_time
  } else return defaultType
}

/**
 * 根据样例数据决定数据类型
 * @param {array} dataArr, 样例： [[1, 2, 'sd'], [3, 4, 'gh']]
 * @return {array} ['integer', 'integer', 'attribute_value']
 */
export const decideType = (dataArr) => {
  let arr = _.zip(...dataArr)
  return arr.map(x => {
    let tps = x.map(item => checkOneData(item))
    let mostType = getMostType(tps)
    let uniqValues = _.uniq(x)
    if (mostType !== defaultType) {
      return mostType
    } else if (
      mostType === defaultType &&
      uniqValues.length === 2
    ) {
      return typesMap.binominal
    } else if (
      mostType === defaultType &&
      uniqValues.length > 2 &&
      uniqValues.length < tps.length
    ) {
      return typesMap.polynominal
    } else {
      return mostType
    }
  })
}
