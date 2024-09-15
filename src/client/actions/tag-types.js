import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import {setLoading} from './common'
import DruidQueryResource from '../models/druid-query/resource'
import TagDictResource from '../models/tag-dict/resources'
import {DIMENSION_TYPES, QUERY_ENGINE, TagType} from 'common/constants'
import {
  convertTagFilterDateValue,
  convertTagFilterValue
} from '../components/TagManager/common'
import _ from 'lodash'
import {EMPTY_TAG_TITLE, OTHERS_TAG_TITLE} from '../constants/string-constant'
import {EMPTY_TAG_NUMBER, EMPTY_VALUE_OR_NULL} from '../../common/constants'
import {immutateUpdate, immutateUpdates} from '../../common/sugo-utils'
import {recurMapFilters} from '../../common/druid-query-utils'
import {DruidColumnTypeInverted} from '../../common/druid-column-type'
import {doQuerySliceData} from '../common/slice-data-transform'
import moment from 'moment'
import {tagGroupParamsToSliceFilters} from '../components/TagManager/url-functions'
import extractNumberRange from '../../common/number-range'

const getTagTypes = (query = {}, doDispatch = true) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_TAGTYPE, query)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_tagTypes',
        data: res.result
      }
      dispatch(action1)
    }
    return res
  }
}

const updateTagType = (ids, update, tagTypes) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.put(remoteUrl.EDIT_TAGTYPE, {
      ids, update
    })
    setLoading(dispatch, false)
    if(res && tagTypes) {
      let action = {
        type: 'set_tagTypes',
        data: tagTypes
      }
      dispatch(action)
    }
    return res
  }
}

const addTagType = (inst, tagTypes) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.ADD_TAGTYPE, inst)
    setLoading(dispatch, false)
    if(res && tagTypes) {
      let data = [
        ...tagTypes,
        ...res.result
      ]
      let action = {
        type: 'set_tagTypes',
        data
      }
      dispatch(action)
    }
    return res
  }
}

const delTagType = (ids, tagTypes) => {
  return async dispatch => {
    let action = {
      type: 'set_tagTypes',
      data: tagTypes
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_TAGTYPE, {
      ids
    })
    setLoading(dispatch, false)
    if(res && tagTypes) dispatch(action)
    return res
  }
}

/**
 * 计算过滤条件的计数
 * @param project
 * @param {array} filters
 * @param {string} [relation=and]
 * @param dimensions
 * @return {object}
 */
const computeTagResult = async (
  project,
  filters,
  relation = 'and',
  dimensions = []
) => {
  let childProjectId = project.parent_id ? project.id : null
  const queryParams = {
    druid_datasource_id: project.datasource_id,
    child_project_id: childProjectId,
    queryEngine: QUERY_ENGINE.UINDEX,
    filters: relation === 'or'
      ? [
        {
          op: 'or',
          eq: filters
        }
      ]
      : filters,
    customMetrics: [
      {name: 'total', formula: '$main.count()'}
    ]
  }

  const { result } = await DruidQueryResource.query(queryParams)
  const { result: totalResult } = await DruidQueryResource.query(_.omit(queryParams, 'filters'))
  return {
    count: _.get(result, '[0].total', 0),
    totalCount: _.get(totalResult, '[0].total', 0)
  }
}

/**
 * @param {ReferenceTagModel} base
 * @param {ReferenceTagModel} target
 * @return {number}
 */
export function compare (base, target) {
  if (base.type !== TagType.Range || target.type !== TagType.Range) {
    return 0
  }

  const bv = base.tag_value.split('`')[0]
  const tv = target.tag_value.split('`')[0]
  // 按从小到大排序
  // 如果base > target，则将target排在前面
  // 返回值 > 0, target放base前面
  return parseFloat(bv) > parseFloat(tv) ? 1 : -1
}

