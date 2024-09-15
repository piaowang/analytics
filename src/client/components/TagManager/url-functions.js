/**
 * 构建url相关的方法
 */
import _ from 'lodash'
import {subTagInfoToFilter} from '../../actions'

export function tagGroupParamsToSliceFilters(params = { filters: [] }) {
  let convertFlt = flt => {
    const { action = '' } = flt
    const eq = flt.children.map(c => subTagInfoToFilter({...c, dimension: flt.dimension}))
    if (action === 'equal' && !_.isEmpty(eq)) {
      // 多值列精确匹配
      return {col: eq[0].col, op: 'equal', eq: _.flatMap(eq, f => f.eq)}
    }
    if(action === 'also in' && !_.isEmpty(eq)) {
      return {col: eq[0].col, op: 'and', eq}
    }
    return _.size(eq) === 1
      ? { ...eq[0], op: (action.indexOf('not') >= 0 ? 'not ' : '') + eq[0].op }
      : { op: (action.indexOf('not') >= 0 ? 'not ' : '') + 'or', eq: eq}
  }
  return _.map(params.filters, flt => {
    if ('children' in flt) {
      return convertFlt(flt)
    } else if ('filters' in flt) {
      const eq = _.map(flt.filters, flt0 => convertFlt(flt0))
      return _.size(eq) === 1 ? eq[0] : {op: flt.relation, eq: eq}
    }
    return null
  }).filter(_.identity)
}
