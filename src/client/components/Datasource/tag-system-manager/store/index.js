import { Store, storeViewModelCreator } from 'sugo-store'
import Vm, { Action as VmAction } from './view-model'
import _ from 'lodash'
import { KEY_NONE_TYPE } from 'common/constants'

/**
 * @param {String} type
 * @param {Object} [payload={}]
 * @return {{type: String, payload: Object}}
 */
function struct(type, payload = {}) {
  return { type, payload }
}

export default class TagTypeTreeStore extends Store {

  constructor() {
    super()
    storeViewModelCreator([Vm], this)
    this.initialize()
  }

  async dispatchAsyn(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * 列表初始化
   * @param projectCurrent
   * @param datasourceCurrent
   * @param tagProject
   * @param tagDatasource
   * @param tagGroups
   * @return {TagTypeTreeStore}
   */
  async initPageData(projectCurrent, datasourceCurrent, tagProject, tagDatasource, tagGroups) {
    this.dispatch(struct(VmAction.change, {project_id: projectCurrent.id, loading: true}))
    await this.dispatchAsyn([
      struct(VmAction.list, { project: projectCurrent }),
      struct(VmAction.dimensionList, { datasource_id: projectCurrent.datasource_id }),
      // struct(VmAction.getTagGroup, { id: project.datasource_id }),
      struct(VmAction.getRoles),
      struct(VmAction.change, {
        projectCurrent,
        datasourceCurrent,
        tagProject,
        tagDatasource
      })
    ])
    const { treeList: tagTrees } = this.state.vm
    await this.dispatchAsyn(struct(VmAction.buildTreeData, {tagGroups}))
    const { treeData } = this.state.vm
    const keys = [treeData && treeData.length > 0 ? _.get(treeData, '[0]', {}).treeId : KEY_NONE_TYPE]
    const seletedTagTypeTree  = _.get(tagTrees.filter(t => _.includes(keys, t.id)), '[0]', {})
    const selectedTreeNode = {
      props: {
        dataRef: seletedTagTypeTree
      }
    }
    this.dispatch(struct(VmAction.change, {
      loading: false,
      treeData,
      defaultExpandedKeys: keys,
      defaultSelectedKeys: keys,
      expandedKeys: keys,
      selectedKeys: keys,
      seletedTagTypeTree,
      selectedTreeNode
    }))
    return this
  }

  /**
   * 保存数据
   * @memberof TagTypeTreeStore
   */
  save = async (model, tagGroups) => {
    this.dispatch(struct(VmAction.change, { saveing: true }))
    await this.dispatchAsyn(struct(VmAction.save, { ...model }))
    await this.dispatchAsyn(struct(VmAction.buildTreeData, { tagGroups }))
    return this
  }

  /**
   * 删除
   * @memberof TagTypeTreeStore
   */
  remove = async (id, parentId = '-1', tagGroups) => {
    this.dispatch(struct(VmAction.change, { loading: true }))
    await this.dispatchAsyn(struct(VmAction.remove, {id, parentId}))
    await this.dispatchAsyn(struct(VmAction.buildTreeData, { tagGroups }))
    return this
  }

  setState = (change) => {
    this.dispatch(struct(VmAction.change, { ...change }))
  }

  /**
   * @description 保存标签分类树的排序和分类操作
   * @memberOf TagTypeTreeStore
   */
  saveOrder = async (datasource_id, modifyData) => {
    const { projectCurrent: project, tagGroups } = this.state.vm
    await this.dispatchAsyn([
      struct(VmAction.saveOrder, { datasource_id, ...modifyData }),
      struct(VmAction.list, { project }),
      struct(VmAction.buildTreeData, { tagGroups })
    ])
    return this
  }
}
