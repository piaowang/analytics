/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description 营销模型服务端路由定义
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/models.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['产品实验室', '智能营销', '营销模型']
}

const routes = [
  {
    path: '/list',
    title: '查询营销模型',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/list-byLcId',
    title: '按名称查询营销模型',
    method: 'get',
    func: 'getModelByLifeCycleId'
  },
  {
    path: '/create',
    title: '新增营销模型',
    method: 'post',
    func: 'save'
  },
  {
    path: '/update/:id',
    title: '编辑营销模型',
    method: 'put',
    func: 'save'
  },
  {
    path: '/delete/:id',
    title: '删除营销模型',
    method: 'delete',
    func: 'delete'
  },
  {
    path: '/tree-levels',
    title: '获取所有模型&场景列表',
    method: 'get',
    func: 'getAllModelsAndScenes'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-models'
}
