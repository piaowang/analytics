import _ from 'lodash'

const APP_TYPE = {
  ios: 'ios',
  android: 'android',
  h5: 'h5'
}
const iOS_RENDERER = {
  Infinitus: 'Infinitus'
}
const EVENT_DIV_STYLE = {
  default: 'sdk-btn-shadow',
  bind: 'sdk-btn-shadow-bind',
  click: 'sdk-btn-shadow-click',
  dimBind: 'sdk-btn-shadow-dim-bind',
  similar: 'sdk-btn-shadow-similar',
  corssPage: 'sdk-btn-corss-page-bind',
  heatMap: 'sdk-btn-heat-map'
}
const FETCH_URL = {
  savePageInfo: '/app/sdk/save-page-info',
  saveEvent: '/app/sdk/saveevent',
  getPageInfoDraft: '/app/sdk/get/page-info-draft',
  getDimensions: '/app/sdk/get-dimensionsbytoken',
  getEventDraft: '/app/sdk/get/track-events-draft',
  getAppVersions: '/app/sdk/get/app-versions',
  getEventScreenshotDraft: '/app/sdk/get/event-screenshot-draft',
  deployEvent: '/app/sdk/deployevent',
  deletePageInfo: '/app/sdk/delete-page-info-draft',
  copyEvents: '/app/sdk/copyevents'
}
const BORDER_WIDTH = 2
const IOS_EVENT_MAP = {
  'UIButton': 64,
  '_UIStepperButton': 64,
  'UIDatePicker': 4096,
  'UISegmentedControl': 4096,
  'UISlider': 4096,
  'UISwitch': 4096,
  'UITextField': 65536,
  'UISearchBarTextField': 65536
}
const EVENT_TYPE = {
  types: {
    UIControlEventTouchDown: 1 << 0,
    UIControlEventTouchDownRepeat: 1 << 1,
    UIControlEventTouchDragInside: 1 << 2,
    UIControlEventTouchDragOutside: 1 << 3,
    UIControlEventTouchDragEnter: 1 << 4,
    UIControlEventTouchDragExit: 1 << 5,
    UIControlEventTouchUpInside: 1 << 6,
    UIControlEventTouchUpOutside: 1 << 7,
    UIControlEventTouchCancel: 1 << 8,
    UIControlEventValueChanged: 1 << 12,
    UIControlEventPrimaryActionTriggered: 1 << 13,
    UIControlEventEditingDidBegin: 1 << 16,
    UIControlEventEditingChanged: 1 << 17,
    UIControlEventEditingDidEnd: 1 << 18,
    UIControlEventEditingDidEndOnExit: 1 << 19,
    UIControlEventAllTouchEvents: 0x00000FFF,
    UIControlEventAllEditingEvents: 0x000F0000,
    UIControlEventApplicationReserved: 0x0F000000,
    UIControlEventSystemReserved: 0xF0000000,
    UIControlEventAllEvents: 0xFFFFFFFF
  },
  event: {
    UIButton: 'UIControlEventTouchUpInside',
    UIDatePicker: 'UIControlEventValueChanged',
    UISegmentedControl: 'UIControlEventValueChanged',
    UISlider: 'UIControlEventValueChanged',
    UISwitch: 'UIControlEventValueChanged',
    UITextField: 'UIControlEventEditingDidBegin',
    UISearchBarTextField: 'UIControlEventEditingDidBegin'
  },
  bindable: {
    UIControl: 'ui_control',
    UIView: 'ui_view',
    UITableView: 'ui_table_view',
    UITextView: 'ui_text_view',
    UICollectionView: 'ui_collection_view',
    UITableViewCell: 'ui_table_view_cell',
    UICollectionViewCell: 'ui_collection_view_cell'
  }
}
const CONTROLL_TYPE = {
  UIScrollView: 'UIScrollView',
  UITextView: 'UITextView',
  UIWebView: 'UIWebView',
  WKWebView: 'WKWebView',
  UITableView: 'UITableView',
  UIControl: 'UIControl',
  UIView: 'UIView',
  UICollectionView: 'UICollectionView',
  UICollectionViewCell: 'UICollectionViewCell',
  UITabBar: 'UITabBar',
  RTCControll: 'RTCControll',
  RCTRefreshControl: 'RCTRefreshControl',
  RCTScrollContentView: 'RCTScrollContentView',
  RCTScrollView: 'RCTScrollView',
  UITableViewCell: 'UITableViewCell',
  UILabel: 'UILabel'
}

