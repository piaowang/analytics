const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/data-checking.controller',
  class: '系统管理',
  group: '审核管理'
}

const routes = [
  {
    method: 'get',
    path: '/list',
    title: '获取审核列表',
    func: 'getList',
    requirePermission: false
  }, {
    method: 'post',
    path: '/checking',
    title: '审核权限',
    func: 'checkStatus'
  }, {
    method: 'get',
    path: '/detail',
    title: '获取审核详细',
    func: 'getDetail',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/data-checking'
}
