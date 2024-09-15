import DruidQueryResource from '../../../../models/druid-query/resource'
import TagDictResource from '../../../../models/tag-dict/resources'
import {QUERY_ENGINE} from 'common/constants'
import _ from 'lodash'
import Resource from '../../../../models/resource'
import {convertTagsValue} from 'common/convertTagsValue'
import {getTagTrees} from '../../../../actions/tag-tree'
import Fetch, {serialized} from '../../../../common/fetch-final'
import {DIMENSION_TYPES} from '../../../../../common/constants'
import {tagFiltersAdaptToOldFormat} from '../../../../../common/param-transform'

const $resource = {
  tagTypes: Resource.create('/app/tag-type/get')
}
const Def = {
  microcosmicData: {}, //微观数据
  tagsInfo: [], //所有标签信息
  message: {},
  microcosmicId: '',
  microcosmicUserGroups: [],
  tagsType: [],
  queryKey: '',
  queryDim: '',
  tagCategory: [],
  tagCategoryMap: [],
  userGroups: [],
  loadding: false,
  displayPanel: 'baseTags',
  tagsLineHeight: 0,
  queryLikeValues: [],
  queryLikeLoadding: false,
  customOrder: undefined
}

const TagFilterOp = {
  lessThanOrEqual: 'lessThanOrEqual',
  greaterThan: 'greaterThan',
  in: 'in',
  equal:'equal'
}

const Action = {
  queryMicrocosmicId: 'query-microcosmic-id',
  getMicrocosmicInfo: 'get-microcosmic-info',
  change: 'chang-state',
  getTagsInfo: 'get-tag-info',
  queryLike: 'query-like-values'
}

const Actions = {
  async queryMicrocosmicId(commonMetric, tagDatasourceName, where, done) {
    // sql查询uindex接口数据
    const sql = `SELECT ${commonMetric} FROM \`${tagDatasourceName}\` WHERE  ${where.name}='${where.value}'`
    const { result } = await DruidQueryResource.sql(sql, QUERY_ENGINE.UINDEX)
    if (result.length) {
      done({ microcosmicId: result[0][commonMetric] })
    } else {
      done({ message: { type: 'error', content: '未查询到匹配用户' }, microcosmicId: '', microcosmicData: {}, tagsInfo: {},microcosmicUserGroups: [], queryKey: undefined, queryDim: undefined })
    }
  },

  // 获取tag相关信息
  async getTagsInfo(projectId, datasourceId, done) {
    // 子标签
    const { result } = await TagDictResource.findAllValid(projectId)
    // 标签分类
    let tagCategory = await getTagTrees(datasourceId, {
      parentId: 'all',
      queryType: 'all'
    }, false)(_.noop)
    tagCategory = _.get(tagCategory, 'result.trees') || []
    
    //用户群
    let q = serialized({
      where: {
        druid_datasource_id: datasourceId
      }
    })
    const userGroups = await Fetch.get(`/app/usergroup/get${q}`)
    // 标签关系
    const tagCategoryMap = await $resource.tagTypes.get({},{ where: { datasource_id: datasourceId } }).json()

    let res = await Fetch.get(`/app/custom-orders/get/${datasourceId}?dataType=global`)
    let customOrder = _.get(res, 'result.tags_order') || []

    done({ customOrder, tagCategory, tagsType: result, tagCategoryMap: _.get(tagCategoryMap, 'result', []), userGroups: _.get(userGroups, 'result', []) })
  },

  async getMicrocosmicInfo(state, where, project, dataSourceDimensions, commonMetric, done) {
    const { tagsType } = state
    // sql查询uindex接口数据
    let sql = `SELECT * FROM \`${project.tag_datasource_name}\` WHERE  ${where.name}='${where.value}'`
    let childProjectId = project.parent_id ? project.id : null
    const { result } = await DruidQueryResource.sql(sql, QUERY_ENGINE.UINDEX, childProjectId)
    if (result.length) {
      let res = convertTagsValue(result, tagsType, dataSourceDimensions)
      const microcosmicUserGroups = getMicrocosmicUserGroup(dataSourceDimensions, state.userGroups, result[0])
      done({ microcosmicData: result[0], tagsInfo: res[0], microcosmicUserGroups, microcosmicId: _.get(result[0], commonMetric, '') })
    } else {
      done({ microcosmicId: '', microcosmicData: {}, tagsInfo: {},microcosmicUserGroups: [], queryKey: undefined, queryDim: undefined, message: { type: 'error', content: '未查询到匹配用户' } })
    }
  },
  
  async queryLike(where, project, done) {
    // sql查询uindex接口数据
    let sql = `SELECT distinct ${where.name} FROM \`${project.tag_datasource_name}\` WHERE  ${where.name} like '${where.value}%' limit 10`
    let childProjectId = project.parent_id ? project.id : null
    const { result } = await DruidQueryResource.sql(sql, QUERY_ENGINE.UINDEX, childProjectId)
    if (result.length) {
      done({ queryLikeValues: result.map(p => p[where.name]) })
    } else {
      done({ queryLikeValues: [] })
    }
  }
}

