const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/contact.controller',
  // group: '通讯录'
  class: '日志分析',
  group: '监控告警',
  menusCate: ['智能运营', '数据运营工具', '数据监控']
}

const routes = [
  {
    method: 'get',
    path: '/persons',
    title: '取得所有人物数据',
    func: 'getPersons'
  },
  {
    method: 'get',
    path: '/persons/:personId',
    title: '取得某个人物数据',
    func: 'getPersons'
  },
  {
    method: 'post',
    path: '/persons',
    title: '创建人物记录',
    func: 'createPerson'
  },
  {
    method: 'put',
    path: '/persons/:personId',
    title: '接收人管理', // 其实是 更新人物记录 接口，只是为了单独拿这个接口来控制前端权限
    func: 'updatePerson',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/persons/:personId',
    title: '删除人物记录',
    func: 'deletePerson'
  },

  // 部门
  {
    method: 'get',
    path: '/departments', // ?q=compressed
    title: '查询部门列表',
    func: 'getDepartments'
  },
  {
    method: 'post',
    path: '/departments',
    title: '创建部门',
    func: 'createDepartment'
  },
  {
    requirePermission: true,
    method: 'put',
    path: '/departments/:id',
    // title: '修改部门',
    title: '部门管理',
    func: 'updateDepartment'
  },
  {
    method: 'delete',
    path: '/departments/:id',
    title: '删除部门',
    func: 'deleteDepartment'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/contact'
}
