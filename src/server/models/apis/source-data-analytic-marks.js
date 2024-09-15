const ctrl = 'controllers/sugo-pivot-marks.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  group: '数据开发中心',
  class: '日志分析',
  menusCate: ['数据开发中心','日志分析','日志分析']
}

const routes = [
  {
    path: '/',
    title: '查看书签',
    method: 'get',
    func: 'list'
  }, {
    path: '/',
    title: '创建书签',
    method: 'post',
    func: 'create',
    requirePermission: true
  } , {
    path: '/:id',
    title: '更新书签',
    method: 'put',
    func: 'update',
    requirePermission: true
  }, {
    path: '/:id',
    title: '删除书签',
    method: 'delete',
    func: 'delete',
    requirePermission: true
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/source-data-analytic-marks'
}
