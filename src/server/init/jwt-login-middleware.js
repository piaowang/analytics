/**
 * jwt 单点登录，支持只授权部分路由，支持 token 过期时间
 *
 * 实现方案:
 * 1. 分享时，需要将授权范围和有效时间传给后端，服务器端结合当前用户信息生成一个 jwt 签名
 * 2. 把这个 token 和大屏链接组合，发给被分享人
 * 3. 被分享人访问这个链接时，服务器端解码 jwt 签名，判断分享人是否有权限访问授权范围，是则放行在授权范围内的请求
 *
 * 使用方法：
 * const q = { apiScopes: [], username: window.sugo.user.username, company_id: window.sugo.user.company.id, expiresIn: xxx }
 * let res = await FetchFinal.post('/app/request-jwt-sign', q)
 * let url = `/livescreen/${screenId}?jwtSign=${res.token}`
 * @param app
 */

import koaJwt from 'koa-jwt'
import jwt from 'jsonwebtoken'
import config from '../config'
import {prepareUserObjForSession, verifyPass} from '../controllers/user.controller'
import db from '../models'
import {generate} from 'shortid'
import _ from 'lodash'
import {toQueryParams} from '../../common/sugo-utils'
import {URL} from 'url'
import CryptoJS from 'crypto-js'
import pathToRegexp from 'path-to-regexp'
import { redisSetExpire, redisGet } from '../utils/redis'
import moment from 'moment'

const { jwtSecret = '2079942783392339', openJwtTokenConf = {} } = config

// apiScopes: ["post#/app/measure/order-management", ...] or ["*"] allow all
// pathScopes: ["/console/screen-control", ...] or ["*"] allow all

export function jwtSign(user, opts, others) {
  const {apiScopes, pathScopes, expiresIn, setCookie} = opts || {}
  const payload = {
    tokenId: generate(),
    userId: user.id,
    username: user.username,
    company_id: user.company_id,
    apiScopes: apiScopes || [],
    pathScopes: pathScopes || [],
    setCookie: !!setCookie,
    others
  }
  
  // expiresIn, Eg: 60, "2 days", "10h", "7d". A numeric value is interpreted as a seconds count.
  // If you use a string be sure you provide the time units (days, hours, etc),
  // otherwise milliseconds unit is used by default ("120" is equal to "120ms"
  return jwt.sign(payload, jwtSecret, expiresIn === 'unlimited' ? {} : {expiresIn: expiresIn || '24h'})
}

async function queryUserAndCheck(username, password) {
  if (!username || !password) {
    throw new Error('用户名或者密码不正确')
  }
  
  let user = await db.SugoUser.findOne({
    where: {
      username: username
    },
    raw: true
  })
  
  if (!user) {
    throw new Error('用户名或者密码不正确')
  }
  
  let pass = await verifyPass(password, user.password)
  if (!pass) {
    throw new Error('用户名或者密码不正确')
  }
  return user
}

export async function requestJWTSign(ctx) {
  // 分享时，需要将授权范围和有效时间传给后端，服务器端结合当前用户信息生成一个 jwt 签名
  let {user} = ctx.session
  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  if (!user && !isGET) {
    let {username, password} = ctx.request.body
    user = await queryUserAndCheck(username, password)
  }
  let { apiScopes, pathScopes, expiresIn, setCookie, redirect, ...rest } = isGET ?
    ctx.query
    : _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  if (isGET && apiScopes) {
    apiScopes = apiScopes.split(',')
  }
  if (isGET && pathScopes) {
    pathScopes = pathScopes.split(',')
  }
  
  const token = jwtSign(user, {apiScopes, pathScopes, expiresIn, setCookie})
  if (redirect) {
    let queryStr = toQueryParams({
      ...rest,
      jwtSign: token
    })
    ctx.redirect(redirect + (_.includes(redirect, '?') ? '&' : '?') + queryStr)
    return
  }
  ctx.body = {
    token: token
  }
}

function tryToGetPathNameFromReferer(referer) {
  if (!referer) {
    return ''
  }
  try {
    let url = new URL(referer)
    return url.pathname
  } catch (e) {
    console.error(`Parse referer error: ${referer}`)
  }
  return ''
}

function tryToGetJwtSignFromReferer(referer) {
  if (!referer) {
    return ''
  }
  try {
    let url = new URL(referer)
    return url.searchParams.get('jwtSign')
  } catch (e) {
    console.error(`Parse referer error: ${referer}`)
  }
  return ''
}

async function getUserForSessionStorage(username, company_id, apiScopes) {
  let user = await db.SugoUser.findOne({
    where: {
      username: username,
      company_id
    },
    include: [{
      model: db.SugoRole
    }]
  })
  
  if (!user) {
    console.error('User not exist: ' + username)
    return null
  }
  
  user = user.get({plain: true})
  
  user.password = '' // 不知道具体密码
  
  // 被分享人访问这个链接时，服务器端解码 jwt 签名，判断分享人是否有权限访问授权范围，是则放行在授权范围内的请求
  await prepareUserObjForSession(user)
  if (!_.isEqual(apiScopes, ['*'])) {
    let scopeIdSet = new Set(apiScopes)
    user.permissions = user.permissions.filter(p => scopeIdSet.has(p.id) || scopeIdSet.has(p.path))
  }
  return user
}

