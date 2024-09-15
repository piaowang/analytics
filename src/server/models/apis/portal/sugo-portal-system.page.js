//营销h5页面路由菜单 和console-pages下的区分开来
const base = {
  lib: 'controllers/page.controller',
  func: 'console',
  requireLogin: true,
  requirePermission: true,
  method: 'get',
  class: '门户系统',
  menusCate: ['智能运营', '数据智能门户']
}

/**
 * 平台所有需要权限控制的路由配置
 */
const routes = [
  {
    path: '/my-workbench',
    title: '访问我的工作台',
    class: '门户系统',
    group: '我的工作台',
    menusCate: ['智能运营', '数据智能门户', '我的工作台']
  },
  {
    path: '/app-store',
    title: '访问应用中心',
    class: '门户系统',
    group: '应用中心',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    path: '/application-management',
    title: '访问应用管理',
    group: '应用管理',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    path: '/search',
    title: '搜索应用',
    class: '管理中心',
    requirePermission: false,
    group: '应用管理',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'console/portal'
}
