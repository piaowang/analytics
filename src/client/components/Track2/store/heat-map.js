import { Store, storeViewModelCreator } from 'sugo-store'
import _ from 'lodash'
import Vm, { Action as VmAction } from './heat-map-view-model'
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
 * 初始化热图
 * 创建webScoket, 获取维度、tags、分类 信息
 *
 * @param {string} token
 * @param {string} appType 版本
 * @param {string} secretKey
 * @memberof Creator
 */
  async initHeatMapModel(token, appType, secretKey, datasourceId, projectId) {
    console.log('===========>创建ws')
    await this.dispatchAsyn(struct(VmAction.change, { loading: { trackLoading: true } }))
    this.WsClient = await initSocket(token, secretKey, this)
    await this.dispatchAsyn([
      struct(VmAction.change, { token, appType, isHeatMap: true, datasourceId, projectId })
    ])
    let newState = { loading: { trackLoading: false } }
    if (this.state.vm.message) {
      newState.message = null
    }
    await this.dispatchAsyn(struct(VmAction.change, newState))
    await this.dispatchAsyn(struct(VmAction.getHeatMapList, { projectId, appType }))
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
   * 获取设备信息
   *
   * @memberof Creator
   */
  getDeviceInfo = async () => {
    await this.dispatchAsyn(struct(WsAction.getDeviceInfo))
    await this.dispatchAsyn(struct(VmAction.getTrackEvents))
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
   * 修改状态
   *
   * @param {any} newState
   * @memberof Creator
   */
  changeState = async newState => {
    await this.dispatchAsyn(struct(VmAction.change, newState))
  }

  /**
   * 
   * 获取埋点热图信息 
   */
  heatMapEventQuery = async (params) => {
    const { isVisualization } = this.state.vm
    await this.dispatchAsyn(struct(VmAction.getHeatMapData, { isVisualization, ...params }))
  }

  saveHeatMap = async (name, params) => {
    await this.dispatchAsyn(struct(VmAction.change, { saving: true }))
    await this.dispatchAsyn(struct(VmAction.saveHeatMap, { name, params }))
    await this.dispatchAsyn(struct(VmAction.change, { saving: false }))
  }

  /**
 * 获取图片
 *
 * @param {any} style
 * @memberof Creator
 */
  getHeatMapScreenshot = async (screenshotId) => {
    if (!screenshotId) {
      return
    }
    await this.dispatchAsyn(struct(VmAction.getHeatMapScreenshot, { screenshotId }))
  }


  /**
 * 获取图片
 *
 * @param {any} style
 * @memberof Creator
 */
  removeHeatMap = async (id) => {
    await this.dispatchAsyn(struct(VmAction.removeHeatMap, { id }))
  }

  showHeatEvent = async (path, position) => {
    await this.dispatchAsyn(struct(VmAction.change, { selectEventPath: path, eventGroupPosition: position }))
  }

  setHideList = async () => {
    const { displayList, selectEventPath } = this.state.vm
    const newList = displayList.includes(selectEventPath) ? displayList.filter(p => p !== selectEventPath) : [...displayList, selectEventPath]
    await this.dispatchAsyn(struct(VmAction.change, { displayList: newList }))
  }
   
  // getHeatMapList = async (projectId, searchKey, appType) => {
  //   await this.dispatchAsyn(struct(VmAction.getHeatMapList, { projectId, searchKey, appType }))
  // }

}

export default Creator
