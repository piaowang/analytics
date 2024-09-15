const ctrl = 'controllers/business-db-setting.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  method: 'get',
  class: '数据管理',
  group: '业务表管理',
  menusCate: ['智能运营', '数据管理', '业务表管理']
}

/***
 * 业务数据库设置管理
 */
const routes = [
  {
    path: '/list',
    title: '获取设置列表',
    method: 'post',
    func: 'getList',
    requirePermission: false,
    authPermission: 'get:/console/business-db-setting'
  },
  {
    path: '/create',
    title: '创建业务表',
    method: 'post',
    func: 'save',
    requirePermission: true
  },
  {
    path: '/update',
    title: '更新业务表',
    method: 'post',
    func: 'save',
    requirePermission: true
  },
  {
    path: '/delete',
    title: '删除业务表',
    method: 'post',
    func: 'delete',
    requirePermission: true
  },
  {
    path: '/test',
    title: '测试连接',
    method: 'post',
    func: 'testConnection'
  },
  {
    path: '/updatestate',
    title: '禁用/启用业务表状态',
    method: 'post',
    func: 'updateState',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/businessdbsetting'
}
