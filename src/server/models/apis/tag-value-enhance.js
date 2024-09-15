/**
 * 标签分类接口定义
 */
const ctrl = 'controllers/tag-value-enhance.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '用户画像',
  group: '价值升档'
}

const routes = [
  {
    path: '/getlist',
    title: '查看价值升档列表',
    method: 'get',
    func: 'getValueEnhanceList'
  },{
    path: '/get/:id',
    title: '查看价值升档',
    method: 'get',
    func: 'getValueEnhanceById'
  }, {
    path: '/update',
    title: '更新价值升档',
    method: 'post',
    func: 'saveValueEnhance',
    requirePermission: true
  }, {
    path: '/delete',
    title: '删除价值升档',
    method: 'post',
    func: 'delValueEnhance',
    requirePermission: true
  }, {
    path: '/create',
    title: '新建价值升档',
    method: 'post',
    func: 'saveValueEnhance',
    requirePermission: true
  }, {
    path: '/recalculate',
    title: '重新计算价值升档',
    method: 'get',
    func: 'recalculateValueEnhance',
    requirePermission: true
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag-enhance'
}
