
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-tables.controller',
  class: '数据管理',
  group: '外部表管理'
}

const routes = [
  {
    method: 'get',
    path: '/external-tables/tables',
    title: '查询外部维表',
    func: 'query'
  },
  {
    method: 'post',
    path: '/external-tables/tables',
    title: '创建外部维表',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/external-tables/tables/:id',
    title: '修改外部维表',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/external-tables/tables/:id',
    title: '删除外部维表',
    func: 'remove',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: '/app'
}
