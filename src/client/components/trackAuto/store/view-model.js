
import _ from 'lodash'
import trackService from '../../../models/auto-track/resource'
import { utils } from 'next-reader'
import { APP_TYPE } from '../constants'
import {message} from 'antd'
import {
  getClickEventProp,
  getScreenShot,
  getShortenEventPath
} from '../trackOpertion2'
const Action = {
  getDimensionsByToken: utils.short_id(),
  draftPageList: utils.short_id(),
  eventScreenshot: utils.short_id(),
  saveEvent: utils.short_id(),
  showEditEvent: utils.short_id(),
  getTrackEvents: utils.short_id(),
  change: utils.short_id(),
  default: utils.short_id(),
  delEvent: utils.short_id()
}

const def = {
  iosViewMap: {},
  iosMainView: {},
  currentActivity: {},            //当前页面容器ID
  imgUrl: '',                     //图片Url
  currentUrl: '',                 //页面url
  snapshot: {},                   //当前设备回传信息
  currentImageHash: '',           //当前显示的图片哈希
  appType: '',                    //埋点类型
  deviceInfo: {},                 //是设备信息
  testTitle: '',                  //显示测试信息
  appVersion: null,               //app版本
  eventImgPanelStyle: {
    position: 'absolute',
    display: 'none',
    top: 0,
    left: 0,
    visible: false
  },
  iosContent: null,
  iosEventMap: {
    'UIButton': 64,
    '_UIStepperButton': 64,
    'UIDatePicker': 4096,
    'UISegmentedControl': 4096,
    'UISlider': 4096,
    'UISwitch': 4096,
    'UITextField': 65536,
    'UISearchBarTextField': 65536
  },
  eventCopyPanelVisible: false,     //显示复制面板
  appVersions: [],                  //版本集合
  selectCopyVersion: null,          //选择的复制版本号
  similarEventMap: {},             //同类元素map
  testMessage: [],                  //测试信息
  testMode: false,                  //测试窗体
  loading: {
    eventLoading: false,            //事件加载
    pageLoading: false,             //页面加载
    trackLoading: false,            //埋点界面加载
    categotiesLoading: false
  },
  dimensions: [],                   //维度信息
  categories: [],                    //页面分类集合
  crossPageEventArr: [],            //事件全局
  message: null,
  pageInfoMap: {},                  //页面map
  token: '',                        //token
  eventSnapshot: {},                //事件截图内容***
  editPageInfo: {},                 //当前修改的页面信息
  editEventInfo: {},                //当前修改的事件信息
  allTags: [],                      //事件tag
  //eventList
  onlyShowCurrentPageEvent: false,  //只显示当前页面事件
  searchEvent: '',                  //事件查询
  showEventModal: false,            //点击时在弹窗里头显示路径跟元素,
  currentTrackEventDetail: {},      //事件明细
  selectEvent: {},                  // 当前选中的事件
  categotiesMode: false,
  leftPanelSelect: '',
  showEventBinds: true,            //隐藏现有埋点
  webViewHashCode: "",              //当前显示的webviewhashcode
  appMultiViews: [],                 //当前页面所有webview元素
  displayList: {},                  //记录隐藏的控件
  h5ControlClass: {},               //h5控件样式Map
  xwalkScreenshots: {},
  editEventPath: false,            //编辑eventpath属性
  trackEventMap: {}
}

