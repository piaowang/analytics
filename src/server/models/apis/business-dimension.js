const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/business-dimension.controller',
  class: '业务维度',
  group: '业务维度',
  menusCate:['产品实验室', '其他', '业务维度']

}
const routes = [{
  method: 'get',
  path: '/list',
  title: 'list',
  func: 'list',
  requirePermission: true
}, {
  method: 'post',
  path: '/create',
  title: 'create',
  func: 'create',
  requirePermission: true
}, {
  method: 'post',
  path: '/update',
  title: 'update',
  func: 'update',
  requirePermission: true
}, {
  method: 'post',
  path: '/delete',
  title: 'delete',
  func: 'delete',
  requirePermission: true
}]


export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/business-dimension'
}

