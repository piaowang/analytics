
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-data-sources.controller',
  class: '指标管理',
  group: '数据源管理',
  menusCate: ['数据开发中心','数据开发中心', '数据源管理']

}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/data-sources',
    title: '查询数据源',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/data-sources',
    title: '创建数据源',
    func: 'create',
    requirePermission: true,
    menusCate: ['数据开发中心','数据开发中心', '数据源管理']

  },
  {
    method: 'put',
    path: '/app/offline-calc/data-sources/:id',
    title: '修改数据源',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/app/offline-calc/data-sources/:id',
    title: '删除数据源',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/app/offline-calc/data-sources/:id/tables', // 如何数据源还未创建，可以通过 q 传递数据源信息，id 设为 new
    title: '查询指标模型数据源的全部表',
    func: 'showTables'
  },
  {
    method: 'get',
    path: '/app/offline-calc/data-sources/:id/tables/:tableName',
    title: '查询指标模型数据源的表的信息',
    func: 'describeTable'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
