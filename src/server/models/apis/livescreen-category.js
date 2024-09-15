const ctrl = 'controllers/sugo-livescreen-category.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  group: '实时大屏',
  class: '分组管理'
}

const routes = [
  {
    path: '/list',
    title: '获取所有分类',
    method: 'get',
    func: 'get',
    requirePermission: false
  }, {
    path: '/create',
    title: '创建大屏分类',
    method: 'post',
    func: 'create'
  }, {
    path: '/delete/:id',
    title: '删除大屏分类',
    method: 'post',
    func: 'del'
  }, {
    path: '/update/:id',
    title: '修改大屏分类',
    method: 'post',
    func: 'update'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/livescreen-category'
}
