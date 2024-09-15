const ctrl = 'controllers/portals/portal-tags.controller'

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
    path: '/tag-as-menu',
    title: '查询门户',
    method: 'get',
    func: 'getTagAsMenu',
    requirePermission: false
  },
  {
    path: '/:id?',
    title: '查询门户应用标签',
    method: 'get',
    func: 'query',
    requirePermission: false
  },
  {
    path: '/',
    title: '创建门户应用标签',
    method: 'post',
    func: 'create'
  },
  {
    path: '/:id',
    title: '更新门户应用标签',
    method: 'put',
    func: 'update'
  },
  {
    path: '/:id',
    title: '删除门户应用标签',
    method: 'delete',
    func: 'destroy'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  // /app/sugo-app-tag
  prefix: 'app/portal-tags'
}
