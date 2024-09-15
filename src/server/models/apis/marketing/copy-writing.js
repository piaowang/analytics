const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/copy-writing.controller',
  class: '智能营销',
  group: '自动化营销中心'
}

const routes = [
  {
    path: '/list',
    title: '查询文案',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/create',
    title: '新增文案',
    method: 'post',
    func: 'create'
  }
  // {
  //   path: '/update/:id',
  //   title: '编辑push落地页',
  //   method: 'put',
  //   func: 'save'
  // },
  // {
  //   path: '/delete/:id',
  //   title: '删除push落地页',
  //   method: 'delete',
  //   func: 'delete'
  // }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-copywriting'
}
