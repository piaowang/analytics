const ctrl = 'controllers/sugo-livefeeds.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: '实时大屏',
  menusCate: ['智能运营', '数据可视化', '数据大屏', '实时大屏']
}

const routes = [
  {
    path: '/get',
    title: '查询所有大屏实例',
    method: 'get',
    func: 'get'
  },
  {
    path: '/create',
    title: '创建大屏实例',
    method: 'post',
    func: 'create'
  },
  {
    path: '/update',
    title: '更新大屏',
    method: 'post',
    func: 'update'
  },
  {
    path: '/delete/:livefeedId',
    title: '删除大屏实例',
    method: 'delete',
    func: 'deleteLivefeed'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/sugo-livefeeds'
}
