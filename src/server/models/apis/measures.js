const ctrl = 'controllers/sugo-measures.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '数据管理',
  group: '指标管理',
  menusCate: ['智能运营', '数据管理', '指标管理']
}

const routes = [
  {
    path: '/get/:id',
    title: '查看指标列表',
    method: 'get',
    func: 'getMeasures',
    requirePermission: false
  },
  {
    path: '/update/:id',
    title: '更新指标',
    method: 'put',
    func: 'editMeasure',
    newRoleDefaultPermission: true
  },
  {
    path: '/delete',
    title: '删除指标',
    method: 'post',
    func: 'deleteMeasure',
    newRoleDefaultPermission: true
  },
  {
    path: '/create/:id',
    title: '增加指标',
    method: 'post',
    func: 'addMeasure',
    newRoleDefaultPermission: true
  },
  {
    path: '/authorize/:id',
    title: '指标授权',
    method: 'put',
    func: 'editMeasure',
    newRoleDefaultPermission: true
  },
  {
    path: '/get/valid/formula',
    title: '验证指标表达式是否合法',
    method: 'post',
    func: 'validFormula',
    requirePermission: false
  },
  {
    path: '/convert-formula-to-filters',
    title: '将指标的公式转换为多维分析的 filters',
    method: 'get',
    func: 'convertFormulaToFilters',
    requirePermission: false
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/order-management',
    title: '指标排序与隐藏',
    method: 'post',
    func: 'getMeasures',
    newRoleDefaultPermission: true
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/tags-management',
    title: '指标分组管理',
    method: 'post',
    func: 'getMeasures',
    newRoleDefaultPermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/measure'
}
