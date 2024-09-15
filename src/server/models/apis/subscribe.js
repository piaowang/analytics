const ctrl = 'controllers/subscribe.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '图表',
  group: '订阅',
  menusCate: ['智能运营', '数据可视化', '我的订阅']
}

const routes = [
  {
    path: '/get',
    title: '获取订阅列表',
    method: 'get',
    func: 'getAll'
  },
  {
    path: '/delete',
    title: '移除订阅',
    method: 'post',
    func: 'del'
  },
  {
    path: '/create',
    title: '添加订阅',
    method: 'post',
    func: 'add'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/subscribe'
}
