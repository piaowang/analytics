/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description [description]
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/act-groups.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['产品实验室', '智能营销', '活动分组']
}

const routes = [
  {
    path: '/list',
    title: '查询活动分组',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/list-all',
    title: '查询所有活动分组id,名称',
    method: 'get',
    func: 'listAll'
  },
  {
    path: '/create',
    title: '新增活动分组',
    method: 'post',
    func: 'create'
  },
  {
    path: '/update',
    title: '编辑活动分组',
    method: 'post',
    func: 'update'
  },
  {
    path: '/delete/:id',
    title: '删除活动分组',
    method: 'get',
    func: 'delete'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-act-groups'
}
