
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-import-tables.controller',
  class: '指标管理',
  group: '导入维表'
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/import-tables',
    title: '查询导入维表',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/import-tables',
    title: '创建导入维表',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'post',
    path: '/app/offline-calc/import-tables/values',
    title: '追加数据',
    func: 'importValues',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/app/offline-calc/import-tables/:id',
    title: '修改导入维表',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/app/offline-calc/import-tables/:id',
    title: '删除导入维表',
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
