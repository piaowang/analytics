const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/push-land-page.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['产品实验室', '智能营销', '发送任务管理']
}

const routes = [
  {
    path: '/list',
    title: '查询push落地页',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/list-all',
    title: '查询push落地页',
    method: 'get',
    func: 'getAllList'
  },
  {
    path: '/create',
    title: '新增push落地页',
    method: 'post',
    func: 'create'
  },
  {
    path: '/delete/:id',
    title: '删除push落地页',
    method: 'delete',
    func: 'delete'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-pushlandpage'
}
