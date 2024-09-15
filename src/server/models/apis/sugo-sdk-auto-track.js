const sdkCtrl = 'controllers/sugo-sdk-auto-track.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: sdkCtrl,
  group: 'SDK埋点'
}

const routes = [
  {
    path: '/get/track-events',
    title: '获取可视化配置事件列表',
    method: 'get',
    func: 'getTrackEvents'
  }, {
    path: '/saveevent',
    title: '/saveevent',
    method: 'post',
    func: 'saveEvent'
  }, {
    path: '/get/event-screenshot',
    title: '/get/event-screenshot',
    method: 'get',
    func: 'getEventSreenshot'
  }, {
    path: '/del-event',
    title: '删除事件',
    method: 'post',
    func: 'deleteAutoTrackEvent'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/sdk-auto-track'
}
