import _ from 'lodash'
import smartSearch from './smart-search'

export const genMonitorConditionFilterPredicate = (monitorCondFilters, filtersMapper) => {
  let subPredicates = monitorCondFilters.map(condFilter => {
    return monitorOrException => {
      let monitorFilters = filtersMapper(monitorOrException) || []
      return _.some(monitorFilters, monitorFilter => {
        const isColMatch = condFilter.col === monitorFilter.col
        if (_.isEmpty(_.compact(condFilter.eq))) {
          // 如果用户没有填筛选条件的值，则只筛选维度
          return isColMatch
        }
        if (!isColMatch) {
          return false
        }
        // 包含 ['广东省'] 的 条件筛选，能匹配含有 '广东省' 的 eq
        // 含有 '广东' 的 条件筛选，能匹配含有 '广东' 的 eq
        const not = _.startsWith(condFilter.op, 'not ')

        if (_.endsWith(condFilter.op, 'in')) {
          return _.every(condFilter.eq, v => not ? !_.includes(monitorFilter.eq, v) : _.includes(monitorFilter.eq, v))
        } else if (_.endsWith(condFilter.op, 'contains')) {
          let targetVal = condFilter.eq[0]
          return not
            ? _.every(monitorFilter.eq, v => !smartSearch(targetVal, v))
            : _.some(monitorFilter.eq, v => smartSearch(targetVal, v) )
        } else {
          throw new Error(`Unknown op: ${condFilter.op}`)
        }
      })
    }
  })
  return _.overEvery(subPredicates)
}
