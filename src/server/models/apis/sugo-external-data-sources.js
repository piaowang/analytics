
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-data-sources.controller',
  class: '数据管理',
  group: '外部数据源管理'
}

const routes = [
  {
    method: 'get',
    path: '/external-tables/data-sources',
    title: '查询外部数据源',
    func: 'query'
  },
  {
    method: 'post',
    path: '/external-tables/data-sources',
    title: '创建外部数据源',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/external-tables/data-sources/:id',
    title: '修改外部数据源',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/external-tables/data-sources/:id',
    title: '删除外部数据源',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/external-tables/data-sources/:id/tables', // 如何数据源还未创建，可以通过 q 传递数据源信息，id 设为 new
    title: '查询外部数据源的全部表',
    func: 'showTables'
  },
  {
    method: 'get',
    path: '/external-tables/data-sources/:id/tables/:tableName',
    title: '查询外部数据源的表的信息',
    func: 'describeTable'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: '/app'
}