export const subTagInfoToFilter = subTagInfo => {
  let itemType = _.get(subTagInfo, 'dimension.type', -1)
  let isNumber = itemType === DIMENSION_TYPES.int
    || itemType === DIMENSION_TYPES.long
    || itemType === DIMENSION_TYPES.float
    || itemType === DIMENSION_TYPES.double
    || itemType === DIMENSION_TYPES.bigDecimal
  let isDate = itemType === DIMENSION_TYPES.date
  
  const isOthersSubTag = subTagInfo.title === OTHERS_TAG_TITLE

  if (isOthersSubTag) {
    // 其他 子标签
    return isNumber || itemType === DIMENSION_TYPES.date
      ? {
        col: subTagInfo.dimension.name,
        op: 'not or',
        eq: subTagInfo.value || [],
        pretty: [subTagInfo.title]
      }
      : {
        col: subTagInfo.dimension.name,
        op: 'not in',
        eq: subTagInfo.value || [],
        containsNull: true,
        pretty: [subTagInfo.title]
      }
  }

  const filterValue = isDate
    ? convertTagFilterDateValue(_.isArray(subTagInfo.value) ? subTagInfo.value : subTagInfo.value.split('`'))
    : isNumber
      ? convertTagFilterValue(subTagInfo.value)
      : {
        op: subTagInfo.value[0] === EMPTY_VALUE_OR_NULL ? 'nullOrEmpty' : 'in',
        eq: _.flatten(_.map(subTagInfo.value, p => _.isString(p) ? p.split(',') : p))
      }

  return {
    col: subTagInfo.dimension.name,
    ...filterValue,
    pretty: [subTagInfo.title],
    ...(subTagInfo.value[0] === EMPTY_VALUE_OR_NULL
      ? {containsNull: true}
      : undefined)
  }
}

export const simplifyTagFilter = (filter, colType) => {
  if (filter.op !== 'or') {
    return filter
  }
  let isNumber = colType === DIMENSION_TYPES.int
    || colType === DIMENSION_TYPES.long
    || colType === DIMENSION_TYPES.float
    || colType === DIMENSION_TYPES.double
    || colType === DIMENSION_TYPES.bigDecimal
  
  filter = immutateUpdates(filter,
    // 合并多个字符型 in 为一个 in
    'eq', subFilters => {
      if (isNumber) {
        return subFilters
      }
      let {in: inFlts, ...rest} = _.groupBy(subFilters, flt => flt.op)
      if (1 < _.size(inFlts)) {
        return [..._(rest).values().flatMap(_.identity).value(), {
          op: 'in',
          eq: _(inFlts).flatMap(flt => flt.eq).orderBy(v => v === EMPTY_VALUE_OR_NULL ? 0 : 1).value()
        }]
      }
      return subFilters
    },
    // 递归设置全部 containsNull, 如果是 in/not in 则如果 eq[0] === EMPTY_VALUE_OR_NULL 则 containsNull = true
    '', currFilter => {
      return recurMapFilters([currFilter], flt => ({ ...flt, containsNull: flt.eq[0] === EMPTY_VALUE_OR_NULL }))[0]
    },
    // 简化二级 filter
    'eq', prevEq => {
      let willOmit = ['col', 'pretty']
      return prevEq.map(obj => {
        return _.isObject(obj)
          ? _.omitBy(obj, (v, k) => _.includes(willOmit, k) || k === 'containsNull' && !v)
          : obj
      })
    })
  // 如果 or 下只有一个 eq，应该直接返回 eq[0]
  return _.size(filter.eq) === 1 ? {...filter, ...filter.eq[0]} : filter
}


/**
 * 把新的过滤条件合并到filters数组
 * @param {array} filters
 * @param {object} item
 * @return {array}
 */
const addFilter2TagManager = (filters, item) => {
  let col = item.dimension.name
  let sameColFilterIdx = _.findIndex(filters, f => f.col === col)

  let subFilter = subTagInfoToFilter(item)

  if (sameColFilterIdx === -1) {
    return [...filters, { col: subFilter.col, op: 'or', action: 'in', eq: [subFilter], pretty: subFilter.pretty}]
  }
  return immutateUpdates(filters, [sameColFilterIdx], sameColFilter => {
    let {op, eq} = sameColFilter
    if (!_.endsWith(op, 'or')) {
      throw new Error(`Unexpected op: ${op}`)
    }
    let eqTemp = _.isArray(eq) ? eq : [eq].filter(_.identity)
    let nextEq = [...eqTemp, subFilter]
    return {
      ...sameColFilter,
      eq: nextEq,
      pretty: _.flatMap(nextEq, subFlt => subFlt.pretty)
    }
  })
}

