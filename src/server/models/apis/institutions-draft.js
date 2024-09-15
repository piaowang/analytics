const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/institutions-draft.controller',
  class: '机构草稿管理',
  group: '机构草稿管理'
}
const routes = [{
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
},{
  method: 'post',
  path: '/delete',
  title: '删除部门',
  func: 'delete',
  requirePermission: false
},{
  method: 'post',
  path: '/create',
  title: '创建机构部门',
  func: 'create',
  requirePermission: false
}, {
  method: 'post',
  path: '/editor',
  title: '修改机构部门',
  func: 'editor',
  requirePermission: false
}, {
  method: 'post',
  path: '/import',
  title: '导入机构部门',
  func: 'import',
  requirePermission: false
},
{
  method: 'post',
  path: '/update-check',
  title: '修改复核表',
  func: 'updateCheck',
  requirePermission: false
}
]


export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/institutions-draft'
}

