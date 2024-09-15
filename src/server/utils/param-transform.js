/*
 * 分群条件转换为原生lucene查询json
 */

import {$, Expression, ply} from 'sugo-plywood'
import {escape, immutateUpdate} from '../../common/sugo-utils'
import _ from 'lodash'
import moment from 'moment'
import {convertDateType, isRelative} from '../../common/param-transform'
import {translateFormula} from './relative-time-tranform'
import db from '../models'
import conf from '../config'
import {getExpressionComputeContext} from './plywood-facade'
import {actionTypeMap} from '../../common/slice-filter-to-ug-filter'
//import * as plyqlExecutor from './plyql-executor'

const defaultAggName = '__VALUE__'

//convert dimention.filters to Lucene Filter str
export function ugfilterToLuceneFilterStr({ filters, relation = 'and' }) {
  let neg = relation === 'not'
  if (neg) {
    relation = 'and'
  }
  //create filter
  let strFilter = filters.map(curr => {
    let {
      action,
      value,
      dimension,
      actionType,
      exculdValue
    } = curr

    if (curr.relation) {
      return ugfilterToLuceneFilterStr(curr)
    }
    
    if (action === 'lucene') {
      return value
    }
    //日期
    if (actionType === 'date' && !_.endsWith(action, 'nullOrEmpty')) {
      value = isRelative(value)
        ? convertDateType(value, 'iso')
        : value.map(v => moment(v).toISOString())

      if (/:59\.000/.test(value[1])) {
        value[1] = value[1].replace('.000', '.999')
      }

      value = value.map(v => moment(v).valueOf())

      action = 'between'
    }

    value = _.isArray(value)
      ? value.map(v => escape(v + ''))
      : escape(value + '')

    if (action === 'in') {
      return `${dimension}:(${value.join(' ')})`
    } else if(action === 'not in') {
      return `*:* AND NOT ${dimension}:(${value.join(' ')})`
    } else if(action === '≠') {
      return `*:* AND NOT ${dimension}:(${value})`
    } else if(action === '=') {
      return (actionType === actionTypeMap.number || actionType === actionTypeMap.date
        ? `${dimension}:[${value} TO ${value}]`
        : `${dimension}:(${value})`)
    } else if(action === '>') {
      return `${dimension}:{${value} TO *}`
    } else if(action === '>=') {
      return `${dimension}:[${value} TO *]`
    } else if(action === '<') {
      return `${dimension}:{* TO ${value}}`
    } else if(action === '<=') {
      return `${dimension}:[* TO ${value}]`
    } else if(action === 'between') {
      return `${dimension}:[${value[0]} TO ${value[1]}}`
    } else if (action === 'nullOrEmpty') {
      return `(*:* NOT ${dimension}:*)`
    } else if (action === 'not nullOrEmpty') {
      return `${dimension}:*`
    } else if (action === 'contains') {
      return `${dimension}:*${value}*`
    }else if (action === 'in-ranges') {
      // if (!value) return `(*:* NOT ${dimension}:*)`
      
      // console.log(exculdValue,'exculdValue===')
      // if (value === '其他​') {
      //   console.log(handleOthers(exculdValue, dimension), 'exclude===')
      //   return handleOthers(exculdValue, dimension)
      // }
      return handleInRanges(value, actionType, dimension) 
    }
  }).map(qs => `(${qs})`).join(` ${relation.toUpperCase()} `)

  if (neg) {
    strFilter = `*:* AND NOT (${strFilter})`
  }
  //and measure filters
  // let filtersMeasure = measure.filters
  // let str1Arr = filtersMeasure.map(fil => {
  //   return '(' + buildFilterStr(fil.filters) + ')'
  // })
  // let len = str1Arr.length
  // let str1 = len > 1 ? str1Arr.join(' OR ') : str1Arr.join('')

  // let bothHas = str1 && filter
  // let finalStr = (filters.length > 1 && bothHas ? '(' + filter + ')' : filter) +
  // (bothHas ? ' AND ' : '') +
  // (filtersMeasure.length > 1  && bothHas ? '(' + str1 + ')' : str1)
  debug(strFilter, 'final lucene filter')
  return strFilter
}

function handleOthers(exculdValue, dimension) {
  function recursion(eq) {
    if (!_.isArray(eq)) {
      return `*:* AND NOT ${dimension}:(${eq})`
    }
    eq = eq.map( i => {
      if (!_.isObject(i)) {
        return `*:* AND NOT ${dimension}:(${i})`
      }
      const { eq } = i
      return recursion(eq)
    })
    return eq.join(' OR ')
  }

  exculdValue = exculdValue.map( i => {
    const { eq } = i
    if (_.isArray(eq)) {
      return recursion(eq)
    }
    return `*:* AND NOT ${dimension}:(${eq})`
  })
  return exculdValue.join(' OR ')
}

