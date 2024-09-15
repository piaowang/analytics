/**
 * 标签分类接口定义
 */
const ctrl = 'controllers/tag-type.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '用户画像',
  group: '标签体系管理',
  menusCate: ['智能运营', '数据运营工具', '用户画像', '标签体系管理']
}

const routes = [
  {
    path: '/get',
    title: '查看标签分类',
    method: 'get',
    func: 'get'
  },
  {
    path: '/update',
    title: '更新子标签关联',
    method: 'put',
    func: 'update'
  },
  {
    path: '/delete',
    title: '删除子标签关联',
    method: 'post',
    func: 'del'
  },
  {
    path: '/create',
    title: '新建子标签关联',
    method: 'post',
    func: 'add'
  },
  {
    path: '/top10/status', // q={usergroup_id}
    title: '查询智能画像创建状态',
    method: 'get',
    func: 'queryCreateStatus',
    lib: 'controllers/tag-ai.controller'
  },
  {
    path: '/top10', // q={usergroup_id}
    title: '创建智能画像',
    method: 'post',
    func: 'create',
    lib: 'controllers/tag-ai.controller'
  },
  {
    path: '/top10', // q={usergroup_id}
    title: '查询智能画像数据',
    method: 'get',
    func: 'query',
    lib: 'controllers/tag-ai.controller'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag-type'
}
