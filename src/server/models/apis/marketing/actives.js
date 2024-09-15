/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description [description]
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/actives.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['产品实验室', '智能营销', '活动分组']
}

const routes = [
  {
    path: '/list',
    title: '查询活动列表',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/get-result',
    title: '查询活动效果数据',
    method: 'get',
    func: 'getResult'
  },
  {
    path: '/list-one',
    title: '查询某条活动记录',
    method: 'get',
    func: 'getOne'
  },
  {
    path: '/create',
    title: '新增活动',
    method: 'post',
    func: 'create'
  },
  {
    path: '/update',
    title: '编辑活动',
    method: 'post',
    func: 'update'
  },
  {
    path: '/delete/:id',
    title: '删除活动',
    method: 'get',
    func: 'delete'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-actives'
}
