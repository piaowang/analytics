const ctrl = 'controllers/livefeed-fullscreen.controller'

const base = {
  requireLogin: false,
  requirePermission: false,
  lib: ctrl,
  class: '图表',
  group: '实时大屏',
  menusCate: ['智能运营', '数据可视化', '数据大屏', '实时大屏']
}

const routes = [
  {
    path: '/livefeed-fullscreen/:livefeedId',
    title: '大屏展示',
    method: 'get',
    func: 'livefeedFullscreen'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
