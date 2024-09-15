const ctrl = 'controllers/portals/portal-pages.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '智能运营',
  group: '智能数据门户'
}

const routes = [
  {
    // 访问登录页时允许不登录
    path: '/api/portals/:portalId/pages/:id?',
    title: '查询门户页面',
    method: 'get',
    func: 'getPortalPages'
  },
  {
    path: '/app/portals/:portalId/pages',
    title: '创建门户页面',
    method: 'post',
    func: 'createPortalPage'
  },
  {
    path: '/app/portals/:portalId/pages/:id',
    title: '更新门户页面',
    method: 'put',
    func: 'updatePortalPage'
  },
  {
    path: '/app/portals/:portalId/pages/:id',
    title: '删除门户页面',
    method: 'delete',
    func: 'deletePortalPage'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
