/*
 * @Author: xuxinjiang
 * @Date: 2020-04-24 19:47:21
 * @LastEditors: your name
 * @LastEditTime: 2020-07-02 16:29:25
 * @Description: file content
 */ 
import {
  addRoleLogExplain,
  editRoleLogExplain
} from '../../controllers/role.controller'

const ctrl = 'controllers/role.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '管理中心',
  group: '角色管理',
  menusCate: ['系统管理', '角色管理']


}

const routes = [
  {
    path: '/get',
    title: '获取角色列表',
    method: 'get',
    requirePermission: false,
    func: 'getRoles'
  },
  {
    path: '/get/permissions',
    title: '获取权限列表',
    method: 'get',
    func: 'getPermissions',
    requirePermission: false
  },
  {
    path: '/delete',
    title: '删除角色',
    method: 'post',
    func: 'deleteRole',
    logExplain: '<%= username %> 删除了角色 <%= body.name %>',
    logKeywordExtractor: 'body.name'
  },
  {
    path: '/create',
    title: '创建角色',
    method: 'post',
    requirePermission: false,
    func: 'addRole',
    logExplain: addRoleLogExplain,
    logKeywordExtractor: 'body.role.name'
  },
  {
    path: '/update',
    title: '更新角色',
    method: 'post',
    func: 'editRole',
    logExplain: editRoleLogExplain,
    logKeywordExtractor: 'body.update.name'
  }
  // {
  //   // 只是为了前端权限控制而创建的路由，并不会实际调用
  //   path: '/function-permission-management',
  //   title: '更新角色功能权限',
  //   requirePermission: true,
  //   method: 'post',
  //   func: 'getRoles'
  // },
  // {
  //   // 只是为了前端权限控制而创建的路由，并不会实际调用
  //   path: '/data-permission-management',
  //   title: '更新角色数据权限',
  //   requirePermission: true,
  //   method: 'post',
  //   func: 'getRoles'
  // }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/role'
}
