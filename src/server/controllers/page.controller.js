import config from '../config'
import db from '../models'
import compare from '../../common/compare-version'
import SugoLiveScreenService from '../services/sugo-livescreen.service'
import SugoLiveScreenPublishService from '../services/sugo-livescreen-publish.service'
import { getRegCode, verifyRegCode } from '../utils/license-kit'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'
import SharingService from '../services/sugo-sharing.service'
import { SharingTypeEnum, SharingRestrictionsTypeEnum } from '../../common/constants'
import SugoLiveScreenPubService from '../services/sugo-livescreen-publish.service'
import _ from 'lodash'
import CryptoJS from 'crypto-js'
// const dashboards = async ctx => {
//   const { id } = ctx.params
//   let password = ''
//   if (id) {
//     const sharing = await SharingService.getInstance().findOne({ content_id: id, content_type: SharingTypeEnum.Dashboard}, { raw: true})
//     if (_.get(sharing, 'params.restrictionsContent.type', '') === SharingRestrictionsTypeEnum.password) {
//       password = CryptoJS.MD5(_.get(sharing, 'params.restrictionsContent.value', '')).toString()
//     }
//   }
//   Object.assign(ctx.local, config.site, {
//     dataConfig: config.dataConfig,
//     password
//   })
//   ctx.render('console', ctx.local)
// }

const console = async ctx => {
  const { dashboardId } = ctx.params

  let password = ''
  if (dashboardId) {
    const sharing = await SharingService.getInstance().findOne({ content_id: dashboardId, content_type: SharingTypeEnum.Dashboard}, { raw: true})
    if (_.get(sharing, 'params.restrictionsContent.type', '') === SharingRestrictionsTypeEnum.password) {
      password = CryptoJS.MD5(_.get(sharing, 'params.restrictionsContent.value', '')).toString()
    }else{
      password = ''
    }
  }else{
    password = ''
  }
  Object.assign(ctx.local, config.site, {
    dataConfig: config.dataConfig,
    password,
    test: ctx.params
  })
  ctx.render('console', ctx.local)
}

const login = async ctx => {
  let sess = ctx.session
  let {ua} = ctx.local
  if (ua.ie && compare(ua.browserVersion, '9') < 0) {
    return ctx.render('update-warn', ctx.local)
  }
  if (sess.user) ctx.redirect(sess.redirect || '/console')
  Object.assign(ctx.local, config.site)
  ctx.render('login', ctx.local)
}

const livescreen = async ctx => {
  const { user } = ctx.session
  const { company_id } = user
  const { livescreenId, preview } = ctx.params
  const { publish = false } = ctx.query
  const { byName: title } = ctx.query || {}

  if (!livescreenId) {
    ctx.render('500', ctx.local)
    return
  }
  const liveScreen = publish ? await SugoLiveScreenPublishService.getInstance().getOneScreen({ id: livescreenId })
    : await SugoLiveScreenService.getOneScreen(company_id, user, title ? { title } : { id: livescreenId })
  if (!liveScreen) {
    ctx.render('404', ctx.local)
    return
  }
  const sharing = await SharingService.getInstance().findOne({ content_id: livescreenId, content_type: SharingTypeEnum.LiveScreen    }, { raw: true})
  const params = {
    liveScreen,
    isPreview: preview === 'preview'
  }
  if (_.get(sharing, 'params.restrictionsContent.type', '') === SharingRestrictionsTypeEnum.password) {
    params.password = CryptoJS.MD5(_.get(sharing, 'params.restrictionsContent.value', '')).toString()
  }
  Object.assign(ctx.local, config.site, params)
  ctx.render('livescreen', ctx.local)
}

const livescreenPub = async ctx => {
  const { livescreenId, preview } = ctx.params
  const {byName: title} = ctx.query || {}
  if (!livescreenId) {
    ctx.render('500', ctx.local)
    return
  }
  const liveScreen = await SugoLiveScreenPubService.getInstance().getOneScreen(_.pickBy({id: livescreenId, title}, _.identity))
  const sharing = await SharingService.getInstance().findOne({ content_id: livescreenId, content_type: SharingTypeEnum.LiveScreenPub}, { raw: true})
  const params = {
    liveScreen,
    isPreview: preview === 'preview'
  }
  if (_.get(sharing, 'params.restrictionsContent.type', '') === SharingRestrictionsTypeEnum.password) {
    params.password = CryptoJS.MD5(_.get(sharing, 'params.restrictionsContent.value', '')).toString()
  }
  Object.assign(ctx.local, config.site, params)
  ctx.render('livescreen', ctx.local)
}

