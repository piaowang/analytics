/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description 营销模型服务端路由定义
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/life-cycle.controller',
  class: '智能运营',
  group: '智能运营',
  menusCate: ['产品实验室', '智能运营', '生命周期']
}

const routes = [
  {
    path: '/get/:project_id',
    title: '获取项目生命周期设置',
    method: 'get',
    func: 'queryByProjectId'
  },
  {
    path: '/create',
    title: '新增生命周期',
    method: 'post',
    func: 'save'
  },
  {
    path: '/update/:id',
    title: '编辑生命周期',
    method: 'put',
    func: 'update'
  },
  {
    path: '/get-allug',
    title: '查询所有分群和分群历史版本',
    method: 'get',
    func: 'getAllUg'
  },
  {
    path: '/get-preUg',
    title: '查询指定分群历史版本',
    method: 'get',
    func: 'getPreUg'
  },
  {
    path: '/get-preUgById',
    title: '查询分群历史版本',
    method: 'post',
    func: 'getPreUgByIds'
  },
  {
    path: '/create-model',
    title: '新增或查找营销模型',
    method: 'get',
    func: 'createModel'
  },
  {
    path: '/contract-segment-scene',
    title: '关联用户群和营销场景',
    method: 'post',
    func: 'contractSegmentWithScene'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/life-cycle'
}
