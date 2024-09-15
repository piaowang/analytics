
import _ from 'lodash'
import trackService from '../../../models/track/resource'
import { utils } from 'next-reader'
import { APP_TYPE } from '../constants'
import {
  dimBindingToDataBinds,
  dataBindsToDimBinding,
  getClickEventProp,
  getScreenShot,
  getShortenEventPath
} from '../trackOpertion2'
import { getTags } from '../../../databus/datasource'
import TrackEventDraftResource from '../../../models/track-event-draft/resource'
import DruidQuery from '../../../models/druid-query/resource'

const Action = {
  delPageInfo: utils.short_id(),
  getDimensionsByToken: utils.short_id(),
  draftPageList: utils.short_id(),
  savePageInfo: utils.short_id(),
  eventScreenshot: utils.short_id(),
  saveEvent: utils.short_id(),
  copyEvents: utils.short_id(),
  deployEvent: utils.short_id(),
  showEditEvent: utils.short_id(),
  getTrackEvents: utils.short_id(),
  getTag: utils.short_id(),
  change: utils.short_id(),
  default: utils.short_id(),
  delEvent: utils.short_id(),
  getPageInfo: utils.short_id(),
  savePageCategories: utils.short_id(),
  getPageCategories: utils.short_id(),
  displayEvent: utils.short_id()
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
  showEventBinds: false,            //隐藏现有埋点
  webViewHashCode: '',              //当前显示的webviewhashcode
  appMultiViews: [],                 //当前页面所有webview元素
  displayList: {},                  //记录隐藏的控件
  h5ControlClass: {},               //h5控件样式Map
  xwalkScreenshots: {},
  editEventPath: false,             //编辑eventpath属性
  classAttr: {}
}

