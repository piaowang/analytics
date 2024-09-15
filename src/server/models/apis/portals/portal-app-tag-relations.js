const ctrl = 'controllers/portals/portal-app-tag-relations.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '智能运营',
  group: '智能数据门户'
}

const routes = [
  {
    path: '/:id?',
    title: '查询应用标签关联',
    method: 'get',
    func: 'query'
  },
  {
    path: '/',
    title: '创建应用标签关联',
    method: 'post',
    func: 'create'
  },
  {
    path: '/batch-add-tag',
    title: '批量创建应用标签关联',
    method: 'post',
    func: 'batchCreate'
  },
  {
    path: '/:id',
    title: '更新应用标签关联',
    method: 'put',
    func: 'update'
  },
  {
    path: '/:id',
    title: '删除应用标签关联',
    method: 'delete',
    func: 'destroy'
  },
  {
    path: '/change-order',
    title: '修改排序',
    method: 'post',
    func: 'changeOrder'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  // /app/sugo-app-tag-relation
  prefix: 'app/portal-app-tag-relations'
}
