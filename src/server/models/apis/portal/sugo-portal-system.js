const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/portal/portal.controller',
  class: '门户系统',
  menusCate: ['智能运营', '数据智能门户']
}

const routes = [
  {
    group: '应用管理',
    requirePermission: false,
    path: '/sugo-app',
    title: '查询应用',
    method: 'get',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app',
    title: '新增应用',
    method: 'post',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app',
    title: '修改应用',
    method: 'put',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app/:id',
    title: '修改单个应用',
    method: 'put',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app/:id',
    title: '删除应用',
    method: 'delete',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app/:id',
    requirePermission: false,
    title: '查询单个应用',
    method: 'get',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app-tag',
    requirePermission: false,
    title: '查询应用标签',
    method: 'get',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app-tag',
    title: '新增应用标签',
    method: 'post',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app-tag',
    title: '修改应用标签',
    method: 'put',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app-tag/:id',
    title: '修改某个应用标签',
    method: 'put',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    group: '应用管理',
    path: '/sugo-app-tag/:id',
    title: '删除应用标签',
    method: 'delete',
    func: 'proxy',
    menusCate: ['智能运营', '数据智能门户', '应用中心']
  },
  {
    requirePermission: false,
    group: '应用-应用标签-关系管理',
    path: '/sugo-app-tag-relation',
    title: '查询应用-应用标签-关系管理',
    method: 'get',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '应用-应用标签-关系管理',
    path: '/sugo-app-tag-relation',
    title: '新增应用-应用标签-关系管理',
    method: 'post',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '应用-应用标签-关系管理',
    path: '/sugo-app-tag-relation',
    title: '修改应用-应用标签-关系管理',
    method: 'put',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '应用-应用标签-关系管理',
    path: '/sugo-app-tag-relation',
    title: '删除应用-应用标签-关系管理',
    method: 'delete',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '应用-应用标签-关系管理',
    path: '/sugo-app-tag-relation/batch-add-tag',
    title: '批量新增关系',
    method: 'post',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '应用-应用标签-关系管理',
    path: '/sugo-app-tag-relation/change-order',
    title: '批量修改关系',
    method: 'post',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '我的工作台',
    path: '/sugo-workbench',
    title: '查询',
    method: 'get',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '我的工作台',
    path: '/sugo-workbench/:id',
    title: '查询单个',
    method: 'get',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '我的工作台',
    path: '/sugo-workbench',
    title: '新增',
    method: 'post',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '我的工作台',
    path: '/sugo-workbench',
    title: '修改',
    method: 'put',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '我的工作台',
    path: '/sugo-workbench',
    title: '删除',
    method: 'delete',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '我的工作台',
    path: '/sugo-workbench/:id',
    title: '删除单个收藏',
    method: 'delete',
    func: 'proxy'
  },

  {
    requirePermission: false,
    group: '应用管理abc',
    path: '/sugo-smart-recommend',
    title: '查询智能推荐',
    method: 'get',
    func: 'proxy'
  },
  {
    requirePermission: false,
    group: '应用管理',
    path: '/sugo-smart-recommend',
    title: '新增点击次数',
    method: 'post',
    func: 'proxy'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/portal'
}
