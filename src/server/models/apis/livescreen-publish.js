const ctrl = 'controllers/sugo-livescreen-publish.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  group: '实时大屏',
  class: '图表'
}

const routes = [
  {
    path: '/get',
    title: '查询已发布大屏实例',
    method: 'get',
    func: 'get',
    requirePermission: false
  }, {
    path: '/delete/:livescreenId',
    title: '删除已发布大屏实例',
    method: 'delete',
    func: 'deleteLiveScreen'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/livescreen-publish'
}
