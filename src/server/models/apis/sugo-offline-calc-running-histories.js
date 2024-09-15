
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-running-histories.controller',
  class: '指标管理',
  group: '指标模型执行历史'
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/running-histories', // ?model_id=xxx 查询单个模型下的执行历史
    title: '查询指标模型执行历史',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/running-histories',
    title: '创建指标模型执行历史',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/app/offline-calc/running-histories/:id',
    title: '修改指标模型执行历史',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/app/offline-calc/running-histories/:id',
    title: '删除指标模型执行历史',
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
