/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 */

import Resource from '../resource'
import { tag_segments } from './mock'
import Fetch from '../../common/fetch-final'
import _ from 'lodash'
import DruidQueryResource from '../../models/druid-query/resource'
import TagDictResource from '../tag-dict/resources'
import { QUERY_ENGINE, TagType } from 'common/constants'
import { convertTagsValue } from 'common/convertTagsValue'
import { recurMapFilters } from '../../../common/druid-query-utils'
import moment from 'moment'
import { forAwaitAll } from '../../../common/sugo-utils'
import { doQuerySliceData } from '../../common/slice-data-transform'
import { EMPTY_TAG_NUMBER, EMPTY_VALUE_OR_NULL } from '../../../common/constants'
import { EMPTY_TAG_TITLE, OTHERS_TAG_TITLE } from '../../constants/string-constant'
import { convertTagFilterValue } from '../../components/TagManager/common'

const $resources = {
  info: Resource.create('/app/usergroup/get'),
  list: Resource.create('/app/usergroup/get'),
  getTempUserIds: Resource.create('/app/usergroup/get-userids-by-tempid')
}

/**
 * @param success
 * @param result
 * @param message
 * @return {ResponseStruct}
 */
function struct(success, result, message) {
  return {
    success,
    result,
    message,
    type: 'json',
    code: 200
  }
}

/**
 * @type {{combine:Function, parse:Function}}
 */
const TagKeyUtil = (function () {
  const S = '_TAG_KEY_VALUE_'
  return {
    /**
     * @param {ReferenceTagModel} tag
     * @return {string}
     */
    combine(tag) {
      return tag.name + S + tag.tag_name
    },
    /**
     * @param {string} key
     * @return {{name:string, tag_name:string}}
     */
    parse(key) {
      const arr = key.split(S)
      return {
        name: arr[0],
        tag_name: arr[1]
      }
    }
  }
})()

export { TagKeyUtil }

const combineFilter = tag => {
  const val = tag.tag_value.split('`').map(v => _.trim(v))
  if (tag.type === TagType.Range) {
    // 数值范围类型标签
    const [start, end] = val
    if (!_.isEmpty(start) && !_.isEmpty(end)) {
      // [start, end)
      return `$${tag.name} >= ${start} and $${tag.name} < ${end}`
    } else if (val.length === 1 && _.isEmpty(end)) {
      // [start, start]
      return `$${tag.name} == ${start}`
    } else if (_.isEmpty(start) && !_.isEmpty(end)) {
      // [, end)
      return `$${tag.name} < ${end}`
    } else if (!_.isEmpty(start) && _.isEmpty(end)) {
      // [start, )
      return `$${tag.name} >= ${start}`
    } else {
      console.error('Unconsidered case: ' + tag.tag_value)
    }
  } else if (tag.type === TagType.Time) {
    // 数值范围类型标签
    let [start, end] = val
    start = _.isEmpty(start) ? null : moment(start).startOf('d').toISOString()
    end = _.isEmpty(end) ? null : moment(end).endOf('d').toISOString()
    if (!_.isNull(start) && !_.isNull(end)) {
      // [start, end)
      return `$${tag.name} >= '${start}' and $${tag.name} < '${end}'`
    } else if (val.length === 1 && _.isNull(end)) {
      // [start, start]
      return `$${tag.name} == '${start}'`
    } else if (_.isNull(start) && !_.isNull(end)) {
      // [, end)
      return `$${tag.name} < '${end}'`
    } else if (!_.isNull(start) && _.isNull(end)) {
      // [start, )
      return `$${tag.name} >= '${start}'`
    } else {
      console.error('Unconsidered case: ' + tag.tag_value)
    }
  } else if (tag.type === TagType.String) {
    return `$${tag.name}.in(['${_.flatMap(val, v => v.split(','))
      .filter(_.identity)
      .join('\',\'')}'])`
  } else {
    console.error('Unconsidered tag type: ' + tag.type)
  }
  return null
}