function handleInRanges(value, actionType, dimension) {
  let [pre, end] = value.split(',')
  if (!end) {
    return (actionType === actionTypeMap.number || actionType === actionTypeMap.date
      ? `${dimension}:[${value} TO ${value}]`
      : `${dimension}:(${value})`)
  }
  pre = pre.replace('[', '')
  pre = pre.replace(/\\/g, '')
  end = end.replace(')', '')
  end = end.replace(/\\/g, '')
  if (pre === 'null' || _.isNaN(Number(pre))) pre = '*'
  if (end === 'null' || _.isNaN(Number(end))) end = '*'
  return `${dimension}:{${pre} TO ${end}]`
}

//build spec from measure.filter
export function filterToSpec(filter, index, measureName, name) {
  let { action, value: v, relativeTime } = filter
  let value = v
  if (relativeTime) {
    value = buildTimeValue(v, relativeTime)
  }
  if(action === '=') {
    return [{
      type: 'equalTo',
      aggregation: name,
      value
    }]
  } else if(action === '≠') {
    return [{
      type: 'not',
      havingSpec: {
        type: 'equalTo',
        aggregation: name,
        value
      }
    }]
  } else if(action === '>') {
    return [{
      type: 'greaterThan',
      aggregation: name,
      value
    }]
  } else if(action === '<') {
    return [{
      type: 'lessThan',
      aggregation: name,
      value
    }]
  } else if(action === '>=') {
    return [{
      type: 'not',
      havingSpec: {
        type: 'lessThan',
        aggregation: name,
        value
      }
    }]
  } else if(action === '<=') {
    return [{
      type: 'not',
      havingSpec: {
        type: 'greaterThan',
        aggregation: name,
        value
      }
    }]
  } else if(action === 'between') {
    return [{
      type: 'and',
      havingSpecs: [
        {
          type: 'not',
          havingSpec: {
            type: 'lessThan',
            aggregation: name,
            value: wrapValue(value[0])
          }
        },
        {
          type: 'not',
          havingSpec: {
            type: 'greaterThan',
            aggregation: name,
            value: wrapValue(value[1])
          }
        }
      ]
    }]
  } else if(action === 'in') {
    return [{
      type: 'and',
      havingSpecs: value.map(v => ({
        type: 'equalTo',
        aggregation: name,
        value: v
      }))
    }]
  } else if(action === 'not in') {
    return value.map(v => {
      return {
        type: 'not',
        havingSpec: {
          type: 'equalTo',
          aggregation: name,
          value: v
        }
      }
    })
  }
}

function deepFilterToSpec(filter, index = 0) {
  if (filter.relation){
    return {
      type: filter.relation,
      havingSpecs: filter.filters.reduce((prev, f, i) => prev.concat(deepFilterToSpec(f, i)), [])
    }
  } else {
    let measureName = filter.measure || filter.dimension
    let name = filter.__name
    return filterToSpec(filter, index, measureName, name)
  }
}

function deepFilterToSpecMeasure(filter, query) {
  if (filter.relation){
    return {
      type: filter.relation,
      havingSpecs: filter.filters
        .reduce((prev, f) => {
          let obj = deepFilterToSpecMeasure(f, query)
          if (obj) prev = prev.concat(obj)
          return prev
        }, [])
    }
  } else {
    let {aggregations = [], postAggregations = []} = query
    let combineArr = [...aggregations, ...postAggregations]
    let measureName = filter.measure || filter.dimension
    let name = filter.__name
    let nameInAgg = _.find(combineArr, agg => {
      return _.endsWith(agg.name, name)
    })
    //debug(filter, 'filter')
    if (nameInAgg) {
      name = filter.__name
    } else if (_.find(combineArr, {name: defaultAggName})) {
      name = defaultAggName
    } else {
      return false
    }
    return filterToSpec(filter, 0, measureName, name)
  }
}

function deepFilterToAggregation(filter) {
  if (filter.relation) {
    return filter.filters.reduce((prev, f) => prev.concat(deepFilterToAggregation(f)), [])
  } else {
    let tem = filterToAggregation({
      name: filter.__name,
      filter
    })
    return [tem]
  }
}

function ISOTime(str) {
  //指定格式 解决 Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. 报错
  return moment(str + '', 'YYYY-MM-DD HH:mm:ss').toISOString()
}

export function buildIntervals({ since = 1001, until = 2999, relativeTime }) {
  if (!relativeTime || relativeTime === 'custom') {
    return [`${ISOTime(since)}/${ISOTime(until).replace('59.000', '59.999')}`]
  }
  let arr = convertDateType(relativeTime, 'iso')
  return [`${arr[0]}/${arr[1]}`]
}

