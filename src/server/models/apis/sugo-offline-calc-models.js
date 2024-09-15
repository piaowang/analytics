
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-models.controller',
  class: '指标管理',
  group: '指标模型管理'
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/models',
    title: '查询指标模型',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/models',
    title: '创建指标模型',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/app/offline-calc/models/:id',
    title: '修改指标模型',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/app/offline-calc/models/:id',
    title: '删除指标模型',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/app/offline-calc/standalone-models',
    title: '查询指标模型列表(被调度器调用)',
    func: 'queryByScheduler',
    requireLogin: true
  },
  {
    method: 'get',
    path: '/app/offline-calc/standalone-models/:id',
    title: '对外查询指标模型(被调度器调用)',
    func: 'queryByScheduler',
    requireLogin: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
