const ctrl = 'controllers/sugo-dimension-layer.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl
}

const routes = [
  {
    path: '/get',
    title: '查看标签列表',
    method: 'get',
    func: 'getDimensionLayer'
  }, {
    path: '/update/:id',
    title: '更新标签',
    method: 'post',
    func: 'editDimensionLayer'
  }, {
    path: '/delete/:id',
    title: '删除标签',
    method: 'post',
    func: 'deleteDimensionLayer'
  }, {
    path: '/create/:id',
    title: '新建标签',
    method: 'post',
    func: 'addDimensionLayer'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/dimension-layer'
}
