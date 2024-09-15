import Koa from 'koa'
import mount from 'koa-mount'
import Bodyparser from 'koa-bodyparser'
import session from 'koa-session'
import logger from 'koa-logger'
import serve from 'koa-static'
import CONFIG from '../config'
import router from '../routes'
import Pug from 'koa-pug-global'
import _ from 'lodash'
import conditional from 'koa-conditional-get'
import etag from 'koa-etag'
import compress from 'koa-compress'
import ua from '../utils/ua'
import commonMiddleware from './common-middleware'
import apiSdkMiddleware from './api-sdk-middlware'
import loginCheckMiddleware from './login-check-middleware'
import marketBrainCooperateWechatVisit from './middlewares/market-brain-cooperate-wechatvisit.js'
import permissionCheckMiddleware from './permission-check-middleware'
import licenseMiddleware from './license-middleware'
import log2db from '../utils/log2db'
import forward from 'koa-forward-request'
import withDurationMarker from '../utils/duration-marker-middleware'
import withAbortNotifier from '../utils/abort-notifier-middleware'
import allowCROSMiddleware from './allow-cros-middleware'
import RedisStore from 'koa2-session-ioredis'
import casAuthMiddleware, { getCasClient } from './middlewares/cas-auth-middleware'
import openApiApplyProject from './middlewares/allow-apply-project-middleware'
import { generate } from 'shortid'
import { compressUrlQuery, decompressUrlQuery, tryJsonParse } from '../../common/sugo-utils'
import xorTokenCheck from './middlewares/api-token-auth-middleware'
import { getRedisClient } from '../utils/redis'
import koaUnless from 'koa-unless'
import path from 'path'
import withOnDemandCachingMiddleware from './caching-on-demand-middleware'
import proxyMiddleware from 'http-proxy-middleware'
import c2k from 'koa2-connect'
import { staticUrl } from 'common/constants'
import url from 'url'
import withJWTLoginMiddleware from './jwt-login-middleware'
import xmlParser from 'koa-xml-body'
import anyProxyMiddleware from './middlewares/any-proxy-middleware'
import proxyMicroFontendApps from './middlewares/proxy-micro-frontend-apps'
import flatMenusType from '../../common/flatMenus.js'
import {globalErrorHandler} from './global-error-handler-middleware'

const {staticDashboardScanPath} = CONFIG.site
const { tokenSwitch, proxy = {} } = CONFIG
const local = CONFIG.site
const env = local.env
const isProduction = env === 'production'
const cwd = process.cwd()
const app = new Koa()
const staticOption = () => ({
  maxAge: 1000 * 60 * 60 * 24 * 365,
  hidden: true
})

const bodyparser = Bodyparser(CONFIG.defaultRequestbodyLimit)

