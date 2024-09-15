/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description 智能营销-营销场景服务端路由定义
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/scenes.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['产品实验室', '智能营销', '营销模型']
}

const routes = [
  {
    path: '/list',
    title: '查询营销场景',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/create',
    title: '新增营销场景',
    method: 'post',
    func: 'save'
  },
  {
    path: '/update/:id',
    title: '编辑营销场景',
    method: 'put',
    func: 'save'
  },
  {
    path: '/delete/:id',
    title: '删除营销场景',
    method: 'delete',
    func: 'delete'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-scenes'
}
