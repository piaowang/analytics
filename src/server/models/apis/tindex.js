
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-tindex.controller',
  class: 'TIndex',
  group: 'TIndex 相关服务'
}

const routes = [
  {
    method: 'get',
    path: '/app/tindex/leaderHost',
    title: '查询 tindex leaderHost',
    func: 'queryLeaderHost'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
