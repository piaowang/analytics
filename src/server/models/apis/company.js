const ctrl = 'controllers/company.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  method: 'get'
}

/***
 * 企业管理, 公有云接口
 */
const routes = [
  {
    path: '/get',
    title: '查看企业',
    method: 'get',
    requirePermission: false,
    func: 'get'
  }, {
    path: '/update',
    title: '更新企业',
    method: 'post',
    func: 'update'
  }, {
    path: '/delete',
    title: '删除企业',
    method: 'post',
    func: 'del'
  }, {
    path: '/create',
    title: '新建企业',
    method: 'post',
    func: 'add'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/company'
}
