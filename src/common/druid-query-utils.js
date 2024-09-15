import DruidColumnType, {DruidColumnTypeInverted, isTimeDimension} from './druid-column-type'
import _ from 'lodash'
import moment from 'moment'
import {convertDateType, convertOldDateType, isRelative} from './param-transform'
import parseFormat from 'moment-parseformat'
import {AccessDataType, BuiltinUserGroup, EMPTY_VALUE_OR_NULL, QUERY_ENGINE} from './constants'
import {escape, forAwaitAll, recurMap} from './sugo-utils'
import {dbMetricAdapter, filtersJoin} from './temp-metric'

// 递归读取 filter 的 col
export function recurGetFiltersCol(filters) {
  return _.flatMap(filters, flt => {
    let {op} = flt
    if (op === 'or' || op === 'and' || op === 'not') {
      let eq = _.isArray(flt.eq) ? flt.eq : [flt.eq]
      return recurGetFiltersCol(eq.filter(_.identity).map(flt0 => ({...flt, ...flt0})))
    }
    return [flt.col].filter(_.identity)
  })
}

// dim: province, dict: {广东: [{col: 'province', op: 'in', eq: ['广东', '广东省']}], 沿海: [...]}, othersName: '其他'
// => $province.in(['广东', '广东省']).caseThen('广东').fallback($province.is(...).caseThen('沿海').fallback('其他'))
export function genLookupFormula(dbDim, lookUpDict, othersName) {
  if (_.isEmpty(lookUpDict)) {
    return `'${othersName}'`
  }
  let firstKey = _.first(_.keys(lookUpDict))
  let {[firstKey]: firstKeyVal, ...rest} = lookUpDict
  return `(${filtersJoin(firstKeyVal)}).caseThen('${firstKey}').fallback(${genLookupFormula(dbDim, rest, othersName)})`
}

export function getQueryEngineByProject(project) {
  if (!project) {
    return QUERY_ENGINE.TINDEX
  }
  return project.access_type === AccessDataType.Tag
    ? QUERY_ENGINE.UINDEX
    : project.access_type === AccessDataType.MySQL
      ? QUERY_ENGINE.MYSQL
      : QUERY_ENGINE.TINDEX
}

export function doDesensitizForSelectQuery(data, desensitizDimDict) {
  // s_phone__encode -> s_phone
  let omits = _.keys(desensitizDimDict)
  return data.map(d => {
    let d0 = _.omit(d, omits)
    return _.mapKeys(d0, (v, k) => _.endsWith(k, '__encode') ? k.substr(0, k.length - 8) : k)
  })
}

export function doExtractSensitiveValueGroup(data, desensitizDimDict) {
  // [...] -> {s_phone: [...], ...}
  function recurFlatten(data) {
    return _.flatMap(data, d => {
      let childrenKey = _.findKey(d, _.isArray)
      return [_.omit(d, childrenKey), ...recurFlatten(d[childrenKey])]
    })
  }
  let flatted = recurFlatten(data)
  return _.mapValues(desensitizDimDict, (dim, k) => {
    return _.uniq(flatted.map(d => d[k]).filter(_.identity))
  })
}

export function doDesensitizForGroupByQuery(data, replacementDict) {
  return recurMap(data, d => _.findKey(d, _.isArray), d => {
    return _.mapValues(d, (v, k) => (k in replacementDict) ? replacementDict[k][v] : v)
  })
}

/**
 * 类似 momentObj.format() 不过会使用源格式
 * @example
 * let m0 = moment('2017-04-01 09:57')
 * m0.startOf('day')
 * m0.format() -> "2017-04-01T00:00:00+08:00"
 * formatUseOriginalPattern(m0) -> "2017-04-01 00:00"
 * @param momentVal
 */
export function formatUseOriginalPattern(momentVal) {
  if (momentVal._f) {
    return momentVal.format(momentVal._f)
  } else {
    let format = parseFormat(momentVal._i)
    return momentVal.format(format)
  }
}


/**
 * 复合维度处理过滤器里的分组参数
 * @export
 * @param {any} dbDim
 * @param {any} flt
 * @returns
 */
