const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-monitor-alarms.controller',
  class: '日志分析',
  group: '监控告警',
  menusCate: ['智能运营', '数据运营工具', '数据监控']
}

const routes = [
  {
    method: 'get',
    path: '/query-all/:projectId',
    title: '取得监控列表',
    func: 'query'
  },
  {
    method: 'get',
    path: '/query/:id',
    title: '取得单个监控',
    func: 'query'
  },
  {
    method: 'post',
    path: '/create',
    title: '创建监控',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/update/:id',
    title: '更新监控',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/remove/:id',
    title: '删除监控',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/change/:id',
    title: '启动/暂停监控',
    func: 'changeMonitor'
  },
  {
    method: 'get',
    path: '/exceptions/:id?',
    title: '监控异常记录',
    func: 'getExceptions'
  },
  {
    method: 'put',
    path: '/exceptions/:id',
    title: '更新监控异常记录',
    func: 'updateException'
  },
  {
    method: 'delete',
    path: '/remove-exceptions/:id',
    title: '监控异常记录',
    func: 'removeExceptions'
  },
  {
    method: 'post',
    path: '/interface-test',
    title: '监控通知接口测试',
    func: 'doTesting'
  },

  // 左侧菜单，根据告警处理状态查询告警数量
  {
    method: 'get',
    path: '/exceptionsCount', // ?q=compressed
    title: '告警异常记录个数查询',
    func: 'getExceptionsCount'
  },

  // 处理异常记录 权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/:id/exceptions',
    title: '处理异常记录',
    func: 'updateException'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/exceptions/:id/inspect-source-data',
    title: '查看错误详情',
    func: 'query'
  },

  // 告警通知模版
  {
    method: 'get',
    path: '/notify-templates', // ?q=compressed
    title: '查询告警通知模版',
    func: 'getNotifyTemplates'
  },
  {
    method: 'post',
    path: '/notify-templates',
    title: '创建告警通知模版',
    func: 'createNotifyTemplate'
  },
  {
    requirePermission: true,
    method: 'put',
    path: '/notify-templates/:id',
    title: '通知模版管理', // 修改告警通知模版
    func: 'updateNotifyTemplate'
  },
  {
    method: 'delete',
    path: '/notify-templates/:id',
    title: '删除告警通知模版',
    func: 'deleteNotifyTemplate'
  },
  // 微信查询接口
  {
    method: 'get',
    path: '/contact-wx/departments', // ?departmentId=xx
    title: '查询微信部门列表',
    func: 'getWeChatDepartments'
  },
  {
    method: 'get',
    path: '/contact-wx/persons', // ?departmentId=xx
    title: '查询微信用户列表',
    func: 'getWeChatContacts'
  },
  // 错误码前端权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/error-code/:id',
    title: '错误码管理',
    func: 'getNotifyTemplates'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/error-code/productLine/:id',
    title: '产品线管理',
    func: 'getNotifyTemplates'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/error-code/system-code/:id',
    title: '系统管理',
    func: 'getNotifyTemplates'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/error-code/interface-code/:id',
    title: '接口方管理',
    func: 'getNotifyTemplates'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/monitor-alarms'
}
