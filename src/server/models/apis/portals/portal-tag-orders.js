const ctrl = 'controllers/portals/portal-tag-orders.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '智能运营',
  group: '智能数据门户'
}

const routes = [
  {
    path: '/',
    title: '查询标签排序',
    method: 'get',
    func: 'query'
  },
  {
    path: '/',
    title: '创建标签排序',
    method: 'post',
    func: 'create'
  },
  {
    path: '/:id',
    title: '更新标签排序',
    method: 'put',
    func: 'update'
  },
  {
    path: '/:id',
    title: '删除标签排序',
    method: 'delete',
    func: 'destroy'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  // /app/sugo-portal-tag-order
  prefix: 'app/portal-tag-orders'
}