function getMicrocosmicUserGroup(dataSourceDimensions, userGroups, microcosmicInfo) {
  if (_.isEmpty(microcosmicInfo)) {
    return []
  }
  let dimNameDict = _.keyBy(dataSourceDimensions, 'name')
  return userGroups.filter(p => {
    let ugTagFilters = _.get(p, 'params.composeInstruction[0].config.tagFilters') || []
    let {relation, tagFilters} = tagFiltersAdaptToOldFormat(ugTagFilters)

    if (!tagFilters.length) return false
    if(relation === 'and') {
      return !_.some(tagFilters, f => {
        return !equalTagFilter(f, _.get(microcosmicInfo, f.col), dimNameDict)
      })
    } else {
      return _.some(tagFilters, f => {
        return equalTagFilter(f, _.get(microcosmicInfo, f.col), dimNameDict)
      })
    }
  }).map(p => p.title)
}

function equalTagFilter(filter, tagVal, dimNameDict) {
  const { op, col, eq, containsNull } = filter
  if (_.startsWith(op, 'not ')) {
    return !equalTagFilter({...filter, op: op.substr(4)}, tagVal, dimNameDict)
  }
  let eqArr = _.isArray(eq) ? eq : _.compact([eq])
  if (op === 'and') {
    return _.every(eqArr.map(flt0 => ({...filter, ...flt0})), flt => equalTagFilter(flt, tagVal, dimNameDict))
  } else if (op === 'or') {
    return _.some(eqArr.map(flt0 => ({...filter, ...flt0})), flt => equalTagFilter(flt, tagVal, dimNameDict))
  }

  if (op === TagFilterOp.in) {
    if (containsNull && (tagVal === '--' || _.isNil(tagVal))) {
      return true
    }
    if (dimNameDict[col] && dimNameDict[col].type === DIMENSION_TYPES.string) {
      return _.includes(eq, tagVal)
    }
    const [min, max] = eq
    if (min === max) {
      return min === tagVal
    }
    return min < tagVal && tagVal <= max
  }

  if (op === TagFilterOp.greaterThan) {
    return eq < tagVal
  }
  if (op === TagFilterOp.lessThanOrEqual) {
    return tagVal <= eq
  }
  if (op === TagFilterOp.equal) {
    return _.isArray(eq) ? _.includes(eq, tagVal) : eq === tagVal
  }
  console.warn('Unimplemented filter val checker: ', filter)
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.change:
      return { ...state, ...action.payload }
    case Action.queryMicrocosmicId:
      return Actions.queryMicrocosmicId(action.payload.commonMetric, action.payload.tagDatasourceName, action.payload.where, done)
    case Action.getMicrocosmicInfo:
      return Actions.getMicrocosmicInfo(state, action.payload.where, action.payload.project,
        action.payload.dataSourceDimensions, action.payload.commonMetric, done)
    case Action.getTagsInfo:
      return Actions.getTagsInfo(action.payload.projectId, action.payload.datasourceId, done)
    case Action.queryLike:
      return Actions.queryLike(action.payload.where, action.payload.project, done)
    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
