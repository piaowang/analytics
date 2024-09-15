const ctrl = 'controllers/role-draft.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '管理中心',
  group: '角色管理'
}

const routes = [
  {
    path: '/getRoleDraft',
    title: '获取角色列表',
    method: 'post',
    requirePermission: false,
    func: 'getRoleDraft'
  },
  {
    path: '/detail',
    title: '获取角色详细',
    method: 'post',
    requirePermission: false,
    func: 'getRoleDraftDetail'
  },
  {
    path: '/updataRole',
    title: '更新草稿角色',
    method: 'post',
    requirePermission: false,
    func: 'updataRole'
  },
  {
    path: '/delete',
    title: '删除草稿角色',
    method: 'post',
    requirePermission: false,
    func: 'deleteFun'
  },
  {
    path: '/addRole',
    title: '新增角色-需审核',
    method: 'post',
    requirePermission: false,
    func: 'addRole'
  },
  {
    path: '/commitCheck',
    title: '提交角色审核',
    method: 'post',
    requirePermission: false,
    func: 'commitCheck'
  },
  {
    path: '/copyRole',
    title: '复制角色审核',
    method: 'post',
    requirePermission: false,
    func: 'copyRole'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/role-draft'
}