export function progressGroupFilter(dbDim, flt) {
  if (dbDim.params.type !== 'group') {
    return flt
  }
  const { othersGroupName } = dbDim.params
  const allGroupParams = getGroupDimExParams(dbDim)
  const baseDimType = dbDim.params.dimension.type
  const baseDimName = dbDim.params.dimension.name

  // customGroup
  if (baseDimType !== DruidColumnType.String) {
    // 不会包含空值
    const allGroups = allGroupParams.groups
    /**
     * 检查是否包含未分组
     * 包含&勾上未分组 == 排除所有未勾上分组
     * 排除&勾上未分组 == 包含所有未勾上分组
     * 全部勾上 === 走正常逻辑
     * 其他情况正常逻辑
     */

    let groupDict = _.keyBy(allGroups, g => g.name)
    let groupToRange = val => {
      if (val === othersGroupName) {
        return {
          op: 'and',
          eq: allGroups.map(g => {
            return {
              op: 'not in',
              eq: [g.lower, g.upper]
            }
          })
        }
      } else {
        let group = groupDict[val]
        return {
          op: 'in',
          eq: [group.lower, group.upper]
        }
      }
    }
    let resultFlt = {
      col: baseDimName,
      op: 'or',
      eq: flt.eq.map(groupToRange),
      type: DruidColumnTypeInverted[baseDimType]
    }
    return flt.op === 'not in' ? {col: baseDimName, op: 'not', eq: [resultFlt]} : resultFlt
  } else {
    // lookupMap
    const allMap = _.cloneDeep(allGroupParams)
    flt.allGroups = allMap
    flt.realOp = 'lookupMap'
    flt.baseDimName = baseDimName
    flt.groupParams = _.uniq(_.values(allMap)).filter(value => flt.eq.includes(value))
    // 由于界面上显示需要用到op属性，这里将是否包含其他组传入后台做反向包含判断
    // flt.includeOthers = _.some(flt.eq, item => item === othersGroupName)
    // 未匹配上的其他分组名称
    flt.othersGroupName = othersGroupName
  }
  return flt
}

// 获取分组维度附加参数
function getGroupDimExParams(dbDim) {
  const { groupFilters } = dbDim.params
  const groupDimension = dbDim.params.dimension
  const isTimeDim = isTimeDimension(groupDimension)
  // const isNumberDim = isNumberDimension(groupDimension)
  const isStringDim = groupDimension.type === DruidColumnType.String || groupDimension.type === DruidColumnType.StringArray
  const mapValue = {}
  const groups = groupFilters.map((filter) => {
    // 字符串类型的分组
    if (isStringDim) {
      const rule = filter.rule // 这里type也只支持in 和 eq，其他不支持
      const groupName = filter.groupName
      // const relation = filter.relation // 并且|或者 druid限制目前只取第一个rule
      const allInValues = rule.map(row => row.value).reduce((acc, val) => _.concat(acc, val), [])
      const groupMap = _.reduce(_.uniq(allInValues), (map, value) => {
        map[value] = groupName
        return map
      }, {})
      _.assign(mapValue, groupMap)
    }
    // 时间类型的分组
    else if (isTimeDim) {
      const rule = filter.rule
      if (_.size(rule) === 2) {
        return {
          name: filter.groupName,
          lower: rule.lower,
          upper: rule.upper
        }
      }
    }
    // 非时间类的分组
    else if (!isTimeDim) {
      const rule = filter.rule[0] // druid限制，现在每组只能有一个rule并且只有最大最小
      if (rule) {
        const { value } = rule
        if (value.length !== 2) {
          throw new Error('暂时只支持数值范围类型的分组')
        }
        return {
          name: filter.groupName,
          lower: value[0],
          upper: value[1]
        }
      }
    }
  })
  if (isStringDim) {
    return mapValue
  } else {
    return {
      groups,
      outOfBound: false // 默认过滤不显示其他组
    }
  }
}

/**
 * 找到合适的粒度来显示时间趋势图
 * @param timeRange
 * @returns {*}
 */
export const findSuitableGranularity = (timeRange) => {
  let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
  let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)

  let mSince = moment(since), mUntil = moment(until)
  if (1 <= mUntil.diff(mSince, 'year')) {
    return ['P1Y', 'P1M']
  } else if (100 < mUntil.diff(mSince, 'day')) {
    return ['P1M', 'P1W']
  } else if (30 <= mUntil.diff(mSince, 'day')) {
    return ['P1M', 'P1W', 'P1D']
  } else if (7 <= mUntil.diff(mSince, 'day')) {
    return ['P1W', 'P1D']
  } else if (1 <= mUntil.diff(mSince, 'day')) {
    return ['P1D', 'PT1H', 'PT1M']
  } else if (1 <= mUntil.diff(mSince, 'hour')) {
    return ['PT1H', 'PT1M']
  } else {
    return ['PT1M', 'PT1S']
  }
}

