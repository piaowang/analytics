const ctrl = 'controllers/path-analysis.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  group: '路径分析',
  class: '用户运营',
  menusCate: ['智能运营', '数据运营工具', '行为分析', '路径分析']
}

const routes = [
  {
    path: '/get',
    title: '查看路径分析',
    method: 'get',
    requirePermission: false,
    func: 'get'
  },
  {
    path: '/create',
    title: '新建路径分析',
    method: 'post',
    func: 'add'
  },
  {
    path: '/update',
    title: '更新路径分析',
    method: 'post',
    func: 'update'
  },
  {
    path: '/delete',
    title: '删除路径分析',
    method: 'post',
    func: 'del'
  },
  {
    path: '/chart',
    title: '获取路径分析图表数据',
    method: 'post',
    func: 'getChart',
    requirePermission: false
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/path-analysis'
}