//transform usergroup params to query
//for usergroup id upload
export function p2q2(usergroup, ugIds) {
  let { params, id, usergroupIds } = usergroup
  let groupId = params.md5 ? params.md5 : 'usergroup_' + id
  return {
    dataConfig: {
      ...conf.dataConfig,
      groupId
    },
    ids: usergroupIds || ugIds,
    count: _.size(usergroupIds)
  }
}

/**
 * 分群指标筛选条件转 lucene
 * @param filters
 * @returns {*}
 */
function buildFilterStr(filters) {
  function filterToLuceneFilterStr(flt) {
    let {dimension, value, action} = flt
    switch (action) {
      case 'lucene':
        return value
      case 'between':
        return `${dimension}:[${moment(value[0]).valueOf()} TO ${moment(value[1]).valueOf()}}` // 注意左开右闭
      default:
        return dimension + ':' + escape(value + '')
    }
  }
  return filters.filter(f => f.value).map(flt => `(${filterToLuceneFilterStr(flt)})`).join(' AND ')
}

function filterToAggregation({ filter, name }) {
  let { filters } = filter
  let filterStr = buildFilterStr(filters)
  let fieldNames = _.flatMap(filters, fil => fil.dimension)
  return {
    type: 'lucene_filtered',
    name,
    filter: filterStr,
    aggregator: {
      name,
      type: filter.formula,
      fieldNames,
      byRow: true
    }
  }
}

//包装value，如果是dateString，加入双引号
function wrapValue (value) {
  if(!_.isNumber(value)) return moment(value, 'YYYY-MM-DDTHH:mm:ss.sss[Z]').valueOf()
  else return value
}

//把时间指标value转换
function buildTimeValue(value, relativeTime) {
  if (!relativeTime || relativeTime === 'custom') return value
  return convertDateType(relativeTime, 'iso')
}

//构建过滤表达式
function buildFilterQuery (filter) {
  let {action, value: v, __name: key, relativeTime} = filter
  let value = v
  if (relativeTime) {
    value = buildTimeValue(v, relativeTime)
  }
  let res = ''
  action = action === '=' ? '==' : action
  if (_.isArray(value) && !/^\d+$/.test(value)) {
    res = `($${key} > ${wrapValue(value[0])} and $${key} <= ${wrapValue(value[1])})`
  }
  else if (action === 'between') {
    res = `($${key} > ${value[0]} and $${key} <= ${value[1]})`
  } else {
    res = `$${key} ${action} ${value}`
  }
  return res
}

//把所有指标的formula加入表达式
function recBuildFormula(filterExp, filter) {

  let {relation: topRelation, filters} = filter

  //apply 所有formula条件
  filters.forEach((f, i) => {
    f.filters.forEach((ff, j) => {
      let key = 'M_' + i + '_' + j
      ff.__name = key
      ff.formula = translateFormula(ff.formula)
      filterExp = filterExp.apply(key, Expression.parse(ff.formula))
    })
  })

  let fils = filters.map((f) => {
    let {relation, filters} = f
    let len = filters.length
    let start = len ? '(' : ''
    let end = len ? ')' : ''
    return start + f.filters.map((ff) => {
      return buildFilterQuery(ff)
    }).join(' ' + relation + ' ') + end
  })
  let finalStr = fils.join(' ' + topRelation + ' ')
  return filterExp.filter(finalStr)

}

//根据表达式创建Lucene查询json
async function createLuceneExpression (e2, dataSourceName) {
  let druidProps = await getExpressionComputeContext(undefined, dataSourceName)
  // let realData = await plyqlExecutor.executePlywood(e2, druidProps.context, druidProps.timezone)

  let computed = await e2.toDruidQuery(druidProps.context, { timezone: druidProps.timezone })
  return computed
}

//根据sql生成druid查询原始json
export async function sqlToNativeJson(sql) {
  let sqlParse = Expression.parseSQL(sql)
  let druidProps = await getExpressionComputeContext(undefined, sqlParse.table)

  let computed = await sqlParse.expression.toDruidQuery(druidProps.context, { timezone: druidProps.timezone })
  return computed
}

//把指标产生的filter合并到分群filter
//目前应该不会发生，因为加入了多余的条件
function connectFilter(res, query) {
  if (res.filter && query.filter) {
    res.filter = {
      type: 'and',
      fields: [
        {
          query: res.filter,
          type: 'lucene'
        },
        query.filter
      ]
    }
  } else {
    res.filter = res.filter || query.filter
  }
  return res
}

