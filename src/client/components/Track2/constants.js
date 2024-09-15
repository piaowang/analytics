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
  UIRectEdgeAll:  1 << 0 | 1 << 1 | 1 << 2 | 1 << 3
}

const UIScrollViewContentInsetAdjustmentBehavior =  {
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