const removeSubFilterFromTagManager = (filters, item) => {
  let col = item.dimension.name
  let fltPos = _.findIndex(filters, flt => flt.col === col)
  if (fltPos === -1) {
    return filters
  }
  let nextFilters = immutateUpdate(filters, [fltPos], sameColFilter => {
    let nextSubFlts = _.filter(sameColFilter.eq, subFlt => !_.includes(subFlt.pretty, item.title))
    return {
      ...sameColFilter,
      eq: nextSubFlts,
      pretty: _.flatMap(nextSubFlts, subFlt => subFlt.pretty)
    }
  })
  return nextFilters.filter(flt => !_.isEmpty(flt.eq))
}

const checkInFilter = (filters, item) => {
  let col = item.dimension.name
  let sameColFilter = _.find(filters, f => f.col === col)
  if (!sameColFilter) {
    return false
  }
  return _.some(sameColFilter.eq, subFlt => _.includes(subFlt.pretty, item.title))
}


/**
 * 查询组合标签的结果
 * @param {object} dimension
 * @param {object} projectCurrent
 */
const queryTagGroupResult = async (dimension, projectCurrent) => {
  let filters = tagGroupParamsToSliceFilters(dimension.params)
  let res = await computeTagResult(projectCurrent, filters, dimension.params.relation)
  return {
    ...dimension,
    ...res
  }
}

/**
 * 获取总人数
 * 
 * @param {any} projectCurrent
 */
const getUserTotal = async (projectCurrent) => {
  const countSQL = `SELECT COUNT(*) AS userTotal FROM \`${projectCurrent.tag_datasource_name}\``
  let childProjectId = projectCurrent.parent_id ? projectCurrent.id : null
  const {result: resultCount} = await DruidQueryResource.sql(countSQL, QUERY_ENGINE.UINDEX, childProjectId)
  let userTotal = _.get(resultCount, '[0].userTotal', 0)
  return userTotal
}

const tagToSqlCond = subTag => {
  const val = subTag.tag_value.split('`').map(v => _.trim(v))
  let [start, end] = val
  if (subTag.type === TagType.Range) { // 数值范围类型标签
    if (!_.isEmpty(start) && !_.isEmpty(end)) {                      // [start, end)
      return `${start} <= ${subTag.name} AND ${subTag.name} < ${end}`
    } else if (val.length === 1 && _.isEmpty(end)) {                   // [start, start]
      return `${subTag.name} = ${start}`
    } else if (_.isEmpty(start) && !_.isEmpty(end)) {               // [, end)
      return `${subTag.name} < ${end}`
    } else if (!_.isEmpty(start) && _.isEmpty(end)) {               // [start, )
      return `${start} <= ${subTag.name}`
    } else {
      console.error('Unconsidered case: ' + subTag.tag_value)
    }
  } else if (subTag.type === TagType.Time) { // 数值范围类型标签
    start = _.isEmpty(start) ? null : moment(start).startOf('d').toISOString()
    end = _.isEmpty(end) ? null : moment(end).endOf('d').toISOString()
    if (!_.isNull(start) && !_.isNull(end)) {                      // [start, end)
      return `'${start}' <= ${subTag.name} AND ${subTag.name} < '${end}'`
    } else if (val.length === 1 && _.isNull(end)) {                   // [start, start]
      return `${subTag.name} = '${start}'`
    } else if (_.isNull(start) && !_.isNull(end)) {               // [, end)
      return `${subTag.name} < '${end}'`
    } else if (!_.isNull(start) && _.isNull(end)) {               // [start, )
      return `'${start}' <= ${subTag.name}`
    } else {
      console.error('Unconsidered case: ' + subTag.tag_value)
    }
  } else if (subTag.type === TagType.String) {
    const vals = _.flatten(val.map(p => p.split(','))).filter(_.identity)
    return `${subTag.name} IN ('${vals.join('\',\'')}')`
  } else {
    console.error('Unconsidered tag type: ' + subTag.type)
  }
  return null
}

/**
 * 查询标签表对应维度的标签列表
 * @param dimension
 * @param projectCurrent
 * @param datasourceCurrent
 * @param userTotal
 * @returns {Promise.<{ children, total }>}
 */
