const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/institutions.controller',
  class: '管理中心',
  group: '机构管理',
  menusCate: ['系统管理', '机构管理']

}
const routes = [
  {
    method: 'get',
    path: '/tree-data',
    title: '查询树节点的数据',
    func: 'treeData',
    requirePermission: false
  }, {
    method: 'get',
    path: '/find-one',
    title: '查询单条数据',
    func: 'findOne',
    requirePermission: false
  }, {
    method: 'post',
    path: '/delete',
    title: '删除部门',
    func: 'delete',
    requirePermission: false
  }, {
    method: 'post',
    path: '/create',
    title: '创建机构部门',
    func: 'create',
    requirePermission: true
  }, {
    method: 'post',
    path: '/editor',
    title: '修改机构部门',
    func: 'editor',
    requirePermission: true
  }, {
    method: 'post',
    path: '/import',
    title: '导入机构部门',
    func: 'import',
    requirePermission: true
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/institutions'
}