const Actions = {

  /**
   * 获取维度
   *
   * @param {any} query
   * @returns
   */
  async getDimensionsByToken(state, done) {
    // const res = await trackService.getDimensionsByToken({ token: state.token })
    // if (res.success) {
    done({ dimensions: [] })
    // } else {
    //   done({ message: { type: 'error', message: '获取维度失败' } })
    // }
  },


  /**
   * 获取事件图片
   *
   * @param {any} data
   * @returns
   */
  async eventScreenshot(state, store, payload, done) {
    let { selectEvent } = payload
    let eventKey = [selectEvent.page, selectEvent.event_path].join('::')
    if (!store.screenShotMap[eventKey]) {
      const res = await trackService.eventScreenshot({ screenshot_id: selectEvent.screenshot_id })
      store.screenShotMap[eventKey] = res.result
      if (res.result) {
        done({})
        return
      }
    }
    let { shortEventPath, fullEventPath } = getShortenEventPath(selectEvent)
    let trackEventDraftDetail = {
      'currentPage': selectEvent.page,
      'currentEventName': selectEvent.event_name,
      'currentEventPath': shortEventPath,
      'currentFullEventPath': fullEventPath,
      'currentImageUrl': `data:image/png;base64,${store.screenShotMap[eventKey]}`
    }
    done({ currentTrackEventDetail: trackEventDraftDetail })
  },
  /**
   * 保存事件
   *
   * @param {any} data
   * @returns
   */
  async saveEvent(state, store, payload, done) {
    let {
      token, appVersion, editEventInfo,
      trackEventMap, imgUrl, xwalkScreenshots, viewMap
    } = state
    //获取事件form中的属性
    let { eventProp } = payload

    if (!eventProp.event_name || eventProp.event_name.trim() === '') {
      message.error('事件名不能为空')
      return
    }

    editEventInfo = {
      ...editEventInfo,
      ...eventProp
    }
    if (eventProp.event_path) {
      editEventInfo.event_path = eventProp.event_path
    }
    if (eventProp.event_type) {
      editEventInfo.event_type = eventProp.event_type
    }


    let newEvent = _.pick(editEventInfo, [
      'type', 'position', 'activity', 'viewHashCode',
      'event_path', 'page', 'event_type', 'event_path_type',
      'event_name', 'delegate', 'control_event',
      'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_content', 'sugo_autotrack_page_path', 'event_memo'
    ])

    let eventKey = newEvent.page + '::' + (newEvent.old_event_path || newEvent.event_path)
    let event = _.get(trackEventMap, [eventKey])
    if (event) {
      let eqFields = ['id', 'event_type', 'event_path_type', 'event_name', 'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_content', 'sugo_autotrack_page_path', 'event_memo']
      if (_.isEqual(_.pick(event, eqFields), _.pick(newEvent, eqFields))) {
        message.error('无数据修改')
        return
      }
      newEvent = { ...event, ...newEvent, opt: 'update' }
    } else {
      newEvent.opt = 'insert'
    }

    if (!store.screenShotMap[eventKey]) {
      let img = await getScreenShot(imgUrl, newEvent, xwalkScreenshots, viewMap)
      store.screenShotMap[eventKey] = img
    }
    newEvent.screenshot = store.screenShotMap[eventKey] || null
    const res = await trackService.saveEvent({
      token,
      app_version: appVersion,
      events: [newEvent]
    })

    if (res.success) {
      trackEventMap = _.cloneDeep(trackEventMap)
      trackEventMap[eventKey] = _.omit(newEvent, 'id')
      editEventInfo.component = editEventInfo.event_path_type === APP_TYPE.h5
        ? _.get(JSON.parse(editEventInfo.event_path || '{}'), 'path')
        : editEventInfo.event_path
      let newState = { editEventInfo, trackEventMap }
      message.success('保存成功')
      done(newState)
    } else {
      message.error('保存失败')
    }
  },

  //获取点击元素的属性
  showEditEvent: (state, payload, done) => {
    let {
      editEventInfo: lastEditEvent, trackEventMap = {}, currentActivity,
      iosContent, iosViewMap, iosMainView, currentUrl, viewMap
    } = state
    let { viewHashCode, position, eventPathType } = payload
    //如果是选择上报数据模式 就添加dim_binding中属性
    if (lastEditEvent && lastEditEvent.dim_mode) {
      lastEditEvent = { ...lastEditEvent }
      done({ editEventInfo: lastEditEvent })
    } else {
      let editEventInfo = {}
      editEventInfo.position = position
      editEventInfo.event_name = ''
      let eventProp = getClickEventProp(eventPathType,
        { iosViewMap, iosContent, androidViewMap: viewMap },
        viewHashCode,
        currentActivity,
        iosMainView,
        currentUrl)
      editEventInfo = { ...editEventInfo, ...eventProp }
      let eventKey = [editEventInfo.page, editEventInfo.event_path].join('::')
      if (eventKey === [lastEditEvent.page, lastEditEvent.event_path].join('::')) {
        done()
        return
      }
      let event = _.get(trackEventMap, [eventKey])
      if (event) {
        editEventInfo = {
          ...editEventInfo,
          ..._.pick(event, ['event_name', 'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_content', 'sugo_autotrack_page_path', 'event_memo'])
        }
      }
      editEventInfo.event_path_type = eventPathType
      done({
        editEventInfo,
        leftPanelSelect: 'eventEdit',
        editEventPath: false
      })
    }
  },
  //删除事件
  async deleteEvent(state, store, payload, done) {
    let {
      token, appVersion, eventImgPanelStyle,
      trackEventMap, similarEventMap, editEventInfo
    } = state

    let { eventKey } = payload
    let delEvent = trackEventMap[eventKey]
    if (!delEvent) {
      message.error('删除失败，事件不存在')
      return
    }
    let res = await trackService.saveEvent({
      token: token,
      app_version: appVersion,
      events: [{ id: delEvent.id, opt: 'delete', screenshot_id: _.get(delEvent, 'screenshot_id', '') }]
    })

    if (res.success === true) {
      let newTrackEventMap = _.cloneDeep(trackEventMap)
      store.screenShotMap = _.omit(store.screenShotMap, [eventKey])
      let newState = {
        eventImgPanelStyle: { ...eventImgPanelStyle, visible: false },
        trackEventMap: _.omit(newTrackEventMap, [eventKey])
      }
      let pageSimilars = _.get(similarEventMap, [delEvent.page], {})
      if (delEvent.similar_path && pageSimilars[delEvent.event_path]) {
        pageSimilars = _.omit(pageSimilars, [delEvent.event_path])
        similarEventMap = { ...similarEventMap, [delEvent.page]: pageSimilars }
        newState.similarEventMap = similarEventMap
      }
      if (eventKey === [editEventInfo.page, editEventInfo.event_path].join("::")) {
        editEventInfo = { ...editEventInfo, similar: false, similar_path: '' }
        newState.editEventInfo = editEventInfo
      }
      message.success('删除成功')
      done(newState)
    } else {
      message.error('删除失败')
    }
  },
  //根据Appversion获取埋点信息，如果没有埋点信息则获取appversion列表
  async getTrackEvents(state, done) {
    let { token, appVersion } = state
    let { result } = await trackService.eventList({ token, app_version: appVersion })
    let trackEventMap = {}
    if (result && result.length) {
      result.map(p => {
        let eventKey = [p.page, p.event_path].join('::')
        trackEventMap[eventKey] = p
      })
    }
    done({ trackEventMap })
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
    case Action.eventScreenshot:
      return Actions.eventScreenshot(state, this.store, action.payload, done)
    case Action.getDimensionsByToken:
      return Actions.getDimensionsByToken(state, done)
    case Action.saveEvent:
      return Actions.saveEvent(state, this.store, action.payload, done)
    case Action.showEditEvent:
      return Actions.showEditEvent(state, action.payload, done)
    case Action.delEvent:
      return Actions.deleteEvent(state, this.store, action.payload, done)
    case Action.getTrackEvents:
      return Actions.getTrackEvents(state, done)
    case Action.default:
      return def
    case Action.change:
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...def }
}

export {
  Action
}
