/**
 * Created on 14/03/2017.
 */

const ctrl = 'controllers/rfm.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: 'RFM'
}

const routes = [
  {
    path: '/create',
    method: 'post',
    title: '创建RFM',
    func: 'create'
  },
  {
    path: '/update',
    method: 'post',
    title: '更新RFM',
    func: 'update'
  },
  {
    path: '/delete',
    method: 'get',
    title: '删除RFM',
    func: 'del'
  },
  {
    path: '/query',
    method: 'get',
    title: '查询RFM',
    func: 'get'
  },
  {
    path: '/collection/projects',
    method: 'get',
    title: '查询项目所有RFM',
    func: 'getRFMOfProjects'
  }
]

export default {
  routes: routes.map(r => ({ ...base, ...r })),
  prefix: 'app/rfm'
}
