const ctrl = 'controllers/db-connect.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  method: 'get',
  class: '任务调度',
  group: '任务调度'
}

/***
 * 数据库连接管理
 */
const routes = [
  {
    path: '/list',
    title: '获取数据库连接列表',
    method: 'get',
    func: 'getList',
    requirePermission: false
  }, {
    path: '/create',
    title: '创建数据库连接',
    method: 'post',
    func: 'create',
    requirePermission: true
  }, {
    path: '/update',
    title: '更新数据库连接',
    method: 'post',
    func: 'updateState',
    requirePermission: true
  }, {
    path: '/delete',
    title: '删除数据库连接',
    method: 'post',
    func: 'delete',
    requirePermission: true
  }, {
    path: '/test',
    title: '测试连接',
    method: 'post',
    func: 'testConnection'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/dbconnectsetting'
}
