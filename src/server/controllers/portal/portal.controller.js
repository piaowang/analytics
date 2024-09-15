import c2k from 'koa2-connect'
import proxy from 'http-proxy-middleware'
import config from '../../config'
import { Response } from '../../utils/Response'
import _ from 'lodash'

const { microFrontendApps } = config

const target = `${microFrontendApps['sugo-portal-app']}`

let proxyMiddleware = c2k(proxy({
  target: `${target}`,
  changeOrigin: true,
  pathRewrite: {
    '^/app/portal/': '/app' // rewrite path
  }

}))

export default class SugoPortalController {

  constructor() {
  }

  async proxy(ctx) {
    if (!microFrontendApps['sugo-portal-app']) return ctx.body = Response.fail()

    return proxyMiddleware(ctx)
  }
}