//把指标过滤条件转换为查询条件
async function filterTransform(res, usergroup, config) {
  let {params, datasource_name} = usergroup
  let {measure3: m3} = config
  let measure3 = _.cloneDeep(m3)
  let isUindexUg = false
  if (datasource_name.includes('uindex')) isUindexUg = true
  if (isUindexUg) datasource_name = res.dataSource
  let query = {}
  if (measure3 && measure3.filters.length) {
    //构建表达式
    let filterExp = $(datasource_name)
    let q = ply()
    let e2 = q.apply('main', filterExp)

    //加入一个不会影响查询结果的指标，以便在仅有一个查询条件时候构建正确查询条件
    // measure3.filters[0].filters.push({
    //   measure: 'x_total',
    //   action: '>',
    //   value: 0,
    //   actionType: 'num',
    //   formula: '$main.count()'
    // })
    
    // 需要 groupBy 后才能 having
    let splitExp = $('main').split($(params.groupby), params.groupby, 'main')
    splitExp = recBuildFormula(splitExp, measure3)

    e2 = e2.apply('resultSet', splitExp)

    query = await createLuceneExpression(e2, datasource_name) || {}
  }

  res.aggregations = (res.aggregations || []).concat(query.aggregations || [])
  if (query.postAggregations) {
    res.postAggregations = query.postAggregations
  }

  res.having = addMeasure3having(res.having, measure3, query)

  res = connectFilter(res, query)
  return res
}

//加入指标havingSpec
function addMeasure3having(having, measure3, query) {
  if (!measure3 || !measure3.filters.length) return having
  let having1 = deepFilterToSpecMeasure(measure3, query)
  let hasHaving = having && having.havingSpecs.length
  let hasHaving1 = having1 && having1.havingSpecs.length
  if (hasHaving && hasHaving1) {
    return {
      type: 'and',
      havingSpecs: [
        having, having1
      ]
    }
  } else {
    return hasHaving
      ? having
      : having1
  }
}

//给用户行为筛选条件加入__name以便统一查询中名字
function setFilterName(filter, index = 0) {
  if (filter.relation){
    filter.filters.forEach(f =>{
      index = setFilterName(f, index)
    })
  } else {
    let { measure, formula } = filter
    filter.__name = formula + '_' + measure + '_' + index
    index ++
  }
  return index
}

function hasLookupFilter (filter) {
  return /lookup/.test(filter.action) ||
      _.some(filter.filters, f => /lookup/.test(f.action))
}

function hasLookupFilters (filters) {
  return _.some(
    filters,
    hasLookupFilter
  )
}

//分群参数转换为druid查询json
export async function p2q(usergroup, inUindex, idx) {
  let { params, id, druid_datasource_id } = usergroup
  let { composeInstruction } = params
  let { config, datasource_id = '', selfGroupBy = '' } = composeInstruction[idx]
  let { measure, dimension } = config
  let datasource = await db.SugoDatasources.findOne({
    where: {
      id: datasource_id || druid_datasource_id
    }, raw: true
  })
  let { groupby, md5 } = params
  let newMeasure = _.cloneDeep(measure)
  let groupId = md5 ? md5 : 'usergroup_' + id
  let res = {
    intervals: buildIntervals(config),
    dataConfig: {
      ...conf.dataConfig,
      groupId
    },
    dataSource: inUindex && datasource.tag_datasource_name ? datasource.tag_datasource_name : datasource.name,
    descending: 'false',
    granularity: 'all',
    queryType: 'user_group',
    dimension: selfGroupBy || groupby,
    aggregations: [], //对应params.measure.filters
    filter: '' //对应params.dimension.filters
  }
  //let index = 0

  if (hasLookupFilters(dimension.filters)) {
    // 创建分群时筛选条件带有分群过滤条件
    let excludeUsergroupFilter = immutateUpdate(
      dimension,
      'filters',
      prevFlts => {
        return (prevFlts || []).filter(f => !hasLookupFilter(f))
      }
    )
    let ugFilter = _.find(dimension.filters, hasLookupFilter)
    ugFilter = ugFilter.filters ? ugFilter.filters[0] : ugFilter
    ugFilter = immutateUpdate(ugFilter, 'value', eq => _.isArray(eq) ? eq[0] : eq)

    res.filter = {
      type: 'and',
      fields: [
        {
          type: 'lucene',
          query: ugfilterToLuceneFilterStr(excludeUsergroupFilter)
        },
        {
          type: 'lookup',
          dimension: ugFilter.dimension,
          lookup: `usergroup_${ugFilter.value}`
        }
      ]
    }
  } else {
    res.filter = {
      type: 'lucene',
      query: ugfilterToLuceneFilterStr(dimension)
    }
  }
  setFilterName(newMeasure)
  // setMeasure2Name(measure2new, index)
  res.aggregations = deepFilterToAggregation(newMeasure)
  res.having = deepFilterToSpec(newMeasure)
  res = await filterTransform(res, usergroup, config)
  // console.log('convert from')
  // console.log(JSON.stringify(usergroup))
  // console.log('to')
  debug('result p2q')
  debug(JSON.stringify(res, null, 2))
  debug('result p2q')
  return res
}
