import FetchFinal from './fetch-final'
import {removeAllEmptyValues, toQueryParams} from '../../common/sugo-utils'

/**
 * 生成 jwt 签名，适用于目标用户不能登录的情况
 * 使用方法：访问 xxx?jwtSign=xxx 即可
 * @param args.apiScopes 授权的权限，可为 routeId 或 routePath 数组，传 ['*'] 则表示授予与当前用户同样的权限
 * @param args.pathScopes 授权的访问路径，可为 pathname 数组，传 ['*'] 则表示允许所有路径
 * @param args.expiresIn 授权的期限 默认 '24h'
 * @param args.setCookie 写入 cookie，可使 url 切换后不退出登录，默认 false
 * @returns {Promise<{token}>}
 */
export async function getJwtSign(args, opts = {}) {
  const obj = await FetchFinal.post('/app/request-jwt-sign', args, opts)
  return obj && obj.token
}

/**
 * 生成分享链接，用户访问后直接重定向到指定页面。只能在登录后使用
 * 使用方法： <a href={genSharingLink({...})} />
 * @param args
 * @param args.apiScopes 授权的权限，可为 routeId 或 routePath 数组，传 ['*'] 则表示授予与当前用户同样的权限
 * @param args.pathScopes 授权的访问路径，可为 pathname 数组，传 ['*'] 则表示允许所有路径
 * @param args.expiresIn 授权的期限 默认 '24h'
 * @param args.redirect 不返回签名，直接带上签名进行重定向
 * @returns {string}
 */
export function genSharingLink(args) {
  let {apiScopes, pathScopes, expiresIn, redirect} = args
  return `/app/request-jwt-sign?${toQueryParams(removeAllEmptyValues({
    redirect,
    expiresIn,
    apiScopes: (apiScopes || []).join(','),
    pathScopes: (pathScopes || []).join(',')
  }))}`
}