const livescreenBroadcastTerminal = async ctx => {
  // const { user } = ctx.session
  Object.assign(ctx.local, config.site)
  ctx.render('livescreen-broadcast-terminal', ctx.local)
}

const marketbrainMobileEntry = async ctx => {
  // const { user } = ctx.session
  // const { company_id } = user
  // const { livescreenId, preview } = ctx.params
  // if (!livescreenId) {
  //   ctx.render('500', ctx.local)
  //   return
  // }
  // const liveScreen = await SugoLiveScreenService.getOneScreen(company_id, user, livescreenId)
  // Object.assign(ctx.local, config.site, {
  //   liveScreen,
  //   isPreview: preview === 'preview'
  // })
  ctx.render('marketbrain', ctx.local)
}

const nissanmarketMobileEntry = async ctx => {
  ctx.render('nissan-market', ctx.local)
}

//注册页面
const reg = async ctx => {
  let sess = ctx.session
  if (sess.user) ctx.redirect(sess.redirect || '/console')
  Object.assign(ctx.local, config.site)
  ctx.render('reg', ctx.local)
}

const resetPasswordPage = async ctx => {
  let sess = ctx.session
  let {user = {}} = sess
  let id = ctx.params.id

  let indb = await db.EmailValidate.findOne({
    where: {
      id
    }
  })

  if (!indb) {
    return ctx.render('404', ctx.local)
  } else if (new Date(indb.expire) < new Date()) {
    ctx.local.expire = true
  }

  Object.assign(ctx.local, {
    user,
    id
  })

  ctx.render('reset-password', ctx.local)
}

//申请重置密码
const retrievePasswordPage = async ctx => {
  ctx.render('retrieve-password', ctx.local)
}

const track = async ctx => {
  let {token,sKey} = ctx.query
  let track_uri = 'sugo.' + token + '://sugo/?sKey='+sKey
  Object.assign(ctx.local, config.site, {
    track_uri: track_uri
  })
  ctx.render('track', ctx.local)
}

const trackAuto = async ctx => {
  let {token,sKey} = ctx.query
  let track_uri = 'sugo.' + token + '://sugo/?sKey='+sKey
  Object.assign(ctx.local, config.site, {
    track_uri: track_uri
  })
  ctx.render('trackAuto', ctx.local)
}

const heat = async ctx => {
  let {token, sKey} = ctx.query
  let heat_uri = `sugo.${token}://sugo/?sKey=${sKey}&type=heatmap`
  Object.assign(ctx.local, config.site, {
    heat_uri
  })
  ctx.render('heat', ctx.local)
}

const validateEmailPage = async ctx => {
  let sess = ctx.session
  let {user = {}} = sess
  let id = ctx.params.id

  if (!id) return ctx.render('404')

  let ve = await db.EmailValidate.findOne({
    where: {
      id
    }
  })

  if (!ve) return ctx.render('404', ctx.local)

  // if (new Date(ve.expire) < new Date()) {
  //   ctx.msg = '邮件验证已经过期了'
  // }
  //start create company, user...
  let res = await db.client.transaction(function (t) {

    let target = {
      transaction: t
    }

    return db.SugoUser.update({
      email_validate: ''
    }, {
      where: {
        id: ve.user_id
      },
      ...target
    })
      .then(() => {
        return db.EmailValidate.destroy({
          where: {
            id
          },
          ...target
        })
      })

  })

  Object.assign(ctx.local, {
    user,
    res
  })
  
  ctx.render('validate-email', ctx.local)
}

const verify = async ctx => {
  let { licenseError } = ctx.session
  if (licenseError === 'redirect') { // 如果是直接刷新激活页面需要重新获取数据
    let res = await verifyRegCode()
    if (res.code !== 200 && !res.success) {
      licenseError = res.message
    }
  }
  const code = await getRegCode()
  Object.assign(ctx.local, {
    licenseError: licenseError,
    registrationCode: code
  }, config.site)
  delete ctx.session.licenseError
  ctx.render('verify', ctx.local)
}

const webPty = async ctx => {
  if (!config.enableWebPty) {
    ctx.forward('/') // prefer antd 404
    return
  }
  const { username } = ctx.session.user || {}
  Object.assign(ctx.local, config.site)
  ctx.render(username !== 'admin' ? '404' : 'web-pty', ctx.local)
}

export default {
  console,
  login,
  verify,
  index: login,
  reg,
  resetPasswordPage,
  validateEmailPage,
  retrievePasswordPage,
  track,
  heat,
  livescreen,
  livescreenBroadcastTerminal,
  webPty,
  livescreenPub,
  marketbrainMobileEntry,
  nissanmarketMobileEntry,
  trackAuto
}

//通过扩展module扩展之
moduleExtend(__filename)
