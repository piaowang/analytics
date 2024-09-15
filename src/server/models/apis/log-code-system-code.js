/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */


const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/log-code-system-code.controller',
  class: '日志分析',
  group: '系统代码'
}

const routes = [
  {
    method: 'post',
    path: '/create',
    title: '创建系统码',
    func: 'create'
  },
  {
    method: 'get',
    path: '/find-project-systems',
    title: '查找项目所有系统码',
    func: 'findProjectSystems'
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
  prefix: 'app/system-code'
}
