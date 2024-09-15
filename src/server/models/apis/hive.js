/**
 * Created by fengxj on 3/26/19.
 */
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/hive.controller',
  class: 'hive',
  group: 'hive'
}
const routes = [
  {
    method: 'get',
    path: '/databases',
    title: 'databases',
    func: 'getDatabases'
  }, {
    method: 'get',
    path: '/:database/tables',
    title: 'tables',
    func: 'getTables'
  }, {
    method: 'get',
    path: '/:database/:table/schema',
    title: 'schema',
    func: 'getSchema'
  },
  {
    method: 'get',
    path: '/host',
    title: '查询 hive 地址和端口',
    func: 'getHost'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/hive'
}

