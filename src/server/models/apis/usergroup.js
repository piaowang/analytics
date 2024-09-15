const ctrl = 'controllers/usergroups.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '用户运营',
  group: '用户分群',
  menusCate: ['智能运营', '数据运营工具', '用户分群']
}

const routes = [
  {
    path: '/get/:id',
    title: '查看分群详情',
    method: 'get',
    requirePermission: false,
    func: 'get'
  },
  {
    path: '/get',
    title: '查看分群列表',
    method: 'get',
    requirePermission: false,
    func: 'get'
  },
  {
    path: '/create',
    title: '新建分群',
    method: 'post',
    func: 'add'
  },
  {
    path: '/update',
    title: '更新分群',
    method: 'post',
    func: 'update'
  },
  {
    path: '/delete',
    title: '删除分群',
    method: 'post',
    func: 'del'
  },
  {
    path: '/info',
    title: '获取分群id',
    method: 'get',
    func: 'remoteRead',
    requirePermission: false
  },
  {
    path: '/query',
    title: '查询分群',
    method: 'post',
    func: 'query',
    requirePermission: false
  },
  {
    path: '/queryValidLookups',
    title: '查询有效分群',
    method: 'get',
    func: 'queryValidLookups',
    requirePermission: false
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/:id/users/download',
    title: '下载用户列表',
    method: 'get',
    func: 'get'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/:id/recompute',
    title: '重新计算分群',
    method: 'get',
    func: 'get'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/create-for-tag-dict',
    title: '保存用户分群',
    method: 'post',
    func: 'add',
    class: '用户画像',
    group: '标签体系',
    menusCate: ['智能运营', '数据运营工具', '用户画像', '标签体系']
  },
  {
    path: '/get-userids-by-tempid',
    title: '通过临时分群id分页获取用户id',
    method: 'post',
    func: 'getUserIdsByTempId',
    requirePermission: false
  },
  {
    path: '/get-user-diycol',
    title: '自定义用户ID搜索选项', // cutv按自定义选项搜索用户 根据mysql库手机号码
    method: 'get',
    func: 'getUserListWithDiyDim'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/usergroup'
}
