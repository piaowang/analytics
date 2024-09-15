const ctrl = 'controllers/sugo-authorization.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  group: '授权管理',
  class: '授权管理'
}

const routes = [
  {
    path: '/save',
    title: '保存授权信息',
    method: 'post',
    func: 'save',
    requirePermission: false
  },
  {
    path: '/get',
    title: '获取授权信息',
    method: 'get',
    func: 'get',
    requirePermission: false
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/authorization'
}
