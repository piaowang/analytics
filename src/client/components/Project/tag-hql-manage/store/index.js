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

export default class TagHqlManageStore extends Store {

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
   * @param {ProjectStoreModel} project
   * @return {TagHqlManageStore}
   */
  initViewListModel(project) {
    this.dispatch(struct(VmAction.change, {project_id: project.id, loading: true}))
    this.dispatch([
      struct(VmAction.list, { project_id: project.id }),
      struct(VmAction.dimensionList, { datasource_id: project.datasource_id })],
    () => {
      this.dispatch(struct(VmAction.change, { loading: false }))
    }
    )
    return this
  }

  /**
  * 编辑模式
  * @param {String} id
  * @return {TagHqlManageStore}
  */
  async initEditModel(id) {
    const { hqlList } = this.state.vm
    const [tagHQL] = hqlList.filter(r => r.id === id)
    this.dispatch(struct(VmAction.change, { tagHQL, modalVisible: true }))
    return this
  }

  /**
   * 隐藏模态框
   * @return {TagHqlManageStore}
   */
  hideModalVisible = (key = 'modalVisible') => {
    if(_.isObject(key)) {
      key = 'modalVisible'
    }
    this.dispatch(struct(VmAction.change, { [key]: false }))
    return this
  }

  /**
   * 筛选
   * @return {TagHqlManageStore}
   */
  search(search) {
    const {project_id, dimensionList} = this.state.vm
    // 支持关联维度搜索
    const tags = _.filter(dimensionList, d => _.includes(_.toLower(d.title || d.name), _.toLower(search))).map(d => d.id)
    this.dispatch(struct(VmAction.change, {search, loading: true}))
    this.dispatch(struct(VmAction.list, { project_id, search, tags }))
    return this
  }

  /**
   * @description 分页处理
   * @param {any} page
   * @param {any} pageSize
   * @returns
   * @memberOf TagHqlManageStore
   */
  paging(page, pageSize) {
    const {project_id} = this.state.vm
    this.dispatch(struct(VmAction.change, {loading: true, page, pageSize}))
    this.dispatch(struct(VmAction.list, { project_id, page, pageSize }))
    return this
  }

  queryList(search, selectedStatus) {
    const {project_id, page, pageSize } = this.state.vm
    const status = _.toNumber(selectedStatus)
    this.dispatch(struct(VmAction.change, {loading: true }))
    this.dispatch(struct(VmAction.list, { project_id, page, pageSize, search, status }))
    return this
  }

  /**
   * 保存数据
   * @memberof TagHqlManageStore
   */
  save = async (model) => {
    this.dispatch(struct(VmAction.change, { saveing: true }))
    await this.dispatchAsyn(struct(VmAction.save, { ...model }))
    return this
  }

  /**
   * 删除
   * @memberof TagHqlManageStore
   */
  async remove(id) {
    const {pageSize} = this.state.vm
    this.dispatch(struct(VmAction.change, { loading: true }))
    await this.dispatchAsyn(struct(VmAction.remove, id))
    await this.paging(1, pageSize)
    return this
  }

  /**
   * @description 手动执行
   * @returns
   * @memberOf TagHqlManageStore
   */
  async manualRun(tagHQL) {
    this.dispatch(struct(VmAction.change, { [`running-${tagHQL.id}`]: true }))
    await this.dispatchAsyn(struct(VmAction.manualRun, { tagHQL }))
    return this
  }

  /**
   * @description 启动/停止
   * @returns
   * @memberOf TagHqlManageStore
   */
  async run(tagHQL, optType) {
    this.dispatch(struct(VmAction.change, { loading: true }))
    await this.dispatchAsyn(struct(VmAction.run, { tagHQL, optType }))
    return this
  }

  /**
   * @description 标签数据导入
   * @param {any} id
   * @memberOf TagHqlManageStore
   */
  dataImport = () => {
    this.dispatch(struct(VmAction.change, { dataImportVisible: true }))
    return this
  }

  /**
   * 保存数据
   * @memberof TagHqlManageStore
   */
  saveDataImport = async (projectId, uploadResults, fileInfo ) => {
    this.dispatch(struct(VmAction.change, { saveing: true }))
    await this.dispatchAsyn(struct(VmAction.dataImport, { projectId, uploadResults, fileInfo }))
    return this
  }

  /**
   * @description 取消手动执行
   * @memberOf TagHqlManageStore
   */
  cancelManualRun = async (tagHQL) => {
    this.dispatch(struct(VmAction.change, { [`running-${tagHQL.id}`]: true, [`cancel-${tagHQL.id}`]: true }))
    await this.dispatchAsyn(struct(VmAction.cancelManualRun, { tagHQL }))
    return this
  }
}
