const base = {
  requireLogin: false,
  requirePermission: false
}

/**
 * 配置不需要登录验证的路由
 */
const routes = [
  {
    path: '/listen-wx-event',
    title: '微信事件监听初始化',
    method: 'get',
    lib: 'controllers/market-brain/wechat.controller',
    func: 'initListenWxEvent'
  },
  {
    path: '/listen-wx-event',
    title: '微信事件监听',
    method: 'post',
    lib: 'controllers/market-brain/wechat.controller',
    func: 'listenWxEvent'
  },
  {
    path: '/update-staff-table',
    title: '微信事件监听',
    method: 'post',
    lib: 'controllers/market-brain/wechat.controller',
    func: 'updateSomeStaff'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'market-brain/wechat'
}
