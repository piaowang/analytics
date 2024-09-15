
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-global-config.controller',
  class: '指标模型',
  group: '维度管理'
}

const routes = [
  {
    method: 'get',
    path: '/app/global-config',
    title: '查询全局配置',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/global-config',
    title: '创建全局配置',
    func: 'create'
  },
  {
    method: 'put',
    path: '/app/global-config/:id',
    title: '修改全局配置',
    func: 'update'
  },
  {
    method: 'delete',
    path: '/app/global-config/:id',
    title: '删除全局配置',
    func: 'remove'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
