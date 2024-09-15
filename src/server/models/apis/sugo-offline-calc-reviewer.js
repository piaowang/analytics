
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-reviewer.controller',
  class: '指标管理',
  group: '审核者管理'
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/reviewer',
    title: '查询指标模型数据源',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/reviewer',
    title: '创建指标模型数据源',
    func: 'create'
  },
  {
    method: 'put',
    path: '/app/offline-calc/reviewer/:id',
    title: '修改指标模型数据源',
    func: 'update'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
