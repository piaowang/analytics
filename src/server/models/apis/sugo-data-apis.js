const ctrl = 'controllers/sugo-data-apis.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '数据管理',
  group: '数据 API',
  menusCate: ['数据服务中心','数据服务管理', '数据API']

}

async function logExtractor(params, ctx) {
  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  let q = isGET ? ctx.query : ctx.request.body
  return q
}


const routes = [
  {
    path: '/app/data-apis',
    title: '获取数据 API 列表',
    method: 'get',
    func: 'query',
    requirePermission: false
  }, {
    path: '/app/data-apis',
    title: '创建数据 API',
    method: 'post',
    func: 'create'
  }, {
    path: '/app/data-apis/:id',
    title: '更新数据 API',
    method: 'put',
    func: 'update'
  }, {
    path: '/app/data-apis/:id',
    title: '删除数据 API',
    method: 'delete',
    func: 'remove'
  }, {
    path: '/app/data-apis/call-logs',
    title: '查询数据 API 概览',
    method: 'get',
    func: 'queryAPILog'
  }, {
    path: '/data-api/(.*)',
    title: '调用数据 API',
    method: 'get',
    func: 'callDataAPI',
    requireLogin: false,
    requirePermission: false,
    alwaysLogging: true,
    logExtractor
  }, {
    path: '/data-api/(.*)',
    title: '调用数据 API',
    method: 'post',
    func: 'callDataAPI',
    requireLogin: false,
    requirePermission: false,
    alwaysLogging: true,
    logExtractor
  }

]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : ''
}
