const ctrl = 'controllers/sugo-data-api-clients.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '数据管理',
  group: '数据 API',
  menusCate: ['数据服务中心','数据服务管理', '数据API']

}

const routes = [
  {
    path: '/app/data-api-clients',
    title: '获取客户端列表',
    method: 'get',
    func: 'query',
    requirePermission: false
  }, {
    path: '/app/data-api-clients',
    title: '创建数据 API 客户端',
    method: 'post',
    func: 'create'
  }, {
    path: '/app/data-api-clients/:id',
    title: '更新数据 API 客户端',
    method: 'put',
    func: 'update'
  }, {
    path: '/app/data-api-clients/:id',
    title: '删除数据 API 客户端',
    method: 'delete',
    func: 'remove'
  }, {
    path: '/system/auth',
    title: '申请 access_token',
    method: 'post',
    func: 'authClient',
    requireLogin: false,
    requirePermission: false
  }, {
    path: '/system/refresh',
    title: '刷新 access_token',
    method: 'post',
    func: 'refreshAccessToken',
    requireLogin: false,
    requirePermission: false
  }
  
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : ''
}
