import _ from 'lodash'
import {DruidColumnTypeInverted} from './druid-column-type'
import extractNumberRange from './number-range'

export const aggregationTypeForStringDimension = ['count', 'countDistinct']
export const aggregationTypeForNumberDimension = ['sum', 'mean', 'count', 'max', 'min', 'last']

export const aggregationTypeNameDict = {
  count: '计数',
  countDistinct: '去重计数',
  max: '最大值',
  min: '最小值',
  sum: '求和',
  mean: '平均值',
  last: '最新值'
  // average: '平均值'
}

let filter2Formula = (flt) => {
  let {col, op, eq, dimParams} = flt
  if (!_.isArray(eq)) {
    eq = [eq]
  }
  let colFormula = `$${col}`
  switch (op) {
    case 'and': {
      let subFormulas = eq.map(subFlt => filter2Formula({...flt, ...subFlt}))
      return subFormulas.reduce((acc, curr) => `${acc}.and(${curr})`)
    }
    case 'or': {
      let subFormulas = eq.map(subFlt => filter2Formula({...flt, ...subFlt}))
      return subFormulas.reduce((acc, curr) => `${acc}.or(${curr})`)
    }
    case 'equal':
      return `${colFormula}.is(${JSON.stringify(eq[0])})`
    case 'not equal':
      return `${colFormula}.isnt(${JSON.stringify(eq[0])})`
    case 'contains':
      return `${colFormula}.contains(${JSON.stringify(eq[0])})`
    case 'not contains':
      return `${colFormula}.contains(${JSON.stringify(eq[0])}).not()`
    case 'in':
      return `${colFormula}.in(${JSON.stringify(eq)})`
    case 'not in':
      return `${colFormula}.in(${JSON.stringify(eq)}).not()`
    case 'in-ranges':
      //TODO date类型未处理
      return filter2Formula({col, op: 'or', eq: eq.map( subEq => {
        if (!_.isString(subEq)) {
          return ({op: 'equal', eq: [subEq]})
        }
        return ({
          op: 'in',
          eq: extractNumberRange(subEq)
        })
      })})
    default:
      throw new Error('Not support op:' + op)
  }
}

// genInRangesExp = flt => {
  
// }

export const filtersJoin = (filters, logic = 'and') => {
  if (!filters || filters.length === 0) {
    return ''
  }
  let [head, ...rest] = filters
  let restFormula = filtersJoin(rest, logic)
  return restFormula ? `${filter2Formula(head)}.${logic}(${restFormula})` : filter2Formula(head)
}

let ExpBuilder = function (prevExp = '$main') {
  return {
    count: () => new ExpBuilder(`${prevExp}.count()`),
    countDistinct: dimName => new ExpBuilder(`${prevExp}.countDistinct($${dimName})`),
    last: dimName => new ExpBuilder(`${prevExp}.last($${dimName})`),
    addFilter: filterFormula => new ExpBuilder(`${prevExp}.filter(${filterFormula})`),
    build: () => prevExp
  }
}

let StringExpBuilder = function(prevExp = '$main') {
  return {
    ...new ExpBuilder(prevExp),
    excludeNull: dimName => new ExpBuilder(`${prevExp}.filter($${dimName}.isnt(null))`)
  }
}

let NumberExpBuilder = function(prevExp = '$main') {
  return {
    ...new ExpBuilder(prevExp),
    max: dimName => new ExpBuilder(`${prevExp}.max($${dimName})`),
    min: dimName => new ExpBuilder(`${prevExp}.min($${dimName})`),
    sum: dimName => new NumberExpBuilder(`${prevExp}.sum($${dimName})`),
    mean: dimName => new ExpBuilder(`${prevExp}.average($${dimName})`),
    // mean: dimName => {
    //   let expBuilder = new NumberExpBuilder(prevExp)
    //   return expBuilder.sum(dimName).divide(expBuilder.count().build())
    // },
    divide: exp => new ExpBuilder(`${prevExp}.divide(${exp})`),
    excludeNull: dimName => new NumberExpBuilder(`${prevExp}.filter($${dimName}.isnt(null))`),
    addFilter: filterFormula => new NumberExpBuilder(`${prevExp}.filter(${filterFormula})`)
  }
}

const STR_BUILDER = new StringExpBuilder()
const NUM_BUILDER = new NumberExpBuilder()

export const stringFormulaGenerator = ({excludeNull, filters}) => {
  let expFun = dimName => {
    let temp0 = excludeNull ? STR_BUILDER.excludeNull(dimName) : STR_BUILDER
    return filters && filters.length ? temp0.addFilter(filtersJoin(filters)) : temp0
  }
  return {
    count: dimName => expFun(dimName).count().build(),
    countDistinct: dimName => expFun(dimName).countDistinct(dimName).build(),
    last: dimName => expFun(dimName).last(dimName).build()
  }
}

export const numberFormulaGenerator = ({excludeNull, filters}) => {
  let expFun = dimName => {
    let temp0 = excludeNull ? NUM_BUILDER.excludeNull(dimName) : NUM_BUILDER
    return filters && filters.length ? temp0.addFilter(filtersJoin(filters)) : temp0
  }
  return {
    count: dimName => expFun(dimName).count().build(),
    countDistinct: dimName => expFun(dimName).countDistinct(dimName).build(),
    max: dimName => expFun(dimName).max(dimName).build(),
    min: dimName => expFun(dimName).min(dimName).build(),
    sum: dimName => expFun(dimName).sum(dimName).build(),
    mean: dimName => expFun(dimName).mean(dimName).build(),
    last: dimName => expFun(dimName).last(dimName).build()
  }
}

export function singleDbMetricAdapter(metricName, tempMetricModel) {
  let title = tempMetricModel.title || metricName
  let aggregationType = tempMetricModel.aggregationType || 'count'

  let finalTitle = `${title}（${aggregationTypeNameDict[aggregationType] || aggregationType}）`
  //处理维度包含“.”plywood报错
  let dimName = _.indexOf(tempMetricModel.dimension, '.') !== -1 ? `{${tempMetricModel.dimension}}` : tempMetricModel.dimension
  
  // 兼容 customMetrics 在多维分析展示
  if (tempMetricModel.formula) {
    return {
      name: metricName,
      title: tempMetricModel.aggregationType ? finalTitle : title,
      dimName,
      dimParams: tempMetricModel.dimParams,
      formula: tempMetricModel.formula,
      pattern: tempMetricModel.format
    }
  }

  let formulaGenerator = DruidColumnTypeInverted[tempMetricModel.dimType] === 'number'
    ? numberFormulaGenerator(tempMetricModel)
    : stringFormulaGenerator(tempMetricModel)
  let dimParams = tempMetricModel.dimParams

  let formula = formulaGenerator[aggregationType](dimName)

  return {
    name: metricName,
    title: finalTitle,
    dimName,
    dimParams,
    formula: formula,
    pattern: tempMetricModel.format
  }
}

export function dbMetricAdapter(tempMetricDict) {
  if (!tempMetricDict) {
    return []
  }
  return Object.keys(tempMetricDict).map(metricName => singleDbMetricAdapter(metricName, tempMetricDict[metricName]))
}

