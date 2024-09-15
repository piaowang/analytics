//营销h5页面路由菜单 和console-pages下的区分开来
const base = {
  lib: 'controllers/page.controller',
  func: 'marketbrainMobileEntry',
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
    path: '/active-claim',
    title: '活动认领',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
  {
    path: '/claim-customer',
    title: '客户认领',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
  {
    path: '/claim-customer/:id',
    title: '客户认领',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
  {
    path: '/active-detail',
    title: '客户认领',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
  {
    path: '/active-detail/:id',
    title: '客户认领',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
  {
    path: '/task-exec',
    title: '任务执行',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  },
  {
    path: '/task-exec/:id',
    title: '任务执行',
    class: '营销大脑H5',
    group: '营销大脑H5管理'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'market-brain'
}
