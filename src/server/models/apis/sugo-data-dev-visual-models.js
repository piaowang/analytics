
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-data-dev-visual-models.controller',
  class: '数据开发中心',
  group: '数据建模'
}

const routes = [
  {
    method: 'get',
    path: '/app/data-dev/visual-models', // ?model_id=xxx 查询单个模型下的执行历史
    title: '查询数据开发中心的数据模型',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/data-dev/visual-models',
    title: '创建数据开发中心的数据模型',
    func: 'create'
  },
  {
    method: 'put',
    path: '/app/data-dev/visual-models/:id',
    title: '修改数据开发中心的数据模型',
    func: 'update'
  },
  {
    method: 'delete',
    path: '/app/data-dev/visual-models/:id',
    title: '删除数据开发中心的数据模型',
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
