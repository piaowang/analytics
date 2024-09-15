/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description 智能营销-营销事件服务端路由定义
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/market-brain/events.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['智能营销', '营销大脑', '营销策略']
}

const routes = [
  {
    path: '/list',
    title: '查询营销事件',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/create',
    title: '新增营销事件',
    method: 'post',
    func: 'save'
  },
  {
    path: '/get/:id',
    title: '查询单条营销事件记录',
    method: 'get',
    func: 'findById'
  },
  {
    path: '/update/:id',
    title: '编辑营销事件',
    method: 'put',
    func: 'save'
  },
  {
    path: '/delete/:id',
    title: '删除营销事件',
    method: 'delete',
    func: 'delete'
  },
  {
    path: '/testJpush',
    title: '删除营销事件',
    method: 'post',
    func: 'testJpush'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/market-brain-events'
}