const Actions = {
  /**
  * 删除页面信息
  *
  * @param {any} data
  * @returns
  */
  async delPageInfo(state, done) {
    let { currentActivity, pageMap, currentUrl } = state
    let pageKey = currentUrl ? currentUrl : currentActivity
    const pageinfoId = pageMap[pageKey].id
    const res = await trackService.delPageInfo({ pageInfoId: pageinfoId })
    if (res.success) {
      let pageInfoMap = _.omit(_.cloneDeep(pageMap), [pageKey])
      done({ pageMap: pageInfoMap, message: { type: 'success', message: '删除成功' } })
    } else {
      done({ message: { type: 'error', message: '删除失败' } })
    }
  },
  /**
   * 获取维度
   *
   * @param {any} query
   * @returns
   */
  async getDimensionsByToken(state, done) {
    const res = await trackService.getDimensionsByToken({ token: state.token })
    if (res.success) {
      done({ dimensions: res.result })
    } else {
      done({ message: { type: 'error', message: '获取维度失败' } })
    }
  },
  /**
   * 获取页面信息列表
   *
   * @param {any} query
   * @returns
   */
  async draftPageList(state, done) {
    let { token, appVersion } = state
    const res = await trackService.draftPageList({ token, app_version: appVersion })
    if (res.success) {
      let pageInfoMap = _.keyBy(res.result, 'id')
      done({ pageInfoMap })
    } else {
      done({ message: { type: 'error', message: '获取页面信息列表是失败' } })
    }
  },
  /**
   * 保存页面信息
   *
   * @param {any} data
   * @returns
   */
  async savePageInfo(state, payload, done) {
    const { pageProp } = payload
    let { token, appVersion, pageMap } = state
    let pageInfo = {
      page_name: pageProp.page_name.trim(),
      similar: false,
      page: pageProp.currentUrl,
      category: pageProp.category,
      code: pageProp.code,
      is_submit_point: pageProp.is_submit_point
    }
    let res = await trackService.savePageInfo({
      token: token,
      app_version: appVersion,
      pageInfos: [pageInfo]
    })
    if (res.success) {
      let newPageMap = _.cloneDeep(pageMap) || {}
      newPageMap[pageInfo.page] = res.result || {}
      done({
        pageMap: newPageMap,
        message: { type: 'success', message: '保存成功' }
      })
    } else {
      done({
        message: { type: 'error', message: '保存失败' }
      })
    }
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
      token, appVersion, editEventInfo, similarEventMap,
      trackEventMap, imgUrl, xwalkScreenshots, viewMap
    } = state
    //获取事件form中的属性
    let { eventProp } = payload

    if (!eventProp.event_name || eventProp.event_name.trim() === '') {
      done({ message: { type: 'error', message: '事件名不能为空' } })
      return
    }

    editEventInfo = {
      ...editEventInfo,
      ..._.pick(eventProp, ['event_name','advance','similar','cross_page','tags','code','old_event_path','extend_value', 'class_attr'])
    }
    if (eventProp.event_path) {
      editEventInfo.event_path = eventProp.event_path
    }
    if (eventProp.event_type) {
      editEventInfo.event_type = eventProp.event_type
    }
    if (!eventProp.similar) {
      editEventInfo.similar_path = ''
    }

    let newEvent = _.pick(editEventInfo, [
      'type', 'position', 'activity', 'viewHashCode',
      'event_path', 'page', 'event_type', 'event_path_type',
      'event_name', 'advance', 'code', 'delegate', 'control_event',
      'similar', 'tags', 'similar_path', 'old_event_path', 'class_attr', 'extend_value'
    ])
    //原生app 没有全局有效选项
    if (newEvent.event_path_type !== APP_TYPE.h5) {
      newEvent.code = JSON.stringify(dimBindingToDataBinds(editEventInfo.dim_binding, newEvent.event_path_type))
      newEvent.dim_mode = false
    } else {
      newEvent.cross_page = editEventInfo.cross_page
      if (newEvent.advance) {
        newEvent.binds = dimBindingToDataBinds(editEventInfo.dim_binding, newEvent.event_path_type)
      }
    }

    let eventKey = newEvent.page + '::' + (newEvent.old_event_path || newEvent.event_path)
    let event = trackEventMap[eventKey]
    if (event) {
      let eqFields = ['id', 'event_path', 'event_name', 'code', 'advance', 'similar', 'event_type', 'tags', 'binds', 'cross_page', 'similar_path', 'class_attr', 'extend_value']
      if (_.isEqual(_.pick(event, eqFields), _.pick(newEvent, eqFields))) {
        done({ message: { type: 'notice', message: '无数据修改' } })
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
      let newState = { editEventInfo , trackEventMap}
      // 记录新保存同类事件	    
      if (newEvent.similar) {
        similarEventMap = { ...similarEventMap }
        _.set(similarEventMap, [newEvent.page, newEvent.event_path], newEvent.similar_path)
        newState.similarEventMap = similarEventMap
      }
      done(newState)
    } else {
      done({ message: { type: 'error', message: '保存失败' } })
    }
  },

  async displayEvent(state, store, payload, done) {
    let { editEventInfo, displayList, imgUrl, xwalkScreenshots, viewMap } = state
    let { eventKey } = payload
    let newDisplayList = _.cloneDeep(displayList)
    if (!eventKey) {
      eventKey = editEventInfo.page + '::' + editEventInfo.event_path
    }
    if (_.get(displayList, [eventKey], '')) {
      newDisplayList = _.omit(newDisplayList, [eventKey])
    } else {
      _.set(newDisplayList, [eventKey],
        {
          event_path: editEventInfo.event_path,
          page: editEventInfo.page,
          event_name: editEventInfo.event_name || '无'
        })
    }
    if (!store.screenShotMap[eventKey]) {
      let img = await getScreenShot(imgUrl, editEventInfo, xwalkScreenshots, viewMap)
      store.screenShotMap[eventKey] = img
    }
    done({ displayList: newDisplayList })
  },
  /**
   * 复制事件
   *
   * @param {any} data
   * @returns
   */
  async copyEvents(state, done) {
    const { token, appVersion, selectCopyVersion } = state
    const res = await TrackEventDraftResource.copyAppEvents(
      { app_id: token, app_version: selectCopyVersion },
      { app_id: token, app_version: appVersion },
      ''
    )
    if (res.success) {
      done({ message: { type: 'success', message: '复制成功' }, eventCopyPanelVisible: false })
    } else {
      done({ message: { type: 'error', message: '复制失败' } })
    }
  },
  /**
   * 复制事件
   *
   * @param {any} data
   * @returns
   */
  async deployEvent(state, done) {
    const { token, appVersion } = state
    const res = await trackService.deployEvent({
      token: token,
      app_version: appVersion
    })
    if (res.success) {
      done({ message: { type: 'success', message: '部署成功' } })
    } else {
      done({ message: { type: 'error', message: '部署失败' } })
    }
  },
  //获取点击元素的属性
  showEditEvent: (state, payload, done) => {
    let {
      editEventInfo: lastEditEvent, trackEventMap = {}, currentActivity,
      iosContent, iosViewMap, iosMainView, currentUrl, viewMap, allTags
    } = state
    let { viewHashCode, position, eventPathType } = payload
    //如果是选择上报数据模式 就添加dim_binding中属性
    if (lastEditEvent && lastEditEvent.dim_mode) {
      lastEditEvent = { ...lastEditEvent }
      lastEditEvent.dim_binding = getDimBinding(state, viewHashCode, eventPathType)
      done({ editEventInfo: lastEditEvent })
    } else {
      let editEventInfo = {}
      editEventInfo.position = position
      editEventInfo.event_name = ''
      // if (eventPathType === APP_TYPE.ios || eventPathType === APP_TYPE.android) {
      //   editEventInfo.page = currentActivity
      //   editEventInfo.viewHashCode = viewHashCode
      // }
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
      let event = trackEventMap[eventKey]
      if (event) {
        if (eventPathType === APP_TYPE.h5) {
          editEventInfo.dim_binding = dataBindsToDimBinding(event.binds, eventPathType)
        } else if (eventPathType !== APP_TYPE.h5 && event.code && event.code.trim()) {
          editEventInfo.dim_binding = dataBindsToDimBinding(JSON.parse(event.code), eventPathType)
        }
        editEventInfo = {
          ...editEventInfo,
          ..._.pick(event, ['class_attr','event_name', 'code', 'advance', 'similar', 'cross_page', 'event_type', 'tags', 'extend_value']),
          similar_path: event.similar_path || editEventInfo.event_path
        }
      } else {
        editEventInfo.code = ''
        editEventInfo.advance = false
        editEventInfo.similar = false
        editEventInfo.cross_page = false
        editEventInfo.tags = []
        editEventInfo.dim_binding = []
        editEventInfo.similar_path = editEventInfo.event_path
      }
      editEventInfo.event_path_type = eventPathType
      editEventInfo.all_tags = allTags
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
      done({ message: { type: 'error', message: '删除失败，事件不存在' } })
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
      if (eventKey === [editEventInfo.page, editEventInfo.event_path].join('::')) {
        editEventInfo = { ...editEventInfo, similar: false, similar_path: '' }
        newState.editEventInfo = editEventInfo
      }
      done(newState)
    } else {
      done({ message: { type: 'error', message: '删除失败' } })
    }
  },
  //根据Appversion获取埋点信息，如果没有埋点信息则获取appversion列表
  async getTrackEvents(state, done) {
    let { token, appVersion } = state
    let { result } = await trackService.draftEventList({ token, app_version: appVersion })
    let eventCopyPanelVisible = false
    let appVersions = []
    let trackEventMap = {}
    let similarEventMap = {}
    let crossPageEventArr = []
    let selectCopyVersion = {}
    let h5EventBindsPath = []
    if (result && result.length) {
      result.map(p => {
        let eventKey = [p.page, p.event_path].join('::')
        trackEventMap[eventKey] = p
        if (p.event_path_type === APP_TYPE.h5) {
          if (p.similar) {
            // 兼容老数据 当同类选中 但没有:nth-child(n) 就判定为历史数据 生成新规则
            const similarPath = p.similar_path
              ? p.similar_path
              : p.event_path.replace(/:nth-child\([0-9]*\)/g, ':nth-child(n)')
            trackEventMap[eventKey].similar_path = p.similar_path || similarPath
            const pageSimilars = _.get(similarEventMap, [p.page], {})
            similarEventMap = { ...(similarEventMap || {}), [p.page]: { ...pageSimilars, [p.event_path]: similarPath } }
          }
          if (p.cross_page) {
            crossPageEventArr.push(p.event_path)
          }
        }
      })
    } else {
      let resVersions = await trackService.getAppVersion({ token })
      appVersions = resVersions.result.filter(p => p.app_version !== appVersion).map(p => p.app_version)
      if (appVersions.length) {
        selectCopyVersion = appVersions[0]
        eventCopyPanelVisible = true
      }
    }
    done({
      trackEventMap,
      appVersions,
      selectCopyVersion,
      eventCopyPanelVisible,
      similarEventMap,
      crossPageEventArr,
      h5EventBindsPath
    })
  },
  async getTags(state, done) {
    const res = await getTags(state.token, { type: 'track_event' })
    done({ allTags: res.data || [] })
  },
  async getPageInfo(state, done) {
    const res = await trackService.getPageInfo({ token: state.token, app_version: state.appVersion })
    if (res.success) {
      done({ pageMap: _.keyBy(res.result, p => p.page) || [] })
    } else {
      done({ message: { type: 'error', message: res.message } })
    }
  },
  async savePageCategories(state, done) {
    const res = await trackService.savePageCategories({ token: state.token, app_version: state.appVersion, models: state.pageCategories })
    if (res.success) {
      done({})
    } else {
      done({ message: { type: 'error', message: res.message } })
    }
  },
  async getPageCategories(state, done) {
    const res = await trackService.getPageCategories({ appid: state.token, app_version: state.appVersion })
    if (res.success) {
      done({ pageCategories: res.result || [] })
    } else {
      done({ message: { type: 'error', message: res.message } })
    }
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
    case Action.copyEvents:
      return Actions.copyEvents(state, done)
    case Action.delPageInfo:
      return Actions.delPageInfo(state, done)
    case Action.deployEvent:
      return Actions.deployEvent(state, done)
    case Action.draftPageList:
      return Actions.draftPageList(state, done)
    case Action.eventScreenshot:
      return Actions.eventScreenshot(state, this.store, action.payload, done)
    case Action.getDimensionsByToken:
      return Actions.getDimensionsByToken(state, done)
    case Action.saveEvent:
      return Actions.saveEvent(state, this.store, action.payload, done)
    case Action.savePageInfo:
      return Actions.savePageInfo(state, action.payload, done)
    case Action.showEditEvent:
      return Actions.showEditEvent(state, action.payload, done)
    case Action.delEvent:
      return Actions.deleteEvent(state, this.store, action.payload, done)
    case Action.getTrackEvents:
      return Actions.getTrackEvents(state, done)
    case Action.getPageInfo:
      return Actions.getPageInfo(state, done)
    case Action.getPageCategories:
      return Actions.getPageCategories(state, done)
    case Action.savePageCategories:
      return Actions.savePageCategories(state, done)
    case Action.displayEvent:
      return Actions.displayEvent(state, this.store, action.payload, done)
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

//高级模式下获取点击控件 将路径添加到 eventDimBinding
const getDimBinding = function (state, viewHashCode, type) {
  let { editEventInfo, iosContent, viewMap } = state
  let eventDimBinding = editEventInfo.dim_binding || []
  let path
  if (type === APP_TYPE.android) {
    path = _.get(viewMap, [viewHashCode, 'eventPath'])
  } else if (type === APP_TYPE.ios) {
    // path = JSON.stringify(iosContent.idsAssociationOfBindable()[viewHashCode].path)
    path = JSON.stringify(_.get(iosContent.associationOfBindableMap, `${viewHashCode}.path`))
  } else {
    path = viewHashCode.path
  }
  if (!eventDimBinding.find(p => p.path === path)) {
    eventDimBinding.push({ dimension: '', similar: editEventInfo.similar, path: path })
  }
  return eventDimBinding
}
