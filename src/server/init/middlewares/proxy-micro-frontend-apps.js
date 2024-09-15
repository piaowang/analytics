import httpProxy from 'http-proxy-middleware'
import k2c from 'koa2-connect'
import config from '../../config'
import _ from 'lodash'

//** 微应用静态资源统一前缀 */
const STATIC_PREFIX = '/static-apps'

const {
  microFrontendApps = {},
  site: { microFrontendUrlMap = {} }
} = config

const MICRO_APPS_PUBLICPATH_DICT = _.isEmpty(microFrontendUrlMap)
  ? {}
  : _.keys(microFrontendUrlMap).reduce((res, key) => {
      res[microFrontendUrlMap[key].publicPath] = key
      return res
    }, {})

/**
 * 微前端统一headers处理
 * micro-apps: 'sugo-indices-dev'
 */
export default async (ctx, next) => {
  const path = ctx.path
  if (_.isEmpty(microFrontendApps) || _.isEmpty(microFrontendUrlMap)) {
    return await next()
  }

  const microAppName = ctx.headers['micro-apps']
  // 代理微应用htmlEntry
  if (microAppName) {
    if (microFrontendApps[microAppName] === ctx.origin) {
      // 相同的 host 无需代理，一般用于扩展包内的微前端
      return await next()
    }
    const proxyTarget = {
      target: microFrontendApps[microAppName],
      changeOrigin: true
    }
    await k2c(httpProxy(proxyTarget))(ctx, next)
  }

  // 代理微应用的静态资源(统一以/static-apps开头)
  if (path.startsWith(STATIC_PREFIX)) {
    const key = _.keys(MICRO_APPS_PUBLICPATH_DICT).find(p => path.startsWith(p))
    const microAppName = MICRO_APPS_PUBLICPATH_DICT[key]
    // console.log(key, '===========ppp', path, MICRO_APPS_PUBLICPATH_DICT, microAppName)
    const proxyTarget = {
      target: microFrontendApps[microAppName],
      changeOrigin: true
    }
    await k2c(httpProxy(proxyTarget))(ctx, next)
  }

  return await next()
}
