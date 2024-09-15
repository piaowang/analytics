import { Store, storeViewModelCreator } from 'sugo-store'
import Vm, { Action as VmAction } from './view-model'
import _ from 'lodash'

/**
 * @param {String} type
 * @param {Object} [payload={}]
 * @return {{type: String, payload: Object}}
 */
function struct(type, payload = {}) {
  return { type, payload }
}

class Creator extends Store {
  constructor() {
    super()
    storeViewModelCreator([Vm], this)
    this.initialize()
  }

  async dispatchAsyn(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * 获取初始化数据
   *
   * @param {ProjectStoreModel} project
   * @return {Creator}
   */
  async initViewListModel(project, datasource) {
    this.datasourceCurrentMdoel = datasource
    this.projectCurrentModel = project
    this.dispatch(struct(VmAction.change, { listLoading: true }))
    await this.dispatchAsyn([
      struct(VmAction.getTagValueEnhanceList, { proj_id: project.id }),
      struct(VmAction.getTagList, { datasource: datasource }),
      struct(VmAction.getDimensionList, { datasource: datasource })
    ])
    this.dispatch(struct(VmAction.change, { listLoading: false }))
    return this
  }
  /**
     * 修改状态
     *
     * @param {ProjectStoreModel} state
     * @return {Creator}
     */
  changeState = async (state) => {
    await this.dispatchAsyn(struct(VmAction.change, state))
    return this
  }

  save = async (data) => {
    this.dispatch(struct(VmAction.change, { saveing: true }))
    await this.dispatchAsyn(struct(VmAction.saveTagValueEnhance, data))
    if (this.state.vm.message.type === 'error') {
      await this.dispatch(struct(VmAction.change, { message: {} }))
    } else {
      await this.dispatch(struct(VmAction.change, { saveing: false, listLoading: true, addPanelVisible: false, message: {} }))
      await this.dispatchAsyn(struct(VmAction.getTagValueEnhanceList, { proj_id: this.projectCurrentModel.id }))
      this.dispatch(struct(VmAction.change, { listLoading: false }))
    }
    return this
  }

  recalculate = async (id) => {
    this.dispatch(struct(VmAction.change, { saveing: true }))
    await this.dispatchAsyn(struct(VmAction.recalculateValueEnhance, { id }))
    await this.dispatchAsyn(struct(VmAction.getTagValueEnhanceList, { proj_id: this.projectCurrentModel.id }))
    this.dispatch(struct(VmAction.change, { saveing: false }))
    return this
  }

  deleteTagEnhance = async (id) => {
    this.dispatch(struct(VmAction.change, { listLoading: true }))
    await this.dispatchAsyn(struct(VmAction.delTagValueEnhance, { id }))
    await this.dispatch(struct(VmAction.change, { message: {} }))
    await this.dispatchAsyn(struct(VmAction.getTagValueEnhanceList, { proj_id: this.projectCurrentModel.id }))
    this.dispatch(struct(VmAction.change, { listLoading: false }))
    return this
  }

  getTagChildren = async (dimName) => {
    this.dispatch(struct(VmAction.change, { quering: true }))
    const { dimensions } = this.state.vm
    let dimension = dimensions.find(p => p.name === dimName)
    await this.dispatchAsyn(struct(VmAction.getTagChildren,
      {
        dimension,
        projectCurrent: this.projectCurrentModel,
        datasourceCurrent: this.datasourceCurrentMdoel
      }
    ))
    this.dispatch(struct(VmAction.change, { quering: false }))
    return this
  }

  editTagEnhance = async (model) => {
    const { dimensions } = this.state.vm
    await this.dispatchAsyn(struct(VmAction.change, { listLoading: true }))
    let dimension = dimensions.find(p => p.name === model.tag)
    await this.dispatchAsyn([
      struct(VmAction.getTagChildren,
        {
          dimension,
          projectCurrent: this.projectCurrentModel,
          datasourceCurrent: this.datasourceCurrentMdoel
        }
      ),
      struct(VmAction.change, { addPanelVisible: true, model, listLoading: false })
    ])
    return this
  }

  showAddPanel = async () => {
    await this.dispatchAsyn(struct(VmAction.change, { model: {}, selectTagChildren: [] }))
    await this.dispatchAsyn(struct(VmAction.change, { addPanelVisible: true }))
  }
}

export default Creator
