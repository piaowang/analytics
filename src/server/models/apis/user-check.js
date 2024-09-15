const ctrl = 'controllers/user-check.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '管理中心',
  group: '用户管理'
}

const routes = [
  {
    path: '/app/user-check/get',
    title: '查询用户草稿列表',
    method: 'get',
    common: true,
    requirePermission: false,
    func: 'getUsersDraft'
  }, {
    path: '/app/user-check/create',
    title: '添加用户',
    method: 'post',
    func: 'addUserDraft',
    logExplain: `<%= username %> 创建了用户 <%= body.user.username %>，其属性为：
      email: <%= body.user.email %>
      名称: <%= body.user.first_name %>
      电话: <%= body.user.cellphone %>
      角色: <%= body.user.roles.map(r => r.name).join('，')%>
    `,
    logKeywordExtractor: 'body.user.username'
  }, {
    path: '/app/user-check/update',
    title: '更新用户',
    method: 'post',
    func: 'editUserDraft',
    logExplain: `<%= username %> 将用户 <%= body.user.username %> 的属性修改为：
      email: <%= body.user.email %>
      名称: <%= body.user.first_name %>
      电话: <%= body.user.cellphone %>
      角色: <%= body.user.roles.map(r => r.name).join('，')%>
      密码: <%= body.user.password ? '******' : '(无变更)' %>
    `,
    logKeywordExtractor: 'body.user.username'
  },
  {
    path: '/app/user-check/delete',
    title: '删除用户',
    method: 'post',
    func: 'deleteUserDraft',
    logExplain: '<%= username %> 删除了用户 <%= body.username %>',
    logKeywordExtractor: 'body.username'
  },
  {
    path:'/app/user-check/find-one-user',
    title:'查询用户表单个用户',
    method:'post',
    requirePermission: false,
    func: 'findOneUser'
  },
  {
    path:'/app/user-check/find-one-user-draft',
    title:'查询用户表单个用户',
    method:'post',
    requirePermission: false,
    func: 'findOnerUserDraft'
  },
  {
    path:'/app/user-check/submit-recall-application',
    title:'提交审核或撤销审核',
    method:'post',
    requirePermission: false,
    func: 'submitOrRecallApplication'
  },
  {
    path:'/app/user-check/audit',
    title:'角色审核',
    method:'post',
    requirePermission:false,
    func: 'userAudit'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : ''
}
