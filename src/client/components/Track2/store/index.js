import { Store, storeViewModelCreator } from 'sugo-store'
import _ from 'lodash'
import Vm, { Action as VmAction } from './view-model'
import Ws, { Action as WsAction, initSocket } from './webScoketManager'
import vmActions from '../../ErrorCode/store/vm-actions'
import { getPageCorssConfigByPath } from '../constants'

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
    this.WsClient = null
    this.screenShotMap = {}
    storeViewModelCreator([Vm, Ws], this)
    this.initialize()
  }

  async dispatchAsyn(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }
  /**
   * 初始化埋点界面
   * 创建webScoket, 获取维度、tags、分类 信息
   *
   * @param {string} token
   * @param {string} appType 版本
   * @param {string} secretKey
   * @memberof Creator
   */
  async initModel(token, appType, secretKey) {
    await this.dispatchAsyn(struct(VmAction.change, { loading: { trackLoading: true } }))
    console.log('===========>创建ws')
    this.WsClient = await initSocket(token, secretKey, this)
    await this.dispatchAsyn([
      struct(VmAction.change, { token, appType }),
      struct(VmAction.getDimensionsByToken),
      struct(VmAction.getTag)
    ])
    let newState = { loading: { trackLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn(struct(VmAction.change, newState))
  }

  /**
   * 退出埋点
   *
   * @memberof Creator
   */
  exitEdit = async () => {
    console.log('===========>关闭连接,清除定时器')
    await this.WsClient.close()
    this.WsClient = null
  }

  /**
   * 获取当前点击的event
   * 
   * @param {any} viewHashCode 
   * @param {any} position 
   * @param {any} eventPathType 
   * @memberof Creator
   */
  showEditEvent = async (viewHashCode, position, eventPathType) => {
    await this.dispatchAsyn(struct(VmAction.showEditEvent, { viewHashCode, position, eventPathType }))
  }

  /**
   * 获取设备信息
   *
   * @memberof Creator
   */
  getDeviceInfo = async () => {
    await this.dispatchAsyn(struct(WsAction.getDeviceInfo))
    await this.dispatchAsyn(struct(VmAction.getTrackEvents))
  }

  /**
   * 测试模式
   *
   * @memberof Creator
   */
  testEvent = async () => {
    await this.dispatchAsyn(struct(WsAction.testEvent))
  }

  /**
   * 部署事件
   * 
   * @memberof Creator
   */
  deployEvent = async () => {
    await this.dispatchAsyn(struct(VmAction.deployEvent))
    if (this.state.vm.message) {
      await this.dispatchAsyn(struct(VmAction.change, { message: null }))
    }
  }

  /**
   * 删除页面信息
   * 
   * @memberof Creator
   */
  deletePageInfo = async () => {
    await this.dispatchAsyn(struct(VmAction.change, { loading: { pageLoading: true } }))
    await this.dispatchAsyn(struct(VmAction.delPageInfo))
    let newState = { loading: { pageLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn(struct(VmAction.change, newState))
  }

  /**
   * 保存页面信息
   * 
   * @memberof Creator
   */
  savePageInfo = async pageProp => {
    await this.dispatchAsyn(struct(VmAction.change, { loading: { pageLoading: true } }))
    await this.dispatchAsyn(struct(VmAction.savePageInfo, { pageProp: { ...pageProp, currentUrl: this.state.vm.editPageInfo.page } }))
    let newState = { loading: { pageLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn([
      struct(VmAction.change, newState),
      struct(VmAction.getPageInfo)
    ])
  }

  /**
   * 删除事件
   * 
   * @memberof Creator
   */
  deleteEventInfo = async eventKey => {
    await this.dispatchAsyn(struct(VmAction.change, { loading: { eventLoading: true } }))
    await this.dispatchAsyn(struct(VmAction.delEvent, { eventKey }))
    let newState = { loading: { eventLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn(struct(VmAction.change, newState))
  }

  /**
   * 保存事件
   * 
   * @memberof Creator
   */
  saveEventInfo = async eventProp => {
    await this.dispatchAsyn(struct(VmAction.change, { loading: { eventLoading: true } }))
    await this.dispatchAsyn(struct(VmAction.saveEvent, { eventProp }))
    let newState = { loading: { eventLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn([
      struct(VmAction.change, newState),
      struct(VmAction.getTrackEvents)
    ])
  }

  /**
   * 修改Event样式
   * 
   * @param {any} eventStyle 
   * @memberof Creator
   */
  updateEventImgPanelStyle = async eventStyle => {
    await this.dispatchAsyn(struct(VmAction.change, { eventImgPanelStyle: eventStyle }))
  }

  /**
   * 复制事件
   * 
   * @memberof Creator
   */
  copyEvents = async () => {
    await this.dispatchAsyn(struct(VmAction.copyEvents))
    if (this.state.vm.message) {
      await this.dispatchAsyn(struct(VmAction.change, { message: null }))
    }
    await this.dispatchAsyn(struct(VmAction.getTrackEvents))
  }

  /**
   * 修改状态
   *
   * @param {any} newState
   * @memberof Creator
   */
  changeState = async newState => {
    await this.dispatchAsyn(struct(VmAction.change, newState))
  }

  /**
   * 获取图片
   *
   * @param {any} style
   * @memberof Creator
   */
  getEventScreenshot = async (style, selectEvent = {}) => {
    if(!selectEvent.screenshot_id) {
      return 
    }
    await this.dispatchAsyn([
      struct(VmAction.change, { eventImgPanelStyle: style }),
      struct(VmAction.eventScreenshot, { selectEvent })
    ])
  }

  /**
   * 关闭测试窗体
   * 
   * @memberof Creator
   */
  closeTestModel = async () => {
    await this.dispatchAsyn([
      struct(VmAction.change, { testMode: false }),
      struct(WsAction.closeTest)
    ])
  }

  savePageCategories = async () => {
    await this.dispatchAsyn(struct(VmAction.change, { loading: { categoriesLoading: true } }))
    await this.dispatchAsyn(struct(VmAction.savePageCategories))
    let newState = { loading: { eventLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn(struct(VmAction.change, newState))
  }

  chagePageCategories = async (index, propName, value) => {
    const { pageCategories } = this.state.vm
    let newPageCategories = _.cloneDeep(pageCategories)
    newPageCategories = _.set(newPageCategories, `[${index}].${propName}`, value)
    await this.dispatchAsyn(struct(VmAction.change, { pageCategories: newPageCategories }))
  }

  addPageCategories = async () => {
    const { pageCategories, token, appVersion } = this.state.vm
    let newPageCategories = _.cloneDeep(pageCategories)
    newPageCategories.push({ name: '', regulation: '', appid: token, app_version: appVersion })
    await this.dispatchAsyn(struct(VmAction.change, { pageCategories: newPageCategories }))
  }

  delPageCategories = async (index) => {
    const { pageCategories } = this.state.vm
    let newPageCategories = _.cloneDeep(pageCategories)
    _.remove(newPageCategories, (p, i) => i === index)
    await this.dispatchAsyn(struct(VmAction.change, { pageCategories: newPageCategories }))
  }

  chagePagePath = async (val) => {
    const { pageMap, editPageInfo, appMultiViews, webViewHashCode } = this.state.vm
    const page = appMultiViews.find(p => p.hashCode.toString() === val)
    const pageCorssConfig = getPageCorssConfigByPath(pageMap, page.currentUrl)
    let pageInfo = _.get(pageMap, [page.currentUrl], {})
    const newSatate = {
      webViewHashCode: val.toString(),
      editPageInfo: {
        ...editPageInfo,
        page: page.currentUrl,
        defaultPageName: page.pageName,
        page_name: pageInfo.page_name,
        isH5: page.isH5,
        ...pageCorssConfig
      }
    }
    await this.dispatchAsyn(struct(VmAction.change, newSatate))
  }

  editPathString = async (val) => {
    const { editPageInfo } = this.state.vm
    const newSatate = {
      editPageInfo: {
        ...editPageInfo,
        page: val
      }
    }
    await this.dispatchAsyn(struct(VmAction.change, newSatate))
  }

  displayEvent = async (val) => {
    await this.dispatchAsyn(struct(VmAction.displayEvent, { eventKey: val }))
  }
}

export default Creator
