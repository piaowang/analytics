/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/log-code-interface-code.controller',
  class: '日志分析',
  group: '接口方'

}

const routes = [
  {
    method: 'post',
    path: '/create',
    title: '创创建接口方',
    func: 'create'
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
    path: '/find-systems-interface',
    title: '查找系统所有的接口方',
    func: 'findSystemInterfaces'
  },
  {
    method: 'get',
    path: '/find-project-interface',
    title: '查找项目所有的接口方',
    func: 'findProjectInterfaces'
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
  prefix: 'app/interface-code'
}
