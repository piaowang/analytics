import { Store, storeViewModelCreator } from 'sugo-store'
import _ from 'lodash'
import Vm, { Action as VmAction } from './view-model'
import Ws, { Action as WsAction, initSocket } from './webScoketManager'

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

  chagePagePath = async (val) => {
    const { pageMap, editPageInfo, appMultiViews, webViewHashCode } = this.state.vm
    const page = appMultiViews.find(p => p.hashCode.toString() === val)
    let pageInfo = _.get(pageMap, [page.currentUrl], {})
    const newSatate = {
      webViewHashCode: val.toString(),
      editPageInfo: {
        ...editPageInfo,
        page: page.currentUrl,
        defaultPageName: page.pageName,
        page_name: pageInfo.page_name,
        isH5: page.isH5
      }
    }
    await this.dispatchAsyn(struct(VmAction.change, newSatate))
  }
}

export default Creator