export default function withJWTLoginMiddleware(app) {
  const acceptDocRegex = /xml/i
  
  const getToken = ctx => {
    // 可直接访问接口时带上 jwtSign，或者在带 jwtSign 参数的页面里调用接口
    
    let {jwtSign} = ctx.query
    if (jwtSign) {
      return jwtSign
    }
    // 从带 jwtSign 的页面后退，不算作单点登录
    const accept = ctx.request.get('accept')
    return acceptDocRegex.test(accept) ? null : tryToGetJwtSignFromReferer(ctx.request.get('referer'))
  }
  
  const jwtParsingMiddleware = koaJwt({
    secret: jwtSecret,
    passthrough: true,
    key: 'jwtData',
    cookie: 'jwtSign',
    getToken: getToken
  })
  app.use(jwtParsingMiddleware)
  
  let jwtUserCacheDict = {}
  
  let transformToRegexpMemo = _.memoize(s => pathToRegexp(s))
  
  let jwtLoginMiddleware = async (ctx, next) => {
    // 无 token 或 token 超时失效
    if (!ctx.state.jwtData) {
      return await next()
    }
    let {apiScopes, pathScopes, username, company_id, tokenId, setCookie, exp} = ctx.state.jwtData
  
    if (!_.isEqual(pathScopes, ['*'])) {
      // 如果当前路径不属于允许范围，就不授权
      let currPath = ctx.request.path
      let refererPath = tryToGetPathNameFromReferer(ctx.request.get('referer'))
      let apiScopesTemp = apiScopes.map( i => i.replace(/(get#)|(post#)|(delete#)|(put#)/i, ''))
      let tempPathArr = _.compact(pathScopes.concat(apiScopesTemp)).map(transformToRegexpMemo)
      if (!_.some(tempPathArr, s => s.test(currPath) || s.test(refererPath))) {
        return await next()
      }
    }
    
    const isLoggingOut = ctx.path === '/logout'
    if (setCookie) {
      let jwtSignInCookie = ctx.cookies.get('jwtSign')
      if (isLoggingOut) {
        ctx.cookies.set('jwtSign', null)
      } else if (!jwtSignInCookie) {
        let token = getToken(ctx)
        ctx.cookies.set('jwtSign', token, {expires: moment(exp * 1000).toDate()})
      }
    }
    // 已经登录过了相同的 token 则使用缓存，避免太频繁查询数据库
    let user = jwtUserCacheDict[tokenId]
    if (!user) {
      user = await getUserForSessionStorage(username, company_id, apiScopes)
      if (!user) {
        // jwt 用户不存在
        let jwtSignInCookie = ctx.cookies.get('jwtSign')
        if (setCookie && jwtSignInCookie) {
          ctx.cookies.set('jwtSign', null)
        }
        return await next()
      }
      jwtUserCacheDict[tokenId] = user
      setTimeout(() => delete jwtUserCacheDict[tokenId], 10 * 1000)
    }
    // 保存当前的用户，不能被 jwt 单点登录的用户覆盖
    let bakUser = ctx.session.user
    ctx.session.user = user
    try {
      return await next()
    } catch (e) {
      throw e
    } finally {
      // logout 后 session 为空
      if (ctx.session) {
        ctx.session.user = bakUser
      }
    }
  }
  
  app.use(jwtLoginMiddleware)

  app.use(async (ctx, next) => {
    // 避免提示 数据库不存在 jwtSign 字段： let where = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    if (ctx.query && ctx.query.jwtSign) {
      delete ctx.query.jwtSign
    }
    return await next()
  })
}


export async function requireJWTByMD5SUM(ctx) {
  const {
    requireTokenSecret='783392339',
    expiresIn = '24h',
    apiScopes = '',
    pathScopes = ''
  } = openJwtTokenConf


  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  let { sign, ...rest } = isGET ?
    ctx.query
    : _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let temp = {
    ...rest
  }
  if (sign !== CryptoJS.MD5(_.reduce(temp, (a, b) => a + b) + requireTokenSecret).toString()) return ctx.body = {
    success: 'FAIL',
    message: '校验不通过'
  }

  let user = await db.SugoUser.findOne({
    where: {
      username: 'admin'
    },
    raw: true
  })

  let token
  if (rest.staff_id) {
    token = await redisGet('marketBrainH5JwtSign-' + rest.staff_id)
  }
  if (!token) {
    token = jwtSign(user, {apiScopes: apiScopes.split(','), pathScopes: pathScopes.split(','), expiresIn, setCookie: true}, temp)
    if (rest.staff_id) {
      await redisSetExpire('marketBrainH5JwtSign-' + rest.staff_id, 24 * 60 * 60, token)
    }
  }

  return ctx.body = {
    success: 'success',
    token,
    message: '成功'
  }
}
