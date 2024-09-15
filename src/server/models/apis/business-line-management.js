const ctrl = 'controllers/business-line-management.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  method: 'get',
  class: '数据管理',
  group: '指标管理',
  menusCate: ['智能运营', '数据管理', '指标管理']
}

/***
 * 业务线条管理
 */
const routes = [
  {
    path: '/list',
    title: '获取业务线条管理列表',
    method: 'get',
    func: 'getList',
    requirePermission: false
  },
  {
    path: '/create',
    title: '创建业务线条管理',
    method: 'post',
    func: 'create',
    requirePermission: true
  },
  {
    path: '/update',
    title: '更新业务线条管理',
    method: 'post',
    func: 'updateState',
    requirePermission: true
  },
  {
    path: '/delete',
    title: '删除业务线条管理',
    method: 'post',
    func: 'delete',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/businesslinemanage'
}
