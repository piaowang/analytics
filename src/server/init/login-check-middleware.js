import _ from 'lodash'

//check login
export default async(ctx, next) => {
  let sess = ctx.session,
    url = ctx.url,
    redirect = '/'
  if (
    !sess.user &&
    (/^\/console/.test(url) || /^\/livescreen/.test(url))
  ) {
    sess.redirect = url
    return ctx.redirect(redirect)
  } else if (!sess.user && /^\/app\//.test(url)) {
    const jwt = _.get(ctx, 'state.jwtData', {})
    const { apiScopes, pathScopes } = jwt
    //todo 第三个条件 ['']去掉
    if (apiScopes === ['*'] || apiScopes === ['all']) {
      return await next()
    }
  }
  if (!sess.user && /^\/app\//.test(url)) {
    ctx.status = 401
    return ctx.body = {
      success: false,
      error: '请先登陆'
    }
  }
  return await next()
}
