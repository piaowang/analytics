const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-alarm-interface.controller',
  class: '日志分析',
  group: '监控告警',
  menusCate: ['智能运营', '数据运营工具', '数据监控']
}

const routes = [
  {
    method: 'get',
    path: '/interfaces',
    title: '取得告警接口列表',
    func: 'query'
  },
  {
    method: 'get',
    path: '/interfaces/:id',
    title: '取得单个告警接口',
    func: 'query'
  },
  {
    method: 'post',
    path: '/interfaces',
    title: '创建告警接口',
    func: 'create'
  },
  {
    method: 'put',
    path: '/interfaces/:id',
    requirePermission: true,
    title: '管理告警接口', // 更新告警
    func: 'update'
  },
  {
    method: 'delete',
    path: '/interfaces/:id',
    title: '删除告警接口',
    func: 'remove'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/alarm'
}
