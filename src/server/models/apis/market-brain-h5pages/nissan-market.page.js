//营销h5页面路由菜单 和console-pages下的区分开来
const base = {
  lib: 'controllers/page.controller',
  func: 'nissanmarketMobileEntry',
  //TODO
  requireLogin: false,
  requirePermission: false,
  method: 'get',
  class: '营销大脑H5',
  group: '营销大脑H5管理'
}

/**
 * 平台所有需要权限控制的路由配置
 */
const routes = [
  {
    path: '/user-list',
    title: '用户列表',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  }, {
    path: '/user-detail',
    title: '客户画像',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  }, {
    path: '/add-wechat',
    title: '客户画像',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'nissan-market'
}
