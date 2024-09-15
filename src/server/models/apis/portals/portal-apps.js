const ctrl = 'controllers/portals/portal-apps.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '智能运营',
  group: '门户应用管理',
  menusCate: ['智能运营', '数据智能门户', '应用管理']
}

const routes = [
  {
    path: '/api/portal-apps/:id?',
    title: '查询门户应用',
    method: 'get',
    func: 'query',
    requirePermission: false
  },
  {
    path: '/app/portal-apps',
    title: '创建门户应用',
    method: 'post',
    func: 'create'
  },
  {
    path: '/app/portal-apps/:id',
    title: '更新门户应用',
    method: 'put',
    func: 'update'
  },
  {
    path: '/app/portal-apps/:id',
    title: '删除门户应用',
    method: 'delete',
    func: 'destroy'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  // /app/sugo-app
  prefix: ''
}
