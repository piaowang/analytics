import { verifyRegCode, getRegCode } from '../utils/license-kit'
import _ from 'lodash'

//check license
export default async(ctx, next) => {
  const path = ctx.path, redirect = '/verify-page?t=' + new Date().getTime()
  if (/^\/verify-page/.test(path) || /^\/common\/verify/.test(path) ){
    ctx.session.licenseError = 'redirect'
    return await next()
  }
  const res = await verifyRegCode()
  const code = await getRegCode()
  if (res.code !== 200 && !res.success) {
    ctx.session.licenseError = res.message
    return ctx.redirect(`${redirect}`)
  }
  ctx.verifyExpireTime = res.result
  ctx.verifyExpireTime.code = code
  return await next()
}
