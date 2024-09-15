const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-monitor-alarm-condition-templates.controller',
  class: '日志分析',
  group: '监控告警',
  menusCate: ['智能运营', '数据运营工具', '数据监控']
}

const routes = [
  {
    method: 'get',
    path: '/',
    title: '取得告警条件模版列表',
    func: 'query'
  },
  {
    method: 'get',
    path: '/:id',
    title: '取得单个告警条件模版',
    func: 'query'
  },
  {
    method: 'post',
    path: '/',
    title: '创建告警条件模版',
    func: 'create'
  },
  {
    method: 'put',
    path: '/:id',
    title: '更新告警条件模版',
    func: 'update'
  },
  {
    method: 'delete',
    path: '/:id',
    title: '删除告警条件模版',
    func: 'remove'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/monitor-alarm-condition-templates'
}
