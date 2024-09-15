const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/user-guide-reading-state.controller',
  group: '用户向导阅读状态'
}

const routes = [
  {
    method: 'get',
    path: '/states',
    title: '取得本用户所有向导阅读状态',
    func: 'getStates'
  }, {
    method: 'get',
    path: '/states/:stateId',
    title: '取得某个向导阅读状态',
    func: 'getStates'
  }, {
    method: 'post',
    path: '/states',
    title: '添加状态',
    func: 'createState'
  }, {
    method: 'put',
    path: '/states/:stateId',
    title: '修改状态',
    func: 'updateState'
  }, {
    method: 'delete',
    path: '/states/:stateId',
    title: '删除状态',
    func: 'deleteState'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/user-guide-reading-state'
}
