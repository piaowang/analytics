const ctrl = 'controllers/sugo-recommend-result.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '数据管理',
  group: '推荐 API',
}

async function logExtractor (params, ctx) {
  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  let q = isGET ? ctx.query : ctx.request.body
  return q
}

const routes = [
  {
    path: '/recommend-api/v1/(.*)',
    title: '经传推荐API',
    method: 'get',
    func: 'callRecommendAPIV1',
    requireLogin: false,
    requirePermission: false,
    alwaysLogging: true,
    logExtractor
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
