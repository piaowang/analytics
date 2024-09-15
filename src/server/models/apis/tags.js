const ctrl = 'controllers/sugo-tags.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  menusCate: ['智能运营', '数据管理']
}

const routes = [
  {
    path: '/get/:id',
    title: '查看标签列表',
    method: 'get',
    func: 'getTags'
  },
  {
    path: '/update/:id',
    title: '更新标签',
    method: 'post',
    func: 'editTag'
  },
  {
    path: '/delete/:id',
    title: '删除标签',
    method: 'post',
    func: 'deleteTag'
  },
  {
    path: '/create/:id',
    title: '新建标签',
    method: 'post',
    func: 'addTag'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag'
}
