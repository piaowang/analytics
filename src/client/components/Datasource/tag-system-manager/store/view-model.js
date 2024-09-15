import _ from 'lodash'
import Fetch from 'client/common/fetch-final'
import * as bus from '../../../../databus/datasource'
import { DimDatasourceType } from 'common/constants'
import { remoteUrl } from 'client/constants/interface'
import { PAGE_VIEW } from './constants'
import { findTreeNode } from './utils'
import { notification } from 'antd'
import { getTagGroups } from '../../../../actions/tag-groups'
import {typesBuilder} from '../../../TagManager/tag-type-list'

const prefix = 'tag-type-tree'
const Action = {
  list: `${prefix}-list`,
  save: `${prefix}-save`,
  dimensionList: `${prefix}-dimension-list`,
  updateState: `${prefix}-update-state`,
  change: `${prefix}-change`,
  getRoles: `${prefix}-get-roles`,
  saveOrder: `${prefix}-save-order`,
  buildTreeData: `${prefix}-build-tree-data`,
  getTagGroup: `${prefix}-get-tag-groups`
}

const Def = {
  loading: false,
  saveing: false,
  roles: [],
  pageView: PAGE_VIEW.MAIN_TREE,// tree, table
  rightContentView: PAGE_VIEW.MAIN_TREE_RIGHT_TAG_TYPE_INFO,
  rightPageView: '0',// 右边页面类型：0=标签分类信息，1=标签信息，2=添加标签分类；3=添加标签页面
  treeList: [], // (所有)标签分类树列表
  dimensionList: [], // (所有)标签维度列表
  search: '',
  selectedTreeNode: {}, // 当前选中树节点对象
  isTagDimension: false, // 当前选中节点是否为标签维度
  selectedTagDimension: {}, // 当前选中标签维度对象
  seletedTagTypeTree: {}, // 当前选中标签分类节点对象
  selectedKeys: [], // 当前选中树节点key
  expandedKeys: [], // 当前展开的树节点key
  autoExpandParent: false,
  tagTypes: [], // 已分类标签维度
  treeData: [], // 标签树型数据结构,
  selectedParentTreeNode: undefined,
  tagGroups: [], //组合标签
  projectCurrent: null,
  datasourceCurrent: null,
  tagProject: null,
  tagDatasource: null
}

const Actions = {
  /**
   * 查询标签分类列表
   * @param {String} projectId
   * @param {Function} done
   */
  async list(params, done) {
    const { project: { datasource_id } } = params
    const res = await Fetch.get(`/app/tag-type-tree/list/${datasource_id}`, { parentId: 'all', queryType: 'all' })
    if (!res || !res.success) {
      return
    }
    const ttRes = await Fetch.get('/app/tag-type/get', { where: {
      datasource_id
    }})
    const { trees: treeList } = res.result
    const tagTypes = ttRes.result || []
    done({
      tagTypes,
      treeList,
      loading: false
    })
  },

  /**
   * @description 获取标签维度列表
   * @param {any} datasource
   */
  async dimensionList(params, done) {
    const { datasource_id } = params
    //把停用中的标签也请求回来
    const includeNotUsing = true
    const res = await bus.getDimensions(datasource_id, {
      datasource_type: DimDatasourceType.tag,
      includeNotUsing: includeNotUsing
    })
    const dimensionList = res.total > 0 ? res.data || [] : []
    done({ dimensionList })
  },

  /**
   * @description 保存或更新标签分类
   * @param {any} state
   * @param {any} tagTypeTree
   * @param {any} done 
   */
  async save(state, tagTypeTree, done) {
    let { treeList } = state
    if (tagTypeTree.id) { // 更新
      const ret = await Fetch.put(`/app/tag-type-tree/update/${tagTypeTree.id}`, {...tagTypeTree})
      if (!ret || !ret.success) {
        done({saveing: false})
        return ret
      }
      notification.success({
        message: '提示',
        description: '操作成功'
      })
      const idx = _.findIndex(treeList, (o) => o.id === tagTypeTree.id)
      _.update(treeList, `[${idx}]`, () => tagTypeTree)
      done({
        tagTypeTree,
        treeList: [...treeList],
        saveing: false
      })
    } else { // 新增
      const ret = await Fetch.post('/app/tag-type-tree/create', {...tagTypeTree})
      if (!ret || !ret.success) {
        done({saveing: false})
        return ret
      }
      notification.success({
        message: '提示',
        description: '操作成功'
      })
      done({
        tagTypeTree: ret.result,
        // 新增分类插入到未分类之前
        treeList: [...treeList, ret.result],
        saveing: false
      })
    }
  },

  // 删除标签分类
  async remove(state, { id, parentId }, done) {
    const { treeData, projectCurrent } = state
    // 传递 name 和 dsId 仅仅为了日志解释
    const ret = await Fetch.delete(`/app/tag-type-tree/remove/${id}`, {
      name: _(treeData).chain().find({treeId: id}).get('type').value(),
      datasource_id: projectCurrent.datasource_id
    })
    if (!ret || !ret.success) {
      done({loading: false})
      return
    }
    const treeList = _.cloneDeep(state.treeList)
    let tagTypes = _.cloneDeep(state.tagTypes)
    tagTypes = tagTypes.filter(p => p.tag_tree_id !== id)
    _.remove(treeList, o => o.id === id)
    findTreeNode(treeData, id, (item, idx, arr) => {
      arr.splice(idx, 1) // 移除标签
    })
    done({
      treeData: [...treeData],
      selectedKeys: [],
      treeList: [...treeList],
      loading: false,
      tagTypes
    })
  },

  async getRoles(state, params, done) {
    let res = await Fetch.get(remoteUrl.GET_ROLES)
    if (!res) return
    done({
      roles: res.result
    })
  },

  async saveOrder(state, { datasource_id, ...rest }, done) {
    const ret = await Fetch.post(`/app/tag-type-tree/save-order/${datasource_id}`, {
      ...rest
    })
    if (ret.success) {
      notification.success({
        message: '提示',
        description: '操作成功'
      })
    } else {
      notification.warn({
        message: '提示',
        description: '操作失败'
      })
    }
    done()
  },

  /**
   * @description 构建标签分类数据结构
   * @param {any} state
   * @param {any} params 
   * @param {any} done 
   */
  async buildTreeData(state, params, done) {
    const { tagGroups } = params
    const { dimensionList: dimensions, tagTypes, treeList: tagTrees, tagDatasource } = state
    const exlueds = ['__time', 'distinct_id']
    const { types: treeData } = await typesBuilder({
      dimensions: dimensions.filter(d => !_.includes(exlueds, d.name)),
      tagTypes,
      tagTrees,
      datasourceCurrent: tagDatasource,
      filterDimensions: false, // 管理界面不过滤维度
      tagGroups
    })
    done({
      treeData, tagGroups
    })
  }
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.list:
      return Actions.list(action.payload, done)
    case Action.dimensionList:
      return Actions.dimensionList(action.payload, done)
    case Action.save:
      return Actions.save(state, action.payload, done)
    case Action.remove:
      return Actions.remove(state, action.payload, done)
    case Action.getRoles:
      return Actions.getRoles(state, action.payload, done)
    case Action.saveOrder:
      return Actions.saveOrder(state, action.payload, done)
    case Action.buildTreeData:
      return Actions.buildTreeData(state, action.payload, done)
    case Action.change:
      return {
        ...state,
        ...action.payload
      }
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
