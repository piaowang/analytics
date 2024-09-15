/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/log-code-log-code.controller',
  class: '日志分析',
  group: '错误码'
}

const routes = [
  {
    method: 'post',
    path: '/create',
    title: '创建错误码',
    func: 'create'
  },
  {
    method: 'post',
    path: '/bulk-create',
    title: '创创建错误码',
    func: 'bulkCreate'
  },
  {
    method: 'get',
    path: '/query-by-id',
    title: '使用id查询记录',
    func: 'findById'
  },
  {
    method: 'get',
    path: '/query-by-code',
    title: '使用code查询记录',
    func: 'findByCode'
  },
  {
    method: 'get',
    path: '/find-project-log-code',
    title: '查找项目所有的错误码',
    func: 'findProjectLogCode'
  },
  {
    method: 'get',
    path: '/find-all-by-page',
    title: '分页查询所有的错误码',
    func: 'findAllByPage'
  },
  {
    method: 'post',
    path: '/update',
    title: '更新记录',
    func: 'update'
  },
  {
    method: 'post',
    path: '/destroy',
    title: '删除记录',
    func: 'destroy'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/log-code'
}
