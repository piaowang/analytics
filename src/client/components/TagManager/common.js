
import _ from 'lodash'
import {EMPTY_TAG_NUMBER, EMPTY_VALUE_OR_NULL, TagType} from '../../../common/constants'
import moment from 'moment'

/**
 * 把数组转换成正确数值eq, op
 * @param {array} value
 * @return {eq, op}
 */
export const convertTagFilterDateValue = value => {
  if (_.isArray(value) && _.indexOf(value, EMPTY_VALUE_OR_NULL) === 0) {
    return { op: 'nullOrEmpty', eq: value }
  }
  let [start, end] = value
  start = _.isNull(start) ? start :  moment(start).startOf('d').toISOString()
  end = _.isNull(end) ? end :  moment(end).endOf('d').toISOString()
  if(value.length === 1) { // [start, start]
    return {
      op: 'equal',
      eq: [start]
    }
  }
  let op = 'in'
  let eq = [start, end]
  if (_.isNull(start)) {
    op = 'lessThan'
    eq = end
  } else if (_.isNull(end)) {
    op = 'greaterThanOrEqual'
    eq = start
  }
  return {op, eq, bounds: '[)'}
}

export const convertTagFilterValue = value => {
  // number only
  if (_.isArray(value) && _.indexOf(value, EMPTY_VALUE_OR_NULL) === 0) {
    return {
      op: 'or',
      eq: [
        {op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]},
        {op: 'equal', eq: [EMPTY_TAG_NUMBER]}
      ]
    }
  }
  let [start, end] = value
  if (value.length === 1) { // [start, start]
    return {
      op: 'equal',
      eq: [start]
    }
  }

  let op = 'in'
  let eq = value
  if (_.isNull(start)) {
    // in [null, 0] 不应该包含 -99999
    return EMPTY_TAG_NUMBER <= end
      ? {op: 'and', eq: [{op: 'lessThan', eq: end}, {op: 'not equal', eq: [EMPTY_TAG_NUMBER]}]}
      : {op: 'lessThan', eq: end}
  } else if (_.isNull(end)) {
    // in [-100000, null] 不应该包含 -99999
    return start < EMPTY_TAG_NUMBER
      ? {op: 'and', eq: [{op: 'greaterThanOrEqual', eq: start}, {op: 'not equal', eq: [EMPTY_TAG_NUMBER]}]}
      : {op: 'greaterThanOrEqual', eq: start}
  }
  return {op, eq, bounds: '[)'}
}

/**
 * 比较属性，获取要更新的属性
 * @param {object} old
 * @param {object} n
 * @return {object}
 */
export const getDiff = (old, n) => {
  return Object.keys(n).reduce((prev, k) => {
    let v = n[k]
    let v2 = old[k]
    if (!_.isEqual(v, v2)) {
      prev[k] = v
    }
    return prev
  }, {})
}

/**
 * 把组合标签转换成维度的数据结构，供标签分类使用
 * @param {array} tagGroups
 * @return {array}
 */
export const convertTagGroups2Dimensions = (tagGroups) => {
  return tagGroups.map(t => {
    return {
      ..._.pick(t, ['title', 'id', 'params', 'description', 'status', 'created_by', 'role_ids']),
      from: 'tagGroup',
      name: t.title,
      is_druid_dimension: true
    }
  })
}

/**
 * 维度过滤
 */
export const dimensionFilter = (dimensions, commonMetric = []) => {
  return dimensions.filter(p => {
    let {name} = p
    let life_cycle = _.get(p, 'tag_extra.life_cycle')
    let now = moment().format('YYYY-MM-DD')
    if (_.isArray(life_cycle)) {
      if (now < life_cycle[0] || now > life_cycle[1]) {
        return false
      }
    }
    return p.is_druid_dimension &&
      name !== '__time' &&
      !commonMetric.includes(name)
      && _.get(p, 'tag_extra.is_base_prop', '0') === '0'
  })
}


function getValue(value) {
  let [va, vb] = value
  let res = 0
  if (_.isNull(va)) {
    res = -Infinity
  } else if (_.isNull(vb)) {
    res = Infinity
  } else {
    res = va + vb
  }
  return res
}

/**
 * 根据标签值排序
 * @param {{value:Array, type:string}} a
 * @param {{value:Array, type:string}} b
 * @return {number}
 */
export function smartSort (a, b) {

  // a: ['空值null']
  // 空值始终排在第一位
  if (a.value[0] === EMPTY_VALUE_OR_NULL) return 1
  if( b.value[0] === EMPTY_VALUE_OR_NULL) return -1

  // a,b类型必然一样
  if (a.type === TagType.String) {
    return a.title > b.title ? 1 : -1
  }

  return getValue(a.value) - getValue(b.value)
}
