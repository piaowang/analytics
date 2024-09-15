const ctrl = 'controllers/retention.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '用户运营',
  group: '留存分析',
  menusCate: ['智能运营', '数据运营工具', '行为分析', '留存分析']
}

const routes = [
  {
    path: '/get', // ?id=xxx
    title: '留存列表',
    method: 'get',
    requirePermission: false,
    func: 'getRetentions'
  },
  {
    path: '/create',
    title: '新建留存',
    method: 'post',
    func: 'createRetention'
  },
  {
    path: '/update',
    title: '更新留存',
    method: 'post',
    func: 'updateRetention'
  },
  {
    path: '/delete',
    title: '删除留存',
    method: 'post',
    func: 'deleteRetention'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/retention'
}
