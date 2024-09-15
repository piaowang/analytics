import _ from 'lodash'
import xorKit from 'sugo-xor-kit'
import { Response } from '../../utils/Response'
import config from '../../config'

const { tokenExpire = 60 * 30 * 1000, tokenSwitch = false, ipWhiteList, tokenKey = 'sugo_api_token', tokenSn = '_api_auth_sugo' } = config

export default async(ctx, next) => {
  const { header, url } = ctx.request
  if (!tokenSwitch) return await next()
  if (/^(\/api\/v2)/.test(url) && _.isEmpty(ipWhiteList)) { // 与ipWhiteList不能同时存在
    try {
      let sn = tokenSn, key = tokenKey
      let token = header['x-sugo-token']
      if (!token) {
        return ctx.body = Response.fail('非法请求，无效签名或未携带签名')
      }
      let status = checkToken(header,sn, key)
      if (status !== 'success') {
        return ctx.body = Response.fail(status)
      }
    } catch(e) {
      throw new Error(e)
    }
    return await next()
  }
  return await next()
}

function checkToken (header, sn, key) {
  try {
    let token = header['x-sugo-token']
    token = xorKit.decrypt(token, sn)
    let date = token.substring(token.lastIndexOf('_'))
    let name = token.replace(date,'')
    if (!key) {
      return '非法请求，缺少参数'
    }
    if (!date) {
      return '非法请求，【token】校验失败'
    }
    date = Number(date.substr(1)) + tokenExpire
    if (_.isNaN(date)) {
      return '非法请求，【token】校验失败'
    }
    // token有效期默认半小时 tokenExpire
    if (+ new Date() > date) {
      return '请求失败，签名过期'
    }

    if (name !== key) {
      return '非法请求，无效签名'
    }
    return 'success'
  } catch (e) {
    throw new Error(e)
  }
}