export default async function init(extraLocal) {

  // global middlewares
  app.keys = ['sugo:' + env + ':' + CONFIG.db.database]

  // 转发请求，解决跨域问题
  forward(app, { debug: !isProduction })

  if (isProduction) {
    app.context.markProgress = _.noop
  } else {
    withDurationMarker(app)
  }

  // xhr.abort 时通知 druid 取消查询
  withAbortNotifier(app)

  app.use(compress({
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH
  }))

  // 启用/api/v2/启用签名验证
  if (tokenSwitch) {
    app.use(xorTokenCheck)
  }

  //** 通用http服务代理 add by WuQic 2020/03/09 */
  if (!_.isEmpty(proxy)) {
    app.use(anyProxyMiddleware({ targets: proxy }))
  }

  //** 代理微前端子应用 add by WuQic 2020/03/26 */
  if (!_.isEmpty(CONFIG.microFrontendApps)) {
    app.use(proxyMicroFontendApps)
  }

  //get
  app.use(conditional())
  // add etags
  app.use(etag())

  // 静态资源允许CROS响应头
  if (CONFIG.allowStaticResourceCROS) {
    app.use(allowCROSMiddleware)
  }

  //静态资源目录
  app.use(serve(cwd + '/public', staticOption()))
  app.use(mount('/_bc', serve(cwd + '/node_modules', staticOption())))
  app.use(mount('/static', serve(cwd + '/static', staticOption())))
  if (staticDashboardScanPath) {
    app.use(mount('/static-dashboard', serve(path.resolve(__dirname, staticDashboardScanPath), staticOption())))
  }

  // 代理本地静态资源服务到路径 => /_bc/extra_pic/
  const staticProxyUrl = CONFIG.staticProxyUrl
  if (staticProxyUrl) {
    const uri = url.parse(staticProxyUrl)
    const { protocol, host, pathname } = uri
    // console.log(protocol, host, pathname)
    const staticProxy = proxyMiddleware(staticUrl, {
      target: `${protocol}//${host}`,
      changeOrigin: true,
      pathRewrite: {
        [`^${staticUrl}`]: pathname // rewrite path
      }
    })
    app.use(c2k(staticProxy))
  }

  // body解析，与 http-proxy-middleware 不兼容
  bodyparser.unless = koaUnless
  app.use(xmlParser())
  app.use(bodyparser.unless({
    path: /(^\/app\/task-schedule)|(^\/app\/sdk\/sdk-upload-importfile)|(^\/app\/portal\/)|(^\/app\/sdk\/sdk-upload-importfile)|(^\/app\/task-v3\/upload-clone-package)/
  }))

  // session
  const sessionKey = 'sugo:sess'
  const sessionStore = new RedisStore({
    client: await getRedisClient(),
    duplicate: true
  })

  app.use(session({
    key: sessionKey,
    signed: false,
    genid: (ctx) => {
      const {q} = ctx.request.body || {}
      let sessionId = generate()
      if (q) {
        const params = tryJsonParse(decompressUrlQuery(q))
        sessionId = `${params.username}-${sessionId}`
      }
      return `${sessionId}`
    },
    store: sessionStore,
    maxAge: null
  }, app))

  // filter
  for (const filter of CONFIG.app.filter) {
    app.use(require(filter.path).default)
  }


  // 启用项目数据接口认证(无限极，ip白名单控制)
  app.use(openApiApplyProject)

  // 记录所用方式与时间
  if (env === 'development') {
    app.use(logger())
  }

  //全局错误处理 输出到body
  app.use(globalErrorHandler)

  // 启用license验证
  if (CONFIG.enableLicense) {
    app.use(licenseMiddleware)
  }

  //* 通常无需特别配置 sdk拉取配置等接口是允许用跨域请求 默认true（特殊情况下如果代理层设置了则不需要再设置跨域header)
  const { sdkApiCrossHeader = true } = CONFIG
  if (sdkApiCrossHeader) {
    //sdk埋点允许跨域请求响应头信息设置
    app.use(apiSdkMiddleware)
  }
  
  // jwt 单点登录中间件，需要放到 commonMiddleware 之前
  withJWTLoginMiddleware(app)

  //通用加工，获取host等
  app.use(commonMiddleware)
  app.use(async (ctx, next) => {
    if (extraLocal) {
      Object.assign(ctx.local, extraLocal)
    }
    await next()
  })

  app.use(ua)
  if (CONFIG.log2db) app.use(log2db)
  app.use(loginCheckMiddleware)
  app.use(permissionCheckMiddleware)

  const menus = CONFIG.site.menus
  const menuPaths = CONFIG.site.enableNewMenu ? flatMenusType(CONFIG.site.menus) 
    : _.flatMap(menus, m => _.map(m.children, p => p.path))
  if (menuPaths.includes('/console/market-brain-events')) {
    app.use(marketBrainCooperateWechatVisit)
  }

  //pug template
  new Pug({
    viewPath: cwd + '/views',
    debug: !isProduction,
    pretty: !isProduction,
    compileDebug: !isProduction,
    locals: { compressUrlQuery },
    noCache: !isProduction,
    app: app // equals to pug.use(app) and app.use(pug.middleware)
  })

  // 集成客户的(标准)单点登陆接口
  if (CONFIG.CAS.server) {
    // Create a new instance of CASAuthentication.
    const casClient = getCasClient(sessionKey, sessionStore)
    // CAS中间件 => 登出
    app.use(casClient.logout())
      // CAS中间件 => CAS server调用post登出
      .use(casClient.ssoff())
      // CAS中间件以下为必须
      .use(casClient.serviceValidate())
      .use(casClient.authenticate())
      // 处理CAS系统用户与本系统用户权限
      .use(casAuthMiddleware)
  }
  
  // 缓存中间件
  withOnDemandCachingMiddleware(app)

  //路由处理
  router(app)
  
  return app
}
