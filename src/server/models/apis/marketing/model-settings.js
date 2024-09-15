/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2020-02-06 14:45:56
 * @description 营销智能中台-模型设置表路由
 */
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/model-settings.controller',
  class: '用户分群',
  group: '策略模型'
}

const routes = [
  {
    path: '/create',
    title: '新增模型设置',
    method: 'post',
    func: 'save'
  },
  {
    path: '/get/:projectId',
    title: '查询单条模型设置',
    method: 'get',
    func: 'findByProjectId'
  },
  {
    path: '/update/:id',
    title: '更新模型设置',
    method: 'put',
    func: 'save'
  },
  {
    path: '/remove/:id',
    title: '删除模型设置',
    method: 'delete',
    func: 'remove'
  },
  {
    path: '/manaual-calc/:projectId',
    title: '手动计算模型数据',
    method: 'get',
    func: 'manualCalc'
  },
  {
    path: '/getModelUsergroups/:projectId',
    title: '获取模型用户分群列表',
    method: 'get',
    func: 'getModelUsergroups'
  },
  {
    path: '/getCalcState/:projectId',
    title: '获取模型的计算状态',
    method: 'get',
    func: 'getCalcState'
  },
  {
    path: '/save-title/:projectId',
    title: '保存分群标题',
    method: 'get',
    func: 'saveTitle'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-model-settings'
}