export default {
  /**
   * 创建分群
   * @param {SegmentModel} usergroup
   * @return {Promise.<ResponseStruct<SegmentModel>>}
   */
  async create(usergroup) {
    let res = await Fetch.post('/app/usergroup/create', {
      usergroup
    })

    const success = !!res
    return struct(success, res.result, success ? null : '创建分群失败')
  },
  /**
   * 请求分群详情
   * @param {string} id
   * @return {Promise.<ResponseStruct<SegmentModel>>}
   */
  async info(id) {
    const res = await $resources.info
      .get(
        {},
        {
          where: {
            id,
            params: {
              openWith: 'tag-dict'
            }
          }
        }
      )
      .json()
    return struct(!!res.result, res.result || [], res.result ? null : '请求分群详情失败')
  },

  /**
   * 请求分群列表
   * @param {string} dataSourceId
   * @return {Promise.<ResponseStruct<SegmentModel>>}
   */
  async list(dataSourceId) {
    const res = await $resources.list
      .get(
        {},
        {
          where: {
            druid_datasource_id: dataSourceId,
            params: {
              openWith: {
                $or: ['tag-dict', 'tag-enhance']
              }
            }
          }
        }
      )
      .json()
    return struct(!!res.result, res.result || [], res.result ? null : '请求分群列表失败')
  },

  /**
   * 获取项目下标签分群列表
   * @param {string} project_id
   * @return {Promise.<ResponseStruct<SegmentModel>>}
   */
  async tagSegments(project_id) {
    // TODO 书写接口
    return struct(true, tag_segments(10), null)
  },

  /**
   * 获取某标签分群下用户详细列表
   * @param {Object} params
   * @return {Promise.<ResponseStruct<TagDetailsCollectionState>>}
   */
  async tagSegmentList(params, dimensions) {
    let { project, druid_datasource_id, page_current, page_size, tagFilters: filters, selectFields, metricalField, ugId = '', tempUgUserCount = 0 } = params
    let { id: project_id } = project
    let childProjectId = project.parent_id ? project.id : null

    if (!druid_datasource_id || !metricalField) {
      return struct(false, [], '参数异常')
    }

    const limit = Number(page_size)
    const offset = limit * (Number(page_current) - 1)
    const selectCols = selectFields.filter(f => f && f.id !== metricalField).map(f => `${f.name}`)
    let counter = []
    // uid放置第一列
    const select = [`${metricalField}`].concat(selectCols)
    /**
     * @type DruidQueryParams
     */
    const queryParams = {
      druid_datasource_id,
      child_project_id: childProjectId,
      queryEngine: QUERY_ENGINE.UINDEX,
      select
      // selectOrderBy: '__time',
      // selectOrderDirection: 'desc'
    }
    if (_.startsWith(ugId, 'temp_usergroup_')) {
      const uids = await $resources.getTempUserIds.post({}, { id: ugId, limit, offset }).json()
      filters = [{ col: metricalField, op: 'in', eq: uids.result || [] }]
      counter.push({ count: tempUgUserCount })
      queryParams.filters = filters
    } else {
      if (ugId) {
        filters = [{ col: metricalField, op: 'lookupin', eq: ugId }]
        queryParams.filters = filters
      } else {
        const timeFlt = _.find(filters, flt => flt.col === '__time')
        if (!timeFlt) {
          filters = filters.concat({ col: '__time', op: 'in', eq: ['1000', '3000'] })
        }
      }
      const { result } = await DruidQueryResource.query({
        druid_datasource_id,
        child_project_id: childProjectId,
        queryEngine: QUERY_ENGINE.UINDEX,
        filters,
        customMetrics: [{ name: 'count', formula: '$main.count()' }]
      })
      counter = result
      queryParams.selectOffset = offset
      queryParams.selectLimit = limit
      queryParams.filters = filters
    }

    const { result } = await DruidQueryResource.query(queryParams)
    //获取标签信息
    const { result: resTags } = await TagDictResource.findAllValid(project_id)
    let details = convertTagsValue(result, resTags, dimensions)
    // 接口需要返回总共多少条数据
    // filter中可能有标签限制条件，比如`年龄>10`
    // 实际接口查询时需要传入限制条件
    return struct(
      true,
      {
        list: details,
        member_uuid: metricalField,
        total: counter[0] ? counter[0].count : 0
      },
      null
    )
  },

  /**
   * 查询标签画像统计数据
   * @param {string} reference_tag_name
   * @param {string} project_id
   * @param {string} druid_datasource_id
   * @param {Array<string>} tagDimNames
   * @param {Array<Object>} filters
   * @param {string} child_project_id 子项目id
   * @return {Promise.<ResponseStruct<{tags:Array<ReferenceTagModel>, tag_groups:Object<string, Object<string, number>>}>>}
   */
  async queryTagGalleryByDruidQuery(project_id, reference_tag_name, druid_datasource_id, tagDimNames, filters, child_project_id = null, opt = {}) {
    tagDimNames = tagDimNames.concat(
      _(recurMapFilters(filters, flt => flt.col))
        .compact()
        .uniq()
        .value()
    )
    /** @type {Array<ReferenceTagModel>} */
    let { result: dbSubTags } = await TagDictResource.findAllValidByName(project_id, tagDimNames)

    // 查询子标签 + 其他、未覆盖，因为标签可能会存在交集，所以只能直接查询
    let subTagsDict = _.groupBy(dbSubTags, 'name')
    let [stringTagNames, rangeTagNames] = _.partition(_.keys(subTagsDict), tagName => {
      let t = _.first(subTagsDict[tagName])
      return t.type !== TagType.Range && t.type !== TagType.Time
    })

    let stringTagsQueryRes = await forAwaitAll(stringTagNames, async dbTagName => {
      let dbSubTags = subTagsDict[dbTagName]
      const tagValsDict = _.zipObject(
        dbSubTags.map(st => st.tag_name),
        dbSubTags.map(subTag => {
          return _.flatten(subTag.tag_value.split('`').map(p => _.trim(p).split(','))).filter(_.identity)
        })
      )
      let queryTagValuesRes = await doQuerySliceData(
        {
          druid_datasource_id: druid_datasource_id,
          child_project_id,
          params: {
            filters: [
              ...filters,
              {
                col: dbTagName,
                op: 'in',
                eq: _(tagValsDict).values().flatten().uniq().value(),
                containsNull: false
              }
            ],
            dimensions: [dbTagName],
            dimensionExtraSettingDict: { [dbTagName]: { limit: 999 } },
            customMetrics: [{ name: 'count', formula: '$main.count()' }],
            withGlobalMetrics: false
          }
        },
        opt
      )
      let queryEmptyTagValuesRes = await doQuerySliceData(
        {
          druid_datasource_id: druid_datasource_id,
          child_project_id,
          params: {
            filters: [
              ...filters,
              {
                col: dbTagName,
                op: 'in',
                eq: [EMPTY_VALUE_OR_NULL],
                containsNull: true
              }
            ],
            customMetrics: [{ name: 'count', formula: '$main.count()' }]
          }
        },
        opt
      )
      let queryOtherTagValuesRes = await doQuerySliceData(
        {
          druid_datasource_id: druid_datasource_id,
          child_project_id,
          params: {
            filters: [
              ...filters,
              {
                col: dbTagName,
                op: 'not in',
                eq: [
                  EMPTY_VALUE_OR_NULL,
                  ..._(dbSubTags)
                    .flatMap(subTag => subTag.tag_value.split(','))
                    .uniq()
                    .value()
                ],
                containsNull: true
              }
            ],
            customMetrics: [{ name: 'count', formula: '$main.count()' }]
          }
        },
        opt
      )
      return {
        [dbTagName]: {
          ..._(queryTagValuesRes)
            .chain()
            .get([0, 'resultSet'], [])
            .thru(records => {
              return _({ ...tagValsDict, [EMPTY_TAG_TITLE]: [null] })
                .mapValues(tagVals => {
                  return _(records)
                    .filter(r => _.includes(tagVals, r[dbTagName]))
                    .sumBy('count')
                })
                .value()
            })
            .value(),
          [EMPTY_TAG_TITLE]: _(queryEmptyTagValuesRes).chain().get([0, 'count'], 0).value(),
          [OTHERS_TAG_TITLE]: _(queryOtherTagValuesRes).chain().get([0, 'count'], 0).value()
        }
      }
    })

    let rangeTagsQueryRes = await forAwaitAll(rangeTagNames, async dbTagName => {
      let dbSubTags = subTagsDict[dbTagName]
      const tagValsDict = _.zipObject(
        dbSubTags.map(st => st.tag_name),
        dbSubTags.map(subTag => {
          return _.flatten(subTag.tag_value.split('`').map(p => _.trim(p).split(','))).filter(_.identity)
        })
      )
      let customMetrics = dbSubTags.map(subTag => {
        const filterStr = combineFilter(subTag)
        const onlyForTimeFilter = subTag.type === TagType.Time ? `and $${subTag.name}.cast('NUMBER') != 0` : ''
        const finalFilterStr = `${filterStr} and $${subTag.name}.isnt(null) ${onlyForTimeFilter} and $${subTag.name}.cast('NUMBER') != ${EMPTY_TAG_NUMBER}`
        return {
          name: TagKeyUtil.combine(subTag),
          formula: `$main.filter(${finalFilterStr}).count()`
        }
      })
      let queryTagValuesRes = await doQuerySliceData(
        {
          druid_datasource_id: druid_datasource_id,
          child_project_id,
          params: {
            filters: filters,
            dimensions: [],
            dimensionExtraSettingDict: {},
            customMetrics: customMetrics
          }
        },
        opt
      )
      let queryEmptyTagValuesRes = await doQuerySliceData(
        {
          druid_datasource_id: druid_datasource_id,
          child_project_id,
          params: {
            filters: [
              ...filters,
              {
                col: dbTagName,
                op: 'or',
                eq: [
                  { op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL] },
                  { op: 'equal', eq: [EMPTY_TAG_NUMBER] }
                ]
              }
            ],
            customMetrics: [{ name: 'count', formula: '$main.count()' }]
          }
        },
        opt
      )
      let queryOtherTagValuesRes = await doQuerySliceData(
        {
          druid_datasource_id: druid_datasource_id,
          child_project_id,
          params: {
            filters: [
              ...filters,
              {
                col: dbTagName,
                op: 'not or',
                eq: [
                  { op: 'nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL] },
                  { op: 'equal', eq: [EMPTY_TAG_NUMBER] },
                  ...dbSubTags.map(subTag => convertTagFilterValue(subTag.tag_value.split('`').map(v => (v ? Number(v) : null))))
                ]
              }
            ],
            customMetrics: [{ name: 'count', formula: '$main.count()' }]
          }
        },
        opt
      )
      queryTagValuesRes = _.get(queryTagValuesRes, '[0]', {})
      return {
        [dbTagName]: {
          //最终应该是一个对象 扁平化为 '0至1': count
          ..._.mapKeys(queryTagValuesRes, (v, k) => k.replace(`${dbTagName}_TAG_KEY_VALUE_`, '')),
          [EMPTY_TAG_TITLE]: _(queryEmptyTagValuesRes).chain().get([0, 'count'], 0).value(),
          [OTHERS_TAG_TITLE]: _(queryOtherTagValuesRes).chain().get([0, 'count'], 0).value()
        }
      }
    })

    let customMetrics = [
      ..._(subTagsDict)
        .pick(rangeTagNames)
        .values()
        .flatten()
        .value()
        .map(subTag => {
          const filterStr = combineFilter(subTag)
          const onlyForTimeFilter = subTag.type === TagType.Time ? `and $${subTag.name}.cast('NUMBER') != 0` : ''
          const finalFilterStr = `${filterStr} and $${subTag.name}.isnt(null) ${onlyForTimeFilter} and $${subTag.name}.cast('NUMBER') != ${EMPTY_TAG_NUMBER}`
          return {
            name: TagKeyUtil.combine(subTag),
            formula: `$main.filter(${finalFilterStr}).count()`
          }
        }),
      ...rangeTagNames.map(tagName => {
        const condStrs = subTagsDict[tagName].map(combineFilter)
        const nullFilter = `$${tagName}.is(null) or $${tagName}.cast('NUMBER') == 0 or $${tagName}.cast('NUMBER') == ${EMPTY_TAG_NUMBER}`
        return {
          name: TagKeyUtil.combine({ name: tagName, tag_name: OTHERS_TAG_TITLE }),
          formula: `$main.filter((${nullFilter} or ${condStrs.join(' or ')}).not()).count()`
        }
      }),
      ...rangeTagNames.map(tagName => {
        const notNullFilter = `$${tagName}.is(null) or $${tagName}.cast('NUMBER') == 0 or $${tagName}.cast('NUMBER') == ${EMPTY_TAG_NUMBER}`
        return {
          name: TagKeyUtil.combine({ name: tagName, tag_name: EMPTY_TAG_TITLE }),
          formula: `$main.filter(${notNullFilter}).count()`
        }
      })
    ]

    const {
      result: [counter]
    } = await DruidQueryResource.query({
      druid_datasource_id,
      child_project_id,
      queryEngine: QUERY_ENGINE.UINDEX,
      filters,
      customMetrics
    })
    const counterMap = {}

    let tagKey
    let obj
    let tag

    for (tagKey in counter) {
      if (!counter.hasOwnProperty(tagKey)) continue
      obj = TagKeyUtil.parse(tagKey)
      tag = counterMap[obj.name] || (counterMap[obj.name] = {})
      tag[obj.tag_name] = counter[tagKey]
    }

    // debugger
    let merged = _.merge({}, ...stringTagsQueryRes, ...rangeTagsQueryRes)
    return struct(true, { tags: dbSubTags, tag_groups: merged }, null)
  }

  /**
   * 查询标签统计数据
   * @param {string} reference_tag_name
   * @param {string} datasource_name
   * @param {Array<string>} tags - 标签名
   * @param {string} uid
   * @param {Array<Object>} filters
   * @return {Promise.<ResponseStruct<Object<string, Object<string, number>>>>}
   */
  // async queryTagGallery(reference_tag_name, datasource_name, tags, uid, filters) {
  //   // 1. 查找tags的描述
  //   // 2. 根据描述组装查询语句

  //   let res
  //   tags = tags.concat(filters.map(f => f.col))
  //   const SQL_QUERY_TAGS_DESC = `SELECT * FROM \`${reference_tag_name}\` WHERE name IN (${tags.map(v => `'${v}'`).join(',')}) AND tag_value IS NOT NULL AND tag_value <> '' AND tag_name IS NOT NULL AND tag_name <> ''`
  //   res = await DruidQueryResource.sql(SQL_QUERY_TAGS_DESC, QUERY_ENGINE.UINDEX)

  //   const combine = tag => {
  //     const val = tag.tag_value.split('`')
  //     let whereStr
  //     if (tag.type === TagType.Range) { // 数值范围类型标签

  //       if (!_.isEmpty(val[0]) && !_.isEmpty(val[1])) {                      // [start, end)
  //         whereStr = `${tag.name} >= ${val[0]} AND ${tag.name} < ${val[1]}`
  //       } else if (_.isEmpty(val[0]) && !_.isEmpty(val[1])) {                // [, end)
  //         whereStr = `${tag.name} < ${val[1]}`
  //       } else if (!_.isEmpty(val[0]) && _.isEmpty(val[1])) {                // [start, )
  //         whereStr = `${tag.name} >= ${val[0]}`
  //       }
  //     } else if (tag.type === TagType.String) {
  //       whereStr = `${tag.name} IN ('${val.join("','")}')`
  //     }
  //     return whereStr
  //   }

  //   /** @type {Array<ReferenceTagModel>} */
  //   const desc = res.result
  //   const multiCount = desc.map(tag => {
  //     return ` COUNT(${uid} WHERE ${combine(tag)} ) AS \`${TagKeyUtil.combine(tag)}\` `
  //   })

  //   // 附加tag条件
  //   const filterTags = filters.map(t => {
  //     let tag = desc.find(d => d.name === t.col)
  //     tag.tag_value = t.eq.join('`')
  //     return combine(tag)
  //   })

  //   const countSQL = `SELECT ${multiCount.join(',')} FROM \`${datasource_name}\` WHERE ${filterTags.join(' AND ')}`

  //   res = await DruidQueryResource.sql(countSQL, QUERY_ENGINE.UINDEX)

  //   const counter = res.result[0]
  //   const counterMap = {}

  //   let tagKey
  //   let obj
  //   let tag

  //   for (tagKey in counter) {
  //     if (!counter.hasOwnProperty(tagKey)) continue
  //     obj = TagKeyUtil.parse(tagKey)
  //     tag = counterMap[obj.name] || (counterMap[obj.name] = {})
  //     tag[obj.tag_name] = counter[tagKey]
  //   }

  //   return struct(true, counterMap, null)
  // }
}
