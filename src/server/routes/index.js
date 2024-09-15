import { apis } from '../models/apis'
import Router from 'koa-router'
import { resolve } from 'path'
import { log, err } from '../utils/log'
import { isClass } from 'common/sugo-utils'
import koaUnless from 'koa-unless'

//console.log(apis)
const router = new Router()
const prefix = '../'

function bool(arr) {
  return arr.reduce((prev, item) => {
    return prev && !!item
  }, true)
}
const instacesMap = new Map()
export default app => {
  //console.log('apis')
  apis.forEach(api => {
    let { method, path, func, lib } = api
    let mw = func.split(',')
    let mww = [false]
    mww = mw.map(_func => {
      const obj = require(resolve(__dirname, prefix + lib + '.js'))
      const Clazz = obj.default || obj
      try {
        let instance = Clazz
        if (isClass(Clazz)) {
          instance = instacesMap.get(lib)
          if (!instance) {
            instance = new Clazz()
            instacesMap.set(lib, instance)
          }
        }
        // const instance = isClass(Clazz) ? new Clazz() : Clazz
        // 支持class内部this调用
        return instance[_func].bind(instance)
      } catch (e) {
        err(e.message, path, 'no controller file', lib)
      }
    })

    if (bool(mww)) router[method](path, ...mww)
    else {
      log(path, method, 'no controller')
    }
  })

  const routerMid = router.routes()
  routerMid.unless = koaUnless
  app.use(routerMid.unless({ path: /^\/socket.io|^\/webconn|^\/conn|^\/res\/pty/ })).use(router.allowedMethods())
}
