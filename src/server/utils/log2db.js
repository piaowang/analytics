import db from '../models'
import winston from 'winston'
import conf from '../config'
import _ from 'lodash'
import pathToRegexp from 'path-to-regexp'
import { loggingApis, alwaysLoggingApis } from '../services/sugo-log.service'

const logByMethod = (conf.log2dbByMethod || 'post,put,patch,delete').split(',')
const logByMethodSet = new Set([...logByMethod, ...logByMethod.map(m => m.toUpperCase())])

const logByPathStr = _.isEmpty(conf.log2dbByPath) ? 'others' : conf.log2dbByPath
const logByPaths = logByPathStr.split(',')
const shouldLogOtherPaths = _.includes(logByPaths, 'others'), preCheckPaths = logByPaths.filter(p => p !== 'others')
// const regexDict = _.mapValues(preCheckPaths, (v, k) => pathToRegexp(k))
const regexDict = _.zipObject(preCheckPaths, preCheckPaths.map(p => pathToRegexp(p)))

//
// Inherit from `winston-transport` so you can take advantage
// of the base functionality and `.exceptions.handle()`.
//
class CustomTransport extends winston.Transport {
  constructor (opts) {
    super(opts)
    //
    // Name this logger
    //
    this.name = 'customLogger'

    //
    // Set the level from your options
    //
    this.level = opts.level || 'info'
  }

  log (meta, callback) {
    db.Log.create(meta)
      .then(() => {
        return callback(null, true)
      })
      .catch(callback)
  }
}

winston.configure({
  transports: [
    new CustomTransport({})
  ]
})

export const GLOBAL_ERROR = '__GLOBAL_ERROR__'

export default async function (ctx, next) {

  let { user = {} } = ctx.session
  let { company = {} } = user
  let obj = {
    path: ctx.path,
    method: ctx.method,
    body: null,
    user_id: user.id,
    company_id: company.id,
    username: user.username,
    company_name: company.name,
    ip: ctx.ips.length ? ctx.ips.join(',') : ctx.ip
  }

  // ******************错误日志写入数据库 add by WuQic 2019-04-24***********************/
  const errorLog2db = async next => {
    try {
      return await next()
    } catch(e) {
      const flag = conf.errorLog2db || false
      if (flag) {
        obj.body = {
          [GLOBAL_ERROR]: e.message, // key必须为GLOBAL_ERROR 后面解析会用到此key sugo-log.service: 158
          params: {
            ...ctx.q
          }
          // stack: e.stack
        }
        obj.status = 500
        winston.log('info', '', obj) // 日志写入数据库
      }
      throw e
    }
  }

  let apiInfo = alwaysLoggingApis.find(p => p.pathReg.test(ctx.path))
  if (!apiInfo) {
    if (!logByMethodSet.has(ctx.method)) {
      return await errorLog2db(next)
    }
    let matchingPath = _.findKey(regexDict, v => ctx.path.match(v))
    if (!matchingPath && !shouldLogOtherPaths) {
      return await errorLog2db(next)
    }
    const method = ctx.method.toLocaleLowerCase()
    apiInfo = loggingApis.find(p => p.pathReg.test(ctx.path) && p.method === method) || {}
  }
  if (apiInfo.logExtractor) {
    obj.body = await apiInfo.logExtractor(ctx.q, ctx)
  } else {
    obj.body = ctx.q
  }
  await errorLog2db(next)
  obj.status = ctx.response.status
  if (obj.path === '/common/login') { // 如果是登录操作则把body参数中的密码去掉
    obj.body = {}
  }
  winston.log('info', '', obj) // 日志写入数据库
}
