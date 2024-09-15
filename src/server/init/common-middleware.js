import _ from 'lodash'
import {decompressUrlQuery, tryJsonParse} from '../../common/sugo-utils'
import CONFIG from '../config'
import serialize from 'serialize-javascript'
const local = CONFIG.site

function https(local) {
  ['host', 'cdn', 'href'].forEach(prop => {
    local[prop] = local[prop].replace('http', 'https')
  })
}

export default async (ctx, next) => {
  let arr = ctx.href.split('/'),
    host = local.host || (arr[0] + '//' + arr[2]),
    href = ctx.href,
    path = ctx.path
  let {user = {}} = (ctx.session || {})
  let permissions = (user.permissions || []).map(p => _.pick(p, ['id', 'method', 'title', 'path', 'group']))
  let user0 = _.pick(user, ['id', 'email', 'first_name', 'username', 'type', 'active', 'company', 'cellphone', 'SugoRoles', 'appsPermissions','role_institutions', 'institutions_id'])

  ctx.local = {
    ...local,
    pioUrl: CONFIG.pioUrl,
    host,
    href,
    _,
    logined: false,
    path,
    permissions,
    user: user0,
    serialize,
    hasTagAI: !!CONFIG.tagAIUrl,
    serverTime: new Date(),
    licenseExpireTime: ctx.verifyExpireTime,
    licenseValid: CONFIG.enableLicense || false, // 前端用换个名称
    // 监控告警判断是否显示系统短信接口、邮件接口
    sugoMonitorAlarmApis: {
      sms: _.get(CONFIG, 'aliyunSmsTemplateCode.errorAlarms') && _.get(CONFIG, 'aliyunSmsTemplateCode.normalAlarms'),
      email: _.get(CONFIG, 'aliyunEmailAddr')
    },
    rowLimit: _.get(CONFIG, 'druid.rowLimit'),
    druidCacheTime: CONFIG.druidCacheTime,
    redisExpire: CONFIG.redisExpire
  }

  if (!local.cdn) ctx.local.cdn = host

  if (ctx.get('x-forwarded-proto') === 'https') https(ctx.local)
  const convertLimitToNumber = (path) => {
    const val = _.get(ctx, path, undefined)
    if(val) {
      _.set(ctx, path, val * 1)
    }
  }
  ctx.q = {}
  convertLimitToNumber('query.limit')
  convertLimitToNumber('query.pageSize')
  if (ctx.query && (ctx.query.q || ctx.query.qs)) {
    ctx.q = ctx.query.q
      ? tryJsonParse(decompressUrlQuery(ctx.query.q))
      : tryJsonParse(ctx.query.qs)
  }

  else if (ctx.request.body && (ctx.request.body.q || ctx.request.body.qs)) {
    ctx.q = ctx.request.body.q
      ? tryJsonParse(decompressUrlQuery(ctx.request.body.q))
      : tryJsonParse(ctx.request.body.qs)
  }
  convertLimitToNumber('q.limit')
  convertLimitToNumber('q.pageSize')
  debug(`ctx.q ==> ${JSON.stringify(ctx.q, null, 2)}`)
  await next()
  if (global.gc && CONFIG.site.env === 'development') {
    console.log('global.gc run')
    global.gc()
  }
}
