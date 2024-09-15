const ctrl = 'controllers/sugo-funnels.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '用户运营',
  group: '漏斗分析',
  menusCate: ['智能运营', '数据运营工具', '行为分析', '漏斗分析']
}

const routes = [
  {
    path: '/get',
    title: '获取漏斗列表',
    method: 'get',
    func: 'querySugoFunnels',
    requirePermission: false
  },
  {
    path: '/get/:id',
    title: '获取漏斗详情',
    method: 'get',
    func: 'querySugoFunnels',
    requirePermission: false
  },
  {
    path: '/create',
    title: '创建漏斗',
    method: 'post',
    func: 'createOrUpdateSugoFunnel'
  },
  {
    path: '/update',
    title: '更新漏斗',
    method: 'post',
    func: 'createOrUpdateSugoFunnel'
  },
  {
    path: '/delete/:id',
    title: '删除漏斗',
    method: 'delete',
    func: 'deleteSugoFunnel'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/funnel'
}
