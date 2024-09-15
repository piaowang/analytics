const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/market-brain/result.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['智能营销', '营销大脑', '触达任务管理']
}

const routes = [
  {
    path: '/fetchOneById',
    title: '查询营销事件',
    method: 'get',
    func: 'fetchOneById'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/market-brain-acts/result'
}