export const sliceFilterToLuceneFilterStr = (flt) => {
  let {col, op, eq, containsNull, type} = flt
  let colDimType = type || 'string'

  let not = _.startsWith(op, 'not ')
  op = not ? op.substr(4) : op // remove not
  
  if (containsNull) {
    eq = eq.filter(v => v !== EMPTY_VALUE_OR_NULL)
    let str = [
      {...flt, eq, containsNull: false},
      {col, op: not ? 'not nullOrEmpty' : 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]}
    ].filter(f => !_.isEmpty(f.eq)).map(sliceFilterToLuceneFilterStr).join(' AND ')
    return `(${str})`
  }

  let luceneFilterStr
  if (op === 'or') {
    let str = (_.isArray(eq) ? eq : [eq]).map(flt0 => ({...flt, ...flt0})).map(sliceFilterToLuceneFilterStr).join(' OR ')
    luceneFilterStr = `(${str})`
  } else if (op === 'and') {
    let str = (_.isArray(eq) ? eq : [eq]).map(flt0 => ({...flt, ...flt0})).map(sliceFilterToLuceneFilterStr).join(' AND ')
    luceneFilterStr = `(${str})`
  } else if (op === 'startsWith') {
    luceneFilterStr = `${col}:${escape(eq + '')}*`
  } else if (op === 'endsWith') {
    luceneFilterStr = `${col}:*${escape(eq + '')}`
  } else if (op === 'nullOrEmpty') {
    return not ? `${col}:*` : `(*:* NOT ${col}:*)`
  } else if (op === 'lookupin') {
    throw new Error('Not support lookup usergroup here')
  } else if (colDimType === 'number' && op === 'in') {
    if (_.isEmpty(eq)) {
      return null
    }
    let [from, to] = eq.map(v => isFinite(v) && v !== null ? +v : '*')
    luceneFilterStr = `${col}:[${from} TO ${to}}`
  } else if (colDimType === 'date' && op === 'in') {
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom'
      ? eq.map(dateStr => moment(dateStr).toISOString())
      : convertDateType(relativeTime, 'iso', 'tool')
    luceneFilterStr = `${col}:[${escape(since) || '*'} TO ${escape(until) || '*'}]`
    
  } else if (op === 'greaterThanOrEqual') {
    let val = _.isArray(eq) ? eq[0] : eq
    luceneFilterStr = `${col}:[${/[T:]/.test(val) ? escape(val) : val} TO *]`
  } else if (op === 'lessThanOrEqual') {
    let val = _.isArray(eq) ? eq[0] : eq
    luceneFilterStr = `${col}:[* TO ${/[T:]/.test(val) ? escape(val) : val}]`
  } else if (op === 'greaterThan') {
    let val = _.isArray(eq) ? eq[0] : eq
    luceneFilterStr = `${col}:{${/[T:]/.test(val) ? escape(val) : val} TO *}`
  } else if (op === 'lessThan') {
    let val = _.isArray(eq) ? eq[0] : eq
    luceneFilterStr = `${col}:{* TO ${/[T:]/.test(val) ? escape(val) : val}}`
    
  } else if (op === 'in' || op === 'equal') {
    if (!_.isArray(eq)) {
      eq = [eq]
    }
    luceneFilterStr = _.size(eq) === 1
      ? `${col}:${escape(eq[0])}`
      : `${col}:(${eq.map(str => escape(str)).join(' ')})`
  } else if (op === 'contains') {
    luceneFilterStr = `${col}:*${escape(_.isArray(eq) ? eq[0] : eq)}*`
  } else {
    throw new Error(`Unknown op: ${op}`)
  }

  return not
    ? `(*:* NOT ${luceneFilterStr})`
    : luceneFilterStr
}

