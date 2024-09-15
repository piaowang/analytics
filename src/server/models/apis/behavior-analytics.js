const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/behavior-analytics.controller',
  class: '用户运营',
  group: '行为事件分析',
  menusCate: ['智能运营', '数据运营工具', '行为分析', '行为事件分析']
}

const routes = [
  {
    method: 'get',
    path: '/models',
    title: '取得所有行为分析模型',
    func: 'getModels'
  },
  {
    method: 'get',
    path: '/models/:modelId',
    title: '取得某个行为分析模型',
    func: 'getModels'
  },
  {
    method: 'post',
    path: '/models',
    title: '创建行为事件分析模型',
    func: 'createModel',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/models/:modelId',
    title: '更新行为事件分析模型',
    func: 'updateModel',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/models/:modelId',
    title: '删除行为事件分析模型',
    func: 'deleteModel',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/behavior-analytics'
}
