
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-indices.controller',
  class: '指标管理',
  group: '指标库'

}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/indices',
    title: '查询指标',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/indices',
    title: '创建指标',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/app/offline-calc/indices/:id',
    title: '修改指标',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/app/offline-calc/indices/:id',
    title: '删除指标 ',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'post',
    path: '/app/offline-calc/indices-import',
    title: '导入指标文件',
    func: 'importIndices'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