const PAGE_TYPE = {
  UINavigationCol: 'UINavigationController',
  UITabBarCol: 'UITabBarController',
  UISplitViewCol: 'UISplitViewController',
  UIViewCol: 'UIViewController'
}


const UIRECTDGE = {
  UIRectEdgeNone: 0,
  UIRectEdgeTop: 1 << 0,
  UIRectEdgeLeft: 1 << 1,
  UIRectEdgeBottom: 1 << 2,
  UIRectEdgeRight: 1 << 3,
  UIRectEdgeAll: 1 << 0 | 1 << 1 | 1 << 2 | 1 << 3
}

const UIScrollViewContentInsetAdjustmentBehavior = {
  UIScrollViewContentInsetAdjustmentAutomatic: 0,
  UIScrollViewContentInsetAdjustmentScrollableAxes: 1,
  UIScrollViewContentInsetAdjustmentNever: 2,
  UIScrollViewContentInsetAdjustmentAlways: 3
}

const CONTROLL_PROP = {
  class: 'class',
  delegateSelector: 'delegate.selectors',
  delegateClass: 'delegate.class',
  htmlPage: 'htmlPage',
  propVal: 'properties.${property}.values[0].value'
}

const SKD_TRACKING_VERSION = 'trackingVersion'

export {
  APP_TYPE,
  iOS_RENDERER,
  EVENT_DIV_STYLE,
  FETCH_URL,
  BORDER_WIDTH,
  IOS_EVENT_MAP,
  EVENT_TYPE,
  CONTROLL_TYPE,
  CONTROLL_PROP,
  PAGE_TYPE,
  UIRECTDGE,
  UIScrollViewContentInsetAdjustmentBehavior,
  SKD_TRACKING_VERSION
}


// 通过页面路径获取配置信息
export const getPageCorssConfigByPath = (pageMap = {}, path) => {
  const keys = _.keys(pageMap).filter(p => p.indexOf('*') > 0)
  const key = keys.find(p => _.includes(path, p.replace('*', '')))
  if (!key) {
    return {}
  }
  const config = pageMap[key]
  return {
    page: config.page,
    code: config.code
  }
}

// websocket连接状态
export const WebSocketConnectStatus = {
  connectCreating: { type: 1, text: '创建连接中...' },
  connectFail: { type: 0, text: '创建连接失败' },
  webConnectSuccess: { type: 2, text: 'web连接成功' },
  mobileConnectSuccess: { type: 2, text: '手机连接成功' },
  webConnecting: { type: 1, text: 'web创建连接中...' },
  mobileConnecting: { type: 1, text: '手机创建连接中...' },
  mobileConnectClose: { type: 0, text: '手机连接关闭' }
}

export const EventType = [
  { value: 'click', text: '点击' },
  { value: 'focus', text: '获取焦点' },
  { value: 'submit', text: '提交' },
  { value: 'change', text: '修改' },
  { value: 'touchstart', text: '触碰开始' },
  { value: 'touchend', text: '触碰结束' }
]

/**
 * 获取事件唯一id， 兼容老数据没有新的上报路径则已event_id做唯一键,新数据用sugo_autotrack_page_path, sugo_autotrack_path, sugo_autotrack_position
 * 用于获取已埋点信息（trackEventMap）
 * @param {*} event 事件
 */
export const generateEventKey = (event) => {
  const { event_id, sugo_autotrack_page_path, sugo_autotrack_path, sugo_autotrack_position, event_path_type, event_path, page } = event
  // 兼容h5的路径生成
  if (event_path_type === APP_TYPE.h5) {
    return {
      eventKey: [page || sugo_autotrack_page_path, event_path || sugo_autotrack_path, '0']
        .filter(p => p !== undefined && p !== null).join('::'),
      eventId: event_id
    }
  }
  return {
    eventKey: [sugo_autotrack_page_path, sugo_autotrack_path, sugo_autotrack_position]
      .filter(p => p !== undefined && p !== null).join('::'),
    eventId: event_id
  }
}

/**
 * 获取埋点对应信息
 * @param {*} event 事件
 * @param {*} trackEventMap 事件map
 */
export const getTrackEventInfo = (event, trackEventMap) => {
  const { eventKey, eventId } = generateEventKey(event)
  if (!eventId) {
    return _.get(trackEventMap, [eventKey], false)
  }
  return _.get(trackEventMap, [eventKey]) || _.get(trackEventMap, [eventId], false)
}

export const APP_TRACK_TYPE = {
  // 普通埋点
  track: 'track',
  // 全埋点圈选
  autoTrack: 'trackauto',
  // 热图
  heatMap: 'heatMap'
}
