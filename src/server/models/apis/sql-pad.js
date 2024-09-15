const ctrl = 'controllers/sql-pad.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: 'SQL-Pad'
}

const routes = [
  {
    path: '/*',
    title: 'GET redirect',
    method: 'get',
    func: 'redirect'
  }, {
    path: '/*',
    title: 'POST redirect',
    method: 'post',
    func: 'redirect'
  }, {
    path: '/*',
    title: 'PUT redirect',
    method: 'put',
    func: 'redirect'
  }, {
    path: '/*',
    title: 'DELETE redirect',
    method: 'delete',
    func: 'redirect'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'sql-pad'
}
