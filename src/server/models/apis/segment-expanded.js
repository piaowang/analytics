const ctrl = 'controllers/segment-expand.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '用户运营',
  group: '用户扩群',
  menusCate: ['产品实验室','智能运营', '用户扩群']

}

const routes = [
  {
    path: '/get',
    title: '查看扩群',
    method: 'get',
    requirePermission: false,
    func: 'get'
  }, {
    path: '/update',
    title: '更新扩群',
    requirePermission: false,
    method: 'post',
    func: 'update'
  }, {
    path: '/delete',
    title: '删除扩群',
    method: 'post',
    func: 'del'
  }, {
    path: '/create',
    title: '新建扩群',
    method: 'post',
    requirePermission: false,
    func: 'add'
  }, {
    path: '/info',
    title: '获取扩群id',
    method: 'get',
    func: 'remoteDownload',
    requirePermission: false
  }, {
    path: '/status',
    title: '查询扩群状态',
    method: 'get',
    requirePermission: false,
    func: 'queryStatus'
  }, {
    path: '/save-as',
    title: '另存为分群',
    method: 'post',
    requirePermission: false,
    func: 'saveAsUsergroup'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/segment-expand'
}
