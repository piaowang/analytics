/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 * @desc 用户列表view model
 *
 * # 操作流程
 * 1. 创建一个标签类型的用户分群；在分群列表中添加当前面页入口
 * 2. 该页面的路径为 /console/tag/insight/:project_id/:group_id?
 *    如果没有传group_id，则取project下的第一个标签类型的分群
 */

import { VIEW_STATE, VIEW_TYPE } from './constants'
import Actions from './actions'

/**
 * @typedef {Object} ParamTags
 * @property {string} col
 * @property {string} op
 * @property {Array<*>} eq
 */

/**
 * @typedef {Object} TagUserGroupListViewModel
 * @property {?ProjectModel} ProjectModel
 * @property {?DataSourceModel} DataSourceModel
 *
 * @property {number} view_state          - 显示类型：列表、画像
 * @property {number} view_type           - 视图类型：标签、普通两种状态
 * @property {?string} member_uuid        - 搜索内容
 * @property {Array<string>} fields       - 所有字段id
 * @property {Array<ParamTags>} tags      - 传入到该页面的标签限制值
 * @property {Array<string>} omitDims     - 忽略的维度
 *
 * @property {Array<Object>} dataSource                      - 表格内容
 * @property {Array<Object>} columns                         - 表格各列数据
 * @property {Array<TagGalleryGroupModel>} galleries         - 标签画像数据
 * @property {Array<TagGalleryGroupModel>} entireGalleries   - 标签全部用户画像数据
 *
 * @property {number} page_current        - 当前页码
 * @property {number} page_total          - 数据条数
 * @property {number} page_size           - 每页显示多少条
 *
 * @property {?string} cur_segment        - 当前选中的分群id
 * @property {Array<string>} cur_fields   - 当前选中的字段id
 * @property {?string} cur_types          - 当前选中的标签分类，值为tag.id
 *
 * @property {number} user_total          - 当前项目总用户数
 * @property {number} tags_user           - 当前过滤条件下部共多少人
 *
 * @property {Array<{type:string, children:Array<DimensionModel>}>} types
 * @property {Array<DimensionModel>} dimensions
 * @property {Object<string, DimensionModel>} dimNameDict
 * @property {Array<TagTypeModel>} tagTypes
 * @property {Array<string>} selectedTags
 * @property {string} uuidFieldName
 * @property {Array<string>} tagEnhanceUserIds -价值升档信息
 */

/** @type {TagUserGroupListViewModel} */
const Def = {
  // cache
  ProjectModel: null,
  DataSourceModel: null,
  isMarketingModel: false, //是否是营销模型
  // state
  view_state: VIEW_STATE.LIST,
  view_type: VIEW_TYPE.NORMAL,
  member_uuid: void 0,
  fields: [],
  galleries: [],
  entireGalleries: [],
  tags: [],
  omitDims: ['__time'],

  // table properties
  dataSource: [],
  columns: [],

  // pages
  page_current: 1,
  page_total: 0,
  page_size: 10,

  // state
  cur_segment: null,
  cur_fields: [],
  cur_types: null,

  // counter
  user_total: 0,
  tags_user: 0,

  // tag types
  types: [],
  dimensions: [],
  dimNameDict: {},
  tagTypes: [],
  activeTypes: [],
  activeTreeIds: [],
  selectedTags: [],
  uuidFieldName: '',
  tagEnhanceInfo: {}
}

/**
 * @param {string} mark
 * @return {string}
 */
function creator (mark) {
  return `view-model-tag-user-list-${mark}`
}

const Action = {
  initialTagTypes: creator('initialTagTypes'),
  queryUserCount: creator('query-user-count'),
  flush: creator('flush'),
  change: creator('change'),
  getTagEnhance: creator('get-enhance')
}

/**
 * @param {TagUserGroupListViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @this {ViewModel}
 */
function scheduler (state, action, done) {
  const { type, payload } = action

  switch (type) {

    case Action.queryUserCount:
      Actions.queryUserCount(payload.tags, payload.project, payload.relation, payload.tagsUser || 0, this.store.state.VM.dimensions, done)
      break

    case Action.flush:
      Actions.flush(this.store.state, state, done)
      break

    case Action.initialTagTypes:
      Actions.initialTagTypes(payload, state, done)
      break

    case Action.getTagEnhance:
      Actions.getTagEnhance(payload.tagEnhanceId, done)
      break

    case Action.change:
      done({
        ...state,
        ...payload
      })
      break

    default:
      done({})
  }
}

export default {
  name: 'VM',
  state: { ...Def },
  scheduler
}

export {
  Action
}