const getTagChildren = async (dimension, projectCurrent, datasourceCurrent, userTotal) => {
  const {
    id: project_id,
    parent_id,
    // datasouce_name 为 uindex 中的维度表
    tag_datasource_name: datasource_name
  } = projectCurrent
  const {id} = datasourceCurrent
  const uid = _.get(datasourceCurrent, 'params.commonMetric[0]')
  if (!uid || !datasource_name || !id || _.isEmpty(dimension)) {
    return []
  }
  if (dimension.from === 'tagGroup') {
    return await queryTagGroupResult(dimension, projectCurrent)
  }
  // 如果是子项目，则需使用parent_id作为project_id查询
  const projectId = parent_id || project_id
  // 子项目ID，用来查询子项目设置的数据过滤条件
  const child_project_id = !_.isEmpty(parent_id) ? project_id : null
  // 查询标签字典表中该维度相关 tag_value 值
  /**
   * @description 标签引用表
   * @typedef {Object} ReferenceTagModel
   * @property {string} name 维度名称
   * @property {string} tag_name 标签名称
   * @property {string} tag_value 标签值
   * @property {string} type 标签类型 1=范围,2=离散
   * @returns Array<ReferenceTagModel>
   */
  let childProjectId = projectCurrent.parent_id ? projectCurrent.id : null
  let {result: dbSubTags} = await TagDictResource.findAllValidByName(projectId, [dimension.name])

  // 获取最近更新时间
  const recent_updated_at = _.get(dbSubTags, '[0].recent_updated_at')
  // 排除空标签
  // result = _.filter(result, tag => !_.isEmpty(tag.tag_name) && !_.isEmpty(tag.tag_value))

  // 查询维度表中所有 dimension.name 不为 null 的记录
  let countObj = {}
  if (dbSubTags.length) {
    if (dbSubTags[0].type === TagType.String) {
      const tagValsDict = _.zipObject(dbSubTags.map(st => st.tag_name), dbSubTags.map(subTag => {
        return _.flatten(subTag.tag_value.split('`').map(p => _.trim(p).split(','))).filter(_.identity)
      }))
      let res = await doQuerySliceData({
        druid_datasource_id: projectCurrent.datasource_id,
        child_project_id,
        params: {
          filters: [{
            col: dimension.name,
            op: 'in',
            eq: _(tagValsDict).values().flatten().uniq().value(),
            containsNull: false
          }],
          dimensionExtraSettingDict: {[dimension.name]: {limit: 999}},
          dimensions: [dimension.name],
          customMetrics: [{name: 'count', formula: '$main.count()'}],
          withGlobalMetrics: false
        }
      })
      countObj = _(res).chain().get([0, 'resultSet'], [])
        .thru(records => {
          return _.mapValues(tagValsDict /* {...tagValsDict, [EMPTY_TAG_TITLE]: [null]} */ , tagVals => {
            return _(records).filter(r => _.includes(tagVals, r[dimension.name])).sumBy('count')
          })
        })
        .value()
    } else {
      // 组装统计人数的sql
      // 前端增加判断条件，对于数值型标签中，如数值=-99999，标识为未覆盖标签
      const sqlCounts = dbSubTags.map(tag => {
        let whereStr = tagToSqlCond(tag)
        return ` COUNT(* WHERE ${whereStr}) AS \`${tag.tag_name}\` `
      })
      const countSQL = `SELECT ${sqlCounts.join(',')} FROM \`${datasource_name}\` WHERE ${dimension.name} IS NOT NULL AND ${dimension.name} != ${EMPTY_TAG_NUMBER} `
      const { result } = await DruidQueryResource.sql(countSQL, QUERY_ENGINE.UINDEX, childProjectId)
      countObj = result && result[0]
    }
  }
  const nullTagCount = EMPTY_TAG_TITLE in (countObj || {})
    ? countObj[EMPTY_TAG_TITLE]
    : _.get(await DruidQueryResource.sql(
      `SELECT  COUNT(*) AS userCount  FROM \`${datasource_name}\` WHERE ${dimension.name} IS NULL OR ${dimension.name} = ${EMPTY_TAG_NUMBER}`,
      QUERY_ENGINE.UINDEX, childProjectId), 'result.[0].userCount', 0)
  const dimType = DruidColumnTypeInverted[dimension.type]
  const type = _.get(dbSubTags, [0, 'type']) || (dimType === 'number' ? TagType.Range : (dimType === 'date' ? TagType.Time : TagType.String))

  // 覆盖用户数，百分比以此 为 100%
  let coverCount = userTotal - nullTagCount

  // 其他子标签（未标记的子标签）的 count = 总数 - NULL count - 已标记的子标签的计数（集合可能交叉）
  // 但是由于 子标签的人数可能会交叉，所以需要单独查询“其他”
  let queryFilters = []
  if( type === TagType.String) {
    queryFilters = [{
      col: dimension.name,
      op: 'not in',
      eq: [EMPTY_VALUE_OR_NULL, ..._(dbSubTags).flatMap(subTag => subTag.tag_value.split(',')).uniq().value()],
      containsNull: true
    }]
  } else if(type === TagType.Range) {
    queryFilters = [{col: dimension.name, op: 'not or', eq: [
      {op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]},
      {op: 'equal', eq: [EMPTY_TAG_NUMBER]},
      ...dbSubTags.map(subTag => convertTagFilterValue(subTag.tag_value.split('`').map(v => v ? Number(v) : null)))
    ]}]
  } else if(type === TagType.Time) {
    queryFilters = [{col: dimension.name, op: 'not or', eq: [
      {op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]},
      ...dbSubTags.map(subTag => convertTagFilterDateValue(subTag.tag_value.split('`').map(v => v ? v : null)))
    ]}]
  }

  let childrenQueryFilters = []
  if( type === TagType.String) {
    childrenQueryFilters = [EMPTY_VALUE_OR_NULL, ..._(dbSubTags).flatMap(subTag => subTag.tag_value.split(',')).uniq().value()]
  } else if(type === TagType.Range) {
    childrenQueryFilters = [
      {op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]},
      {op: 'equal', eq: [EMPTY_TAG_NUMBER]},
      ...dbSubTags.map(subTag => convertTagFilterValue(subTag.tag_value.split('`').map(v => v ? Number(v) : null)))
    ]
  } else if(type === TagType.Time) {
    childrenQueryFilters = [
      {op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]},
      ...dbSubTags.map(subTag => convertTagFilterDateValue(subTag.tag_value.split('`').map(v => v ? v : null)))
    ]
  }
  const queryOthersCountParams = {
    druid_datasource_id: datasourceCurrent.id,
    child_project_id,
    queryEngine: QUERY_ENGINE.UINDEX,
    filters: queryFilters,
    customMetrics: [{name: 'total', formula: '$main.count()'}]
  }
  let queryOthersCountRes = await DruidQueryResource.query(queryOthersCountParams)
  let othersCount = _.get(queryOthersCountRes, 'result[0].total') || 0

  let children = [
    othersCount
      ? {
        type: type,
        count: othersCount,
        title: OTHERS_TAG_TITLE,
        value: childrenQueryFilters,
        dimension,
        percent: (coverCount === 0 || othersCount === 0) ? '0.00' : (othersCount / coverCount * 100).toFixed(2)
      }
      : null,
    nullTagCount
      ? {
        type: type,
        count: nullTagCount,
        title: EMPTY_TAG_TITLE,
        value: [EMPTY_VALUE_OR_NULL],
        dimension,
        percent: (userTotal === 0 || nullTagCount === 0) ? '0.00' : (nullTagCount / userTotal * 100).toFixed(2)
      }
      : null
  ].filter(_.identity)

  if (_.isEmpty(countObj)) {
    countObj = {} //未查到数据 直接返回子标签列表
  }
  // userTotal=总用户数; userCount=当前标签对应人数总和
  const subTags = dbSubTags.map(tag => {
    const count = countObj[tag.tag_name] || 0
    /**
     * @type {TagType} type 标签类型 1=范围,2=离散
     */
    const isRange = tag.type === TagType.Range || tag.type === TagType.Time
    const val = tag.tag_value.split(isRange ? '`' : ',')
    let filterValue = val
    if(tag.type === TagType.Range) {
      filterValue = val.map(v => {
        return v ? Number(v) : null
      })
    } else if(tag.type === TagType.Time) {
      filterValue = val.map(v => v ? v : null).join('`')
    }
    return {
      type: tag.type,
      count,
      title: tag.tag_name,
      value: filterValue,
      dimension,
      percent: (coverCount === 0 || count === 0) ? '0.00' : (count / coverCount * 100).toFixed(2)
    }
  })

  /**
   * @param {ReferenceTagModel} tag
   */
  return {
    recent_updated_at,
    children: [...subTags, ...children]
  }
}

//actions maptoprops
export {
  getTagTypes,
  delTagType,
  addTagType,
  updateTagType,
  computeTagResult,
  addFilter2TagManager,
  removeSubFilterFromTagManager,
  checkInFilter,
  getTagChildren,
  getUserTotal
}
