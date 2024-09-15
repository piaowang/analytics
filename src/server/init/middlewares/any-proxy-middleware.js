import httpProxy from 'http-proxy-middleware'
import k2c from 'koa2-connect'
import pathToRegexp from 'path-to-regexp'

/**
 * 根据配置实现http代理
 const options = {
  targets: {
    '/user': {
      // this is option of http-proxy-middleware
      target: 'http://localhost:3000', // target host
      changeOrigin: true, // needed for virtual hosted sites
    },
    '/user/:id': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
    // (.*) means anything
    '/api/(.*)': {
      target: 'http://10.94.123.123:1234',
      changeOrigin: true,
      pathRewrite: {
        '/passager/xx': '/mPassenger/ee', // rewrite path
      }
    },
  }
}
*/
export default (options = {}) => {
  return async (ctx, next) => {
    const { targets = {} } = options
    const { path } = ctx
    for (const routeStr of Object.keys(targets)) {
      // 匹配多个路由规则，用'|'分割
      const routes = routeStr.split('|')
      for (const route of routes) {
        if (pathToRegexp(route).test(path)) {
          await k2c(httpProxy(targets[routeStr]))(ctx, next)
          break
        }
      }
    }
    await next()
  }
}