export const sliceFilterToLuceneFilterObj = (flt, dbDimNameDict) => {
  let {col, op, eq} = flt
  let dbDim = dbDimNameDict[col]

  if (!dbDim) {
    return null
  }

  let luceneFilter
  if (_.endsWith(op, 'nullOrEmpty')) {
    luceneFilter = {
      type: 'lucene',
      query: `(*:* NOT ${col}:*)`
    }
  } else if (op === 'lookupin') {
    let ugId = _.isArray(eq) ? eq[0] : eq
    if (_.includes(ugId, 'builtin')) {
      throw new Error('Not support builtin usergroup here')
    } else {
      luceneFilter = {
        type: 'lookup',
        dimension: col,
        lookup: `usergroup_${ugId}`
      }
    }
  } else if (DruidColumnTypeInverted[dbDim.type] === 'number') {
    luceneFilter = _.pickBy({
      type: 'bound',
      dimension: col,
      lower: eq[0],
      upper: eq[1]
    }, val => val === 0 || _.identity(val))
  } else if (DruidColumnTypeInverted[dbDim.type] === 'date') {
    let relativeTime = isRelative(eq) ? eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? eq : convertDateType(relativeTime, 'iso', 'tool')
    luceneFilter = _.pickBy({
      'type': 'bound',
      'dimension': col,
      'lower': relativeTime === 'custom' ? moment(since).toISOString() : since,
      'upper': relativeTime === 'custom' ? moment(until).toISOString() : until,
      'upperStrict': true
    }, _.identity)
  } else if (_.endsWith(op, 'in') || _.endsWith(op, 'equal')) {
    luceneFilter = {
      type: 'in',
      dimension: col,
      values: eq
    }
  } else if (_.endsWith(op, 'contains')) {
    luceneFilter = {
      type: 'lucene',
      query: `${col}:*${escape(eq + '')}*`
    }
  } else {
    throw new Error(`Unimplemented op handler: ${op}`)
  }

  return _.startsWith(op, 'not ') ? {type: 'not', field: luceneFilter} : luceneFilter
}

export const genFinalLuceneFilter = (extraFilters, dataSourceDimensions) => {
  // 应用额外的 filter
  if (!(extraFilters && extraFilters[0] && dataSourceDimensions.length)) {
    return '*:*'
  }
  let dbDimNameDict = _.keyBy(dataSourceDimensions, dbDim => dbDim.name)
  let luceneFilters = extraFilters.map(flt => sliceFilterToLuceneFilterObj(flt, dbDimNameDict)).filter(_.identity)

  return luceneFilters.length === 1 ? luceneFilters[0] : {type: 'and', fields: luceneFilters}
}

export const recurMapFilters = (filters, mapper) => {
  return filters.map(flt => {
    let {op} = flt
    if (op === 'or' || op === 'and' || op === 'not') {
      let eq = _.isArray(flt.eq) ? flt.eq : _.compact([flt.eq])
      return mapper({...flt, eq: recurMapFilters(eq.map(flt0 => ({...flt, ...flt0})), mapper)})
    }

    return mapper(flt)
  })
}

