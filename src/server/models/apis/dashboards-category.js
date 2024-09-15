const ctrl = 'controllers/sugo-dashboard-category.controller'

const base = {
  requireLogin: true,
  lib: ctrl,
  group: '数据看板',
  class: '图表',
  menusCate: ['智能运营', '数据可视化', '数据看板']
}

const routes = [
  {
    path: '/getlist',
    title: '查看分类信息',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/save',
    title: '保存更新看板分类',
    method: 'post',
    func: 'save',
    requirePermission: true,
    newRoleDefaultPermission: true
  },
  {
    path: '/delete',
    title: '删除看板分类',
    method: 'post',
    func: 'delete',
    newRoleDefaultPermission: true
  },
  {
    path: '/saveOrder',
    title: '保存排序',
    method: 'post',
    func: 'saveCustomOrder',
    newRoleDefaultPermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/dashboards-category'
}
