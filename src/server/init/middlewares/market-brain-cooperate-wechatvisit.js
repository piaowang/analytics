import {wechatOAuth, marketBrainGetCooperateParams} from '../../services/market-brain/wechat.service'


export default async(ctx, next) => {
  let { oauth2, state, code } = ctx.query

  if (oauth2) {
    let url = await marketBrainGetCooperateParams(ctx.query)
    if (!url) {
      ctx.status = 401
      ctx.body = {
        success: false,
        error: '访问失败,联系管理员'
      }
      return
    } 

    return ctx.redirect(url)
  }
  
  if (state === 'auth' && code) {
    let res = await wechatOAuth(ctx.query)
    if (!res) {
      ctx.status = 401
      ctx.body = {
        success: false,
        error: '该用户未认证,无权限访问'
      }
      return
    }
    return ctx.redirect(res)
  }

  return await next()
}