export const transformBuiltinUserGroups = (filters, timeRangeFlt, dataSource) => {
  if (!timeRangeFlt) {
    timeRangeFlt = {op: 'in', eq: ['1000', '3000']}
  }
  return recurMapFilters(filters, flt => {
    let {op} = flt
    let eq = _.isArray(flt.eq) ? flt.eq[0] : flt.eq
    if (op === 'lookupin' && _.includes(eq, 'builtin')) {
      let {firstVisitTimeDimName, firstLoginTimeDimName, loginId} = _.get(dataSource, 'params') || {}
      if (_.endsWith(eq, BuiltinUserGroup.newVisitUsers)) {
        return {...timeRangeFlt, type: 'date', col: firstVisitTimeDimName}
      } else if (_.endsWith(eq, BuiltinUserGroup.allLoginUsers)) {
        return {col: loginId, op: 'not nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL], type: 'string'}
      } else if (_.endsWith(eq, BuiltinUserGroup.newLoginUsers)) {
        return {...timeRangeFlt, type: 'date', col: firstLoginTimeDimName}
      } else {
        throw new Error(`Unknown buildin usergroup: ${eq}`)
      }
    } else {
      return flt
    }
  })
}

// let predicate = filters => {
//   return filter.col === 's_sex'
// }

export const recurFindFilter = (filters, predicate) => {
  return _.find(filters, flt => {
    let {op} = flt
    if (op === 'or' || op === 'and' || op === 'not') {
      let eq = _.isArray(flt.eq) ? flt.eq : _.compact([flt.eq])
      return recurFindFilter(eq.map(flt0 => ({...flt, ...flt0})), predicate)
    } else {
      return predicate(flt)
    }
  })
}

export function NoMetricBecomeQuerySourceData(sliceParams) {
  let {metrics, select, dimensions, dimensionExtraSettingDict} = sliceParams
  if (_.isEmpty(metrics) && _.isEmpty(select) && !_.isEmpty(dimensions)) {
    let {limit, sortCol, sortDirect} = _.get(dimensionExtraSettingDict, [dimensions[0]], {})
    return {
      ...sliceParams,
      select: dimensions,
      selectLimit: limit || 10,
      selectOrderBy: sortCol || undefined,
      selectOrderDirection: sortDirect || 'desc'
    }
  }
  return sliceParams
}

export function withShortTermCache(func, resolver = x => `${x}`, durationSec = 30) {
  const memoized = _.memoize(func, resolver)
  
  return (...args) => {
    let key = resolver(...args)
    if (!memoized.cache.has(key)) {
      setTimeout(() => memoized.cache.delete(key), durationSec * 1000)
    }
    return memoized(...args)
  }
}

export function handlePreMetrics(customMetrics) {
  // 处理 customMetrics 中的 preMetrics；有些指标合在一起算会报错，但是分开算就可以，所以有了 preMetrics 这个东西
  // { name: 'xx', formula: '$yy + $zz', preMetrics: [{name: 'yy', formula: 'yy'}, {name: 'zz', formula: 'zz'}] }
  let nextCustomMetrics = _.flatMap((customMetrics || []), cusMet => {
    let {preMetrics, ...mo} = cusMet
    let nextMetricObj = _.omit(mo, 'preMetrics')

    if (preMetrics && preMetrics[0]) {
      return [...handlePreMetrics(preMetrics), nextMetricObj]
    } else {
      return [nextMetricObj]
    }
  })
  return _.uniqBy(nextCustomMetrics, 'name')
}

export const MetricAdvanceCalcFuncEnum = {
  compareWithLastPeriod: '环比',
  compareWithSamePeriodByYear: '按年同比',
  compareWithSamePeriodByMonth: '按月同比',
  compareWithSamePeriodByWeek: '按周同比',
  compareWithSamePeriodByDay: '按日同比',
  compareAmountWithSamePeriodByYear: '按年同比增量',
  compareAmountWithSamePeriodByMonth: '按月同比增量',
  compareAmountWithSamePeriodByWeek: '按周同比增量',
  compareAmountWithSamePeriodByDay: '按日同比增量',
  compareWithGlobal: '占比'
}

export const sliceParamsProperties = [
  'filters', 'metrics', 'vizType', 'dimensions', 'localMetricDict', 'dimensionExtraSettingDict', 'tempMetricDict',
  'autoReloadInterval', 'chartExtraSettings', 'timezone', 'customDimensions'
]
export const ExcludeFromMetricsReg = /^_(temp|local)Metric_/
export const customMetricProperties = ['name', 'formula', 'dimName', 'dimParams']

export const resolveLocalMetric = async (data, querySlice, opts = {}) => {
  // 插入本地指标的计算结果
  let {
    dimensions,
    metrics,
    localMetricDict,
    dbDimensions,
    dataSourceId,
    childProjectId,
    filters,
    tempMetricDict,
    customMetrics
    // sliceParamsProperties
  } = opts
  // 只取在指标中出现的
  let localMetrics = metrics.filter(m => _.startsWith(m, '_localMetric_'))

  const getGrowthRatio = (t, b) => {
    const val = t / b
    return isFinite(val) ? val - 1 : '--'
  }
  const getGrowthAmount = (t, b) => t - b
  const getRatio = (t, b) => {
    const val = t / b
    return isFinite(val) ? val : '--'
  }

  let shiftDurationDict = {
    '按年': 'P1Y',
    '按月': 'P1M',
    '按周': 'P1W',
    '按日': 'P1D'
  }
  const querySliceWithTimeFilterShifting = async shift => {
    // {name: '', fomular: '', dimName: '', dimParams: {}}
    let finalCustomMetrics = handlePreMetrics(customMetrics || []).concat(
      dbMetricAdapter(tempMetricDict).map(obj => _.pick(obj, customMetricProperties))
    )
    let queryResult = await querySlice({
      druid_datasource_id: dataSourceId,
      child_project_id: childProjectId,
      params: {
        ..._.pick(opts, sliceParamsProperties),
        metrics: metrics.filter(m => !ExcludeFromMetricsReg.test(m)),
        customMetrics: finalCustomMetrics,
        filters: _.map(filters, flt => {
          let {col, eq} = flt
          let dbDim = _.find(dbDimensions, d => d.name === col)
          if (!dbDim || !isTimeDimension(dbDim)) {
            return flt
          }
          let nextEq
          if (isRelative(eq)) {
            let relativeTimeExp = _.isString(eq)
              ? convertOldDateType(eq, _.get(window, 'sugo.relativeTimeType') || 'tool')
              : eq
            let unit = shift === 'P1M' ? 'M' : shift.charAt(2).toLowerCase()
            nextEq = relativeTimeExp.map(str => `${str} -1 ${unit}`)
          } else {
            nextEq = eq.map(v => moment(v).subtract(moment.duration(shift)).toISOString())
          }
          return { ...flt, eq: nextEq }
        })
      }
    })
    return queryResult || []
  }
  let rowReComputeFuncDict = await _(localMetricDict)
    .pick(localMetrics)
    .thru(async obj => {
      let keys = _.keys(obj)
      let vals = await forAwaitAll(keys, async k => {
        const localMetric = obj[k]
        const {funcName, fromMetrics} = localMetric
        const [metricName] = fromMetrics
        if (funcName === MetricAdvanceCalcFuncEnum.compareWithLastPeriod) {
          return (row, index, arr) => index === 0 ? '--' : getGrowthRatio(row[metricName], arr[index - 1][metricName])
        }
        if (funcName === MetricAdvanceCalcFuncEnum.compareWithGlobal) {
          return (row, index, arr, routes) => {
            let prevLayerRow = routes[routes.length - 2]
            return getRatio(row[metricName], prevLayerRow ? prevLayerRow[metricName] : 0)
          }
        }
        if (_.includes(funcName, '同比')) {
          let compFn = _.endsWith(funcName, '同比') ? getGrowthRatio : getGrowthAmount
          // 将 filters 里面的时间筛选都往前调一个单位
          let shiftDurationStr = shiftDurationDict[funcName.substr(0, 2)]
          let shiftDuration = moment.duration(shiftDurationStr)
          let shiftedDims = _.filter(dimensions, col => _.some(dbDimensions, d => d.name === col && isTimeDimension(d)))
          let shiftedDimsSet = new Set(shiftedDims)
          const predicateExtractor = routes => {
            let preds = routes.map(r => {
              let row = _.pick(r, dimensions)
              return _.overEvery(_.keys(row).map(k => {
                let preMatchVal = row[k]
                if (shiftedDimsSet.has(k)) {
                  let preMatchValMoment = moment(preMatchVal).subtract(shiftDuration)
                  return prevYearRow => {
                    return preMatchValMoment.isSame(prevYearRow[k])
                  }
                } else {
                  return prevYearRow => {
                    return prevYearRow[k] === preMatchVal
                  }
                }
              }))
            })
            return preds
          }
          let prevYearData = await querySliceWithTimeFilterShifting(shiftDurationStr)
          const findTreeNode = (arr, predicates) => {
            if (_.isEmpty(predicates)) {
              return arr
            }
            let [pred, ...rest] = predicates
            let branch = _.find(arr, pred)
            return _.isEmpty(rest)
              ? branch
              : findTreeNode(_.find(branch, _.isArray), rest)
          }
          return (row, index, arr, routes) => {
            const predicate = predicateExtractor(routes)
            let prevYearRow = findTreeNode(prevYearData, predicate)
            return prevYearRow ? compFn(row[metricName], prevYearRow[metricName]) : '--'
          }
        }
        throw new Error(`未知高级计算: ${localMetric.funcName}`)
      })
      return _.zipObject(keys, vals)
    })
    .value()

  function recurUpdater(arr, routes = []) {
    const arrKeyName = _.findKey(arr[0], _.isArray)
    return arr.map((row, idx, arr0) => {
      let currRoutes = [...routes, row]
      let nextRow = {
        ...row,
        ..._.mapValues(rowReComputeFuncDict, func => {
          return func(row, idx, arr0, currRoutes)
        })
      }

      if (arrKeyName) {
        nextRow[arrKeyName] = recurUpdater(row[arrKeyName], currRoutes)
      }
      return nextRow
    })
  }

  return recurUpdater(data)
}
