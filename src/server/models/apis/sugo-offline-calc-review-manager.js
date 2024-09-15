const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-version-histories.controller',
  class: '指标管理',
  group: '审核管理',
  menusCate: ['智能运营', '数据可视化', '数据大屏', '审核管理']
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/review-manager',
    title: '查询待审核项',
    func: 'queryReview'
  },
  {
    method: 'post',
    path: '/app/offline-calc/version-histories',
    title: '创建待审核项',
    func: 'create'
  }
  // {
  //   method: 'put',
  //   path: '/app/offline-calc/review-manager/:id',
  //   title: '修改指标模型数据源',
  //   func: 'update'
  // }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
