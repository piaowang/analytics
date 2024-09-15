import { Store, storeViewModelCreator, storeModelCreator } from 'sugo-store'

import BusinessDbSetting, { Action as SettingAction } from '../../../models/business-db-setting'
import Loading, { Action as LoadingAction } from './loading'
import Vm, { Action as VmAction } from './view-model'
import Dim from '../../../models/dimension'
import _ from 'lodash'
import { BUSINESS_SETTING_MESSAGE_TYPE as messageType } from '../../../models/business-db-setting/constants'

/**
 * @param {String} type
 * @param {Object} [payload={}]
 * @return {{type: String, payload: Object}}
 */
function struct(type, payload = {}) {
  return { type, payload }
}

/**
 * @typedef {Object} AccessDataTaskState
 * @property {ProjectStoreModel} Project
 * @property {AccessDataTaskStoreModel} AccessDataTask
 * @property {AccessToolsLoading} Loading
 */

class Creator extends Store {
  constructor() {
    super()
    storeModelCreator([BusinessDbSetting], this)
    storeViewModelCreator([Vm, Loading, Dim], this)
    this.initialize()
  }

  async dispatchAsyn(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * 查看业务表列表
   *
   * @param {ProjectStoreModel} project
   * @return {Creator}
   */
  initViewListModel(project) {
    this.dispatch(struct(LoadingAction.loading, { loading: true }))
    this.dispatch([
      struct(VmAction.list, { company_id: project.company_id }),
      struct(VmAction.dimensionList, { datasource_id: project.datasource_id })],
    state => {
      this.dispatch(struct(LoadingAction.loading, { loading: false }))
    }
    )
    return this
  }

  /**
  * 编辑模式
  * @param {String} id
  * @return {Creator}
  */
  async initEditModel(id) {
    const { settingList } = this.state.vm
    const setting = settingList.find(r => r.id === id)
    let dispatchs = [
      struct(VmAction.change, { modalVisible: true }),
      struct(SettingAction.change, { ...setting })
    ]
    if (setting) dispatchs.push(struct(VmAction.testingConnection, { encrypted: true }))
    await this.dispatchAsyn(dispatchs)
    this.clearMessage()
    return this
  }

  /**
   * 取消编辑模式
   * @return {Creator}
   */
  hideModalVisible = () => {
    this.dispatch([
      struct(VmAction.change, { modalVisible: false, testOk: false }),
      struct(SettingAction.default)
    ])
    return this
  }

  /**
   * 筛选
   * @return {Creator}
   */
  serach(serach) {
    this.dispatch(struct(VmAction.change, { serach }))
    return this
  }

  /**
   * 修改属性
   *
   * @param {any} obj
   * @memberof Creator
   */
  changeProp = (val) => {
    this.dispatch(struct(SettingAction.change, val))
    if (['db_type', 'db_jdbc', 'table_name', 'db_user', 'db_pwd'].indexOf(_.keys(val)[0]) >= 0) {
      this.dispatch(struct(VmAction.change, { testOk: false }))
    }
    return this
  }

  /**
   * 保存数据
   *
   * @memberof Creator
   */
  saveInfo = async (projectid, isUindex) => {
    this.dispatch(struct(LoadingAction.loading, { updateing: true }))
    await this.dispatchAsyn(struct(SettingAction.create, { project_id: projectid, isUindex }))
    if (this.state.BusinessDbSetting.message) {
      if (this.state.BusinessDbSetting.message.type === messageType.error) {
        await this.clearMessage()
        return this
      }
      await this.clearMessage()
    }
    this.dispatch([
      struct(VmAction.list, { company_id: this.state.BusinessDbSetting.company_id }),
      struct(VmAction.change, { modalVisible: false, testOk: false }),
      struct(LoadingAction.loading, { updateing: false }),
      struct(SettingAction.default)
    ])
    return this
  }

  /**
   * 测试连接
   *
   * @memberof Creator
   */
  testConnection = async () => {
    this.dispatch(struct(LoadingAction.loading, { testing: true }))
    await this.dispatchAsyn(struct(VmAction.testingConnection))
    await this.clearMessage()
    this.dispatch(struct(LoadingAction.loading, { testing: false }))
    return this
  }
  /**
   * 修改启用禁用状态
   *
   * @memberof Creator
   */
  updateState = async (id, state, dataSourceId) => {
    await this.dispatchAsyn(struct(VmAction.updateState, { id, status: state, dataSourceId }))
    await this.clearMessage()
    return this
  }
  /**
   * 删除
   *
   * @memberof Creator
   */
  delete = async (id) => {
    const { settingList } = this.state.vm
    this.dispatch(struct(LoadingAction.loading, { loading: true }))
    const setting = settingList.find(r => r.id === id)
    await this.dispatchAsyn([
      struct(SettingAction.change, { ...setting }),
      struct(SettingAction.del, { id })
    ])
    await this.clearMessage()
    this.dispatch([
      struct(LoadingAction.loading, { loading: false }),
      struct(VmAction.list, { company_id: setting.company_id }),
      struct(SettingAction.default)
    ])
    return this
  }

  /**
   * 清空消息
   *
   * @memberof Creator
   */
  clearMessage = async () => {
    await this.dispatchAsyn([
      struct(SettingAction.change, { message: null }),
      struct(VmAction.change, { messages: null })
    ])
  }
}

export default Creator
