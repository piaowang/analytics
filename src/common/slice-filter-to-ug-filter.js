/**
 * 把单图过滤条件转换为分群过滤条件
 * @param filter {object} 单图过滤条件
 * @return array 返回分群过滤条件
 */

import _ from 'lodash'
import {DIMENSION_TYPES, DIMENSION_TYPES_MINI_MAP, EMPTY_VALUE_OR_NULL} from './constants'
import {sliceFilterToLuceneFilterStr} from './druid-query-utils'
import {DruidColumnTypeInverted} from './druid-column-type'
import extractNumberRange from './number-range'

export const actionTypeMap = {
  string: 'str',
  number: 'num',
  date: 'date',
  datestring: 'str',
  lookupin: 'lookupin'
}

export const engOpMap = {
  lessThanOrEqual: '<=',
  lessThan: '<',
  equal: '=',
  'not equal': '≠',
  greaterThanOrEqual: '>=',
  greaterThan: '>'
}

/**
 * 取得维度类型，只对标签维度有效
 * @param col
 */
function guessColType(col) {
  let m = (col || '').match(/^m?([a-z])_/)
  if (!m) {
    return null
  }
  let typeChar = m[1]
  let type = _.findKey(DIMENSION_TYPES_MINI_MAP, v => v === typeChar)
  let typeInt = DIMENSION_TYPES[type]
  return DruidColumnTypeInverted[typeInt]
}

export function toUgFilter(filter) {
  let {
    col,
    op,
    eq,
    type = guessColType(col),
    bounds,
    containsNull,
    exculdValue
  } = filter

  let lowerBoundType = _.get(bounds, '[0]') || '['
  let upperBoundType = _.get(bounds, '[1]') || ')'

  if (_.startsWith(op, 'not ')) {
    return [{
      relation: 'not',
      filters: toUgFilters([{
        ...filter,
        op: op.substr(4)
      }])
    }]
  }
  if (op === 'or' || op === 'and') {
    return [{
      relation: op,
      filters: toUgFilters(eq.map(flt => ({...filter, ...flt})))
    }]
  }
  if (op === 'in-ranges') {
    return toUgFilter({
      ...filter,
      col,
      op: 'or',
      eq: _.map(_.isArray(eq) ? eq : [eq].filter(_.identity), rangeStr => {
        if (actionTypeMap[type] === actionTypeMap.date) {
          // TODO
          throw new Error('Unimplemented')
        }
        return {op: 'in', eq: extractNumberRange(rangeStr)}
      })
    })
  }

  let value = eq
  let action = op
  let actionType = actionTypeMap[type] || ((_.isArray(value) && _.every(value, _.isNumber) || op.includes('Than')) ? 'num' : 'str')
  let dimension = col

  if (action === 'startsWith' || action === 'endsWith') {
    return [
      {
        action: 'lucene',
        value: sliceFilterToLuceneFilterStr(filter)
      }
    ]
  }

  //字符或者日期类型
  if (actionType !== 'num') {
    if (containsNull) {
      return [{
        relation: _.startsWith(action, 'not') ? 'and' : 'or',
        filters: [{
          value: action === 'lookupin' ? (_.isArray(value) ? value[0] : value) : value,
          action,
          actionType,
          dimension
        }, {
          value: EMPTY_VALUE_OR_NULL,
          action: _.startsWith(action, 'not') ? 'not nullOrEmpty' : 'nullOrEmpty',
          actionType,
          dimension
        }]
      }]
    }
    return [{
      value: action === 'lookupin' ? (_.isArray(value) ? value[0] : value) : value,
      action,
      actionType,
      dimension
    }]
  }

  //无效排除
  if (_.isArray(eq) && !eq.length) return []

  // greaterThanOrEqual to >=
  if (op in engOpMap || _.endsWith(op, 'nullOrEmpty')) {
    return [{
      value: eq,
      action: engOpMap[op] || op,
      actionType,
      dimension
    }]
  }

  //包含
  else if (op === 'in') {
    if (containsNull) {
      action = 'nullOrEmpty'
    }
    if (
      _.isArray(eq) &&
      _.isNull(eq[0])
    ) {
      action = upperBoundType === ']' ? '<=' : '<'
      value = eq[1]
    } else if (
      _.isArray(eq) &&
      _.isNull(eq[1])
    ) {
      action = lowerBoundType === '[' ? '>=' : '>'
      value = eq[0]
    } else if (lowerBoundType === '[' && upperBoundType === ')') {
      action = 'between'
    } else {
      return [{
        relation: 'and',
        filters: [{
          value: eq[0],
          action: lowerBoundType === '[' ? '>=' : '>',
          actionType,
          dimension
        }, {
          value: eq[1],
          action: upperBoundType === ']' ? '<=' : '<',
          actionType,
          dimension
        }]
      }]
    }
    return [{
      value,
      action,
      actionType,
      dimension
    }]
  }
  //排除
  else {
    if (containsNull) {
      action = 'nullOrEmpty'
    }
    if (_.isArray(eq) && eq.length === 1) {
      return [{
        value: eq[0],
        action,
        actionType,
        dimension,
        exculdValue
      }]
    }
    if (
      _.isArray(eq) &&
      _.isNull(eq[0])
    ) {
      return [{
        value: eq[1],
        action: upperBoundType === ']' ? '>' : '>=',
        actionType,
        dimension
      }]
    } else if (
      _.isArray(eq) &&
      _.isNull(eq[1])
    ) {
      return [{
        value: eq[0],
        action: lowerBoundType === '[' ? '<' : '<=',
        actionType,
        dimension
      }]
    } else {
      return [{
        value: eq[0],
        action: lowerBoundType === '[' ? '<' : '<=',
        actionType,
        dimension
      }, {
        value: eq[1],
        action: upperBoundType === ']' ? '>' : '>=',
        actionType,
        dimension
      }]
    }
  }

}

export default function toUgFilters(filters) {
  return (filters || [])
    .map(flt => _.isArray(flt.eq) ? flt : {...flt, eq: [flt.eq].filter(_.negate(_.isNil))})
    .filter(flt => !_.isEmpty(flt.eq))
    .reduce((prev, filter) => {
      return [
        ...prev,
        ...toUgFilter(filter)
      ]
    }, [])
}
