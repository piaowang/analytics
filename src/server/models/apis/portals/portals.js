const ctrl = 'controllers/portals/portals.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '智能运营',
  group: '门户管理',
  menusCate: ['智能运营', '数据智能门户', '门户管理']
}

const routes = [
  {
    // 访问登录页时允许不登录
    path: '/api/portals/:id?',
    title: '查询门户',
    method: 'get',
    func: 'getPortals',
    requirePermission: false
  },
  {
    path: '/app/portals',
    title: '创建门户',
    method: 'post',
    func: 'createPortal'
  },
  {
    path: '/app/portals/:id',
    title: '更新门户',
    method: 'put',
    func: 'updatePortal'
  },
  {
    path: '/app/portals/:id',
    title: '删除门户',
    method: 'delete',
    func: 'deletePortal'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
