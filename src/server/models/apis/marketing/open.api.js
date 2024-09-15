const base = {
  lib: 'controllers/marketing/model-settings.controller',
  requireLogin: false,
  requirePermission: false
}

/**
 * 配置不需要登录验证的路由
 */
const routes = [
  {
    path: '/v1/marketing-model-settings/callbak',
    title: '策略模型计算接口回调处理',
    method: 'post',
    func: 'callbakForCalcModel'
  }
]


export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'api'
}
