
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-tables.controller',
  class: '指标管理',
  group: '维表管理'
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/tables',
    title: '查询维表',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/tables',
    title: '创建维表',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/app/offline-calc/tables/:id',
    title: '修改维表',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/app/offline-calc/tables/:id',
    title: '删除维表',
    func: 'remove',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
