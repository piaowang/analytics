const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/temp-lookups.controller'
  // class: '用户运营',
  // group: '用户分群'
}

const routes = [
  {
    method: 'get',
    path: '/',
    title: '取得临时 lookup 列表',
    func: 'query'
  }, {
    method: 'get',
    path: '/:id',
    title: '取得单个临时 lookup',
    func: 'query'
  }, {
    method: 'post',
    path: '/',
    title: '创建临时 lookup',
    func: 'create'
  }, {
    method: 'put',
    path: '/:id',
    title: '更新临时 lookup',
    func: 'update'
  }, {
    method: 'delete',
    path: '/:id',
    title: '删除临时 lookup',
    func: 'remove'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/temp-lookups'
}
