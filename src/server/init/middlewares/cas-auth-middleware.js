import _ from 'lodash'
import CAS from 'koa-cas-hik'
import config from '../../config'
import db from '../../models'
import { DEFAULT_COMPANY_EMAIL } from '../../constants'
import userContrl, { hash } from '../../controllers/user.controller'
import testPassword from '../../../common/test-password'

// https://github.com/Datafruit/sugo-analytics/pull/5260
/**
 * @description CAS 用户与系统用户权限处理
 * - 平台与是以CAS账号的`username`作为用户关联（如果CAS账号的`username`在平台存在则直接登陆，否则根据CAS账号信息在平台创建默认账号
 * - 默认新加平台账号密码规则：符合我们平台的密码规则直接是原CAS账号密码作为平台默认密码，否则启用`config.CAS.defaultPwd`作为平台默认密码
 */
export default async (ctx, next) => {
  if (ctx.session.user) {
    return await next()
  }
  // CAS auth未登陆
  if (!ctx.session.cas && !ctx.session.st) {
    return await next()
  }

  // 获取CAS认证通过后的session用户信息
  const { session: { cas = {} } } = ctx
  // 解析CAS用户信息
  const userInfo = getCASUserInfo(cas) // {username, pwd}

  // 查询默认企业用户详见：/src/models/init-db.js
  const defaultCompany = await db.SugoCompany.findOne({
    where: {
      email: DEFAULT_COMPANY_EMAIL,
      type: 'payed',
      active: true,
      is_root: true
    }
  })

  const company_id = defaultCompany.id

  // 根据username关联账号
  let user = await db.SugoUser.findOne({
    where: {
      username: userInfo.username,
      company_id
    },
    include: [{
      model: db.SugoRole
    }]
  })

  // 如果CAS用户不存在，则创建新用户
  if (!user) {
    // 密码规则：满足系统密码规则的直接用CAS账号密码否则使用默认配置密码
    const sourcePwd = userInfo.pwd && testPassword(userInfo.pwd) ? userInfo.pwd : config.CAS.defaultPwd
    const password = await hash(sourcePwd) // cas user pwd is null default => config.CAS.defaultPwd
    const newUserDate = {
      username: userInfo.username,
      first_name: userInfo.username,
      last_name: userInfo.username,
      // 默认邮箱规则：userInfo.username + '@sugo.io'
      // TODO get email to cas user
      email: userInfo.username.indexOf('@') > -1 ? userInfo.username : `${userInfo.username}@sugo.io`,
      password,
      company_id
    }
    // 不存在则创建新账号
    user = await db.SugoUser.create(newUserDate)
  }
  try {
    user = user.get({
      plain: true
    })
  } catch(e) {}

  // 查找该user的permissions
  // autologin
  ctx.session.user = await userContrl.prepareUserObjForSession(user)
  let redirect = '/console'
  delete ctx.session.redirect
  ctx.redirect(redirect)
}

// 测试地址：http://cas.test.studyo.cn/login?service=http://test.studyo.cn/sso
// 测试账号：admin、116001、190317
// 密码：123456

/**
 * Create a new instance of CASAuthentication.
 * @param {*} sessionKey
 * @param {*} sessionStore
 */
export const getCasClient = (sessionKey, sessionStore) => {
  // https://github.com/weicheng6/koa-cas-hik#options
  return new CAS({
    path: config.CAS.server,
    paths: {
      serviceValidate: '/serviceValidate',
      login: '/login',
      logout: '/logout'
    },
    ajaxHeader: 'X-Requested-With',
    // redirect: ctx =>  {
    //   ctx.redirect('/api/sso')
    // },
    ajaxRedirect: ctx => {
      ctx.body = {
        redirect: true
      }
    },
    ignore: [
      (path, ctx) => {
        // 如果本系统已登陆可以自由访问，无需CAS授权
        if (ctx.session.user) {
          return true
        }
        return false
      },
      /^\/common\/.*$/,
      /^\/login$/,
      /^\/logout$/,
      /^\/api\/.*$/,
      /^\/public\/.*$/,
      /^\/static\/.*$/,
      /^\/_bc\/.*$/,
      /^\/js\/.*$/,
      /^\/css\/.*$/,
      /^\/socket\.io\/.*$/
    ],
    sessionKey,
    store: sessionStore,
    logout: {
      router: '/logout'
      // redirect : async (ctx, next) => {
      // ctx.redirect(options.path + options.paths.logout + '?service=' + encodeURIComponent(ctx.headers.referer || ctx.origin));
      // }
    }
  })
}

/**
 * 解析CAS返回用户信息（目前就按创显企业客户数据格式解析）
 * TODO 支持多个客户格式
 * @return {username, pwd}
 */
const getCASUserInfo = (cas) => {
  /**
   * cas :
   * { user: 'admin',
      attributes:
      { uid: [ '2' ],
        pwd: [ '123456' ],
        username: [ 'admin' ],
        vendor: [ '{}' ],
        schoolId: [ '' ],
        sourceUsername: [ 'admin' ] } }
   */
  return {
    username: _.get(cas, 'user'),
    pwd: _.get(cas, 'attributes.pwd[0]')
  }
}
