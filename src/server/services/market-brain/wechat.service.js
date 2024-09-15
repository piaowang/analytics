import { getAccessTokenWithRedisCache } from '../wechat.service'
import db from '../../models'
import conf from '../../config'
import FetchKit from '../../utils/fetch-kit'
import {jwtSign} from '../../init/jwt-login-middleware'
import { redisSetExpire, redisGet, redisDel } from '../../utils/redis'
import _ from 'lodash'

async function getCooperateBaseInfo(company_id, store_id) {
  let where = {}
  if (company_id && company_id !== 'null') where.company_id = company_id
  if (store_id && store_id !== 'null') where.store_id = store_id
  if (_.isEmpty(where)) return false
  let res = await db.MarketBrainCooperate.findOne({
    where,
    raw: true,
    attributes: ['corpid', 'marketing_secret','company_id', 'store_id']
  })
  return res
}

export async function marketBrainGetCooperateParams(query) {
  const { company_id, store_id, company_name, store_name, userid } = query
  //东风日产逻辑
  const { execute_id, unionid } = query
  const { externalAddress } = conf
  let res = await getCooperateBaseInfo(company_id, store_id)
  if (!res) return
  const { corpid, marketing_secret, store_id: pg_store_id } = res
  if (!corpid && !marketing_secret) return false

  let params = ''
  if (company_name) params += `&company_name=${company_name}`
  if (store_name) params += `&store_name=${store_name}`
  //东风日产特有参数
  if (execute_id) params += `&execute_id=${execute_id}`
  if (unionid) params += `&unionid=${unionid}`
  if (userid) params += `&userid=${userid}`

  let redirect_uri = `${externalAddress}/?company_id=${company_id}&store_id=${pg_store_id}${params}`
  let oAuthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpid}&redirect_uri=${escape(redirect_uri)}&response_type=code&scope=snsapi_base&state=auth#wechat_redirect`
  return oAuthUrl
}

export async function wechatOAuth(query) {
  const { code, company_id, store_id, company_name, store_name } = query
  //东风日产逻辑
  const { execute_id, unionid, userid } = query
  let baseInfo = await getCooperateBaseInfo(company_id, store_id)
  const { corpid, marketing_secret } = baseInfo
  if (!corpid && !marketing_secret) return false

  
  let access_token = await getAccessTokenWithRedisCache(corpid, marketing_secret)
  if (!access_token) return false
  let res = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token=${access_token}&code=${code}`)

  //只有在staff表登记过了才有权限使用数果系统 因为登记了 所有给admin权限也比较合理 可优化
  const { UserId } = res
  if (!UserId) return false
  let staff = await db.MarketBrainStaff.findOne({
    where: {
      userid: UserId
    },
    raw: true,
    attributes: ['company_id', 'store_id', 'staff_id', 'name']
  })
  const { staff_id } = staff
  if (!staff_id) return false

  let user = await db.SugoUser.findOne({
    where: {
      username: 'admin'
    },
    raw: true
  })
  let temp = {
    jwt_company_id: staff.company_id || 'null',
    jwt_store_id: staff.store_id || 'null',
    staff_id,
    staff_name: staff.name,
    company_name,
    store_name
  }

  const { openJwtTokenConf = {},
    site: {
      marketBrain: {
        feature
      }
    }
  } = conf
  const {
    expiresIn = '24h',
    apiScopes = '*',
    pathScopes = '*'
  } = openJwtTokenConf

  let token = await redisGet('marketBrainH5JwtSign-' + staff_id)
  if (!token) {
    token = jwtSign(user, {apiScopes: apiScopes.split(','), pathScopes: pathScopes.split(','), expiresIn, setCookie: true}, temp)
    await redisSetExpire('marketBrainH5JwtSign-' + staff_id, 24 * 60 * 60, token)
  }

  //todo 可配置
  let redirect_uri = ''

  if (feature === 'nissan') {
    if (unionid) {
      // 跳转详情
      redirect_uri = `/nissan-market/user-detail?jwtSign=${token}&execute_id=${execute_id}&unionid=${unionid}&extraUserId=${userid}&userid=${UserId}`
    } else {
      // 跳转列表
      redirect_uri = `/nissan-market/user-list?jwtSign=${token}&execute_id=${execute_id}&userid=${UserId}`
    }
  }
  if (feature === 'czbbb') {
    redirect_uri = `/market-brain/active-claim?jwtSign=${token}`
  // 此处带上jwtSign 可以在jwt-login-middleware里登录
  // let redirect_uri = `/market-brain/active-claim?jwtSign=${token}`
  // let redirect_uri = `/nissan-market/user-list?jwtSign=${token}&execute_id=Swb_lK2PW` // aEaDcK9YL
  // let redirect_uri = `/nissan-market/user-list?jwtSign=${token}&execute_id=${execute_id}`
  }
  return redirect_uri
}

export async function getJssdkTicket(query) {
  const { company_id, store_id, forceGet = false } = query

  let ticket = await redisGet('marketBrainJssdkTicket') || null
  if (forceGet) {
    await redisDel('marketBrainJssdkTicket')
    ticket = null
  }
  if (ticket) return ticket

  let baseInfo = await getCooperateBaseInfo(company_id, store_id) || {}
  const { corpid, marketing_secret } = baseInfo
  if (!corpid || !marketing_secret) return false

  let access_token = await getAccessTokenWithRedisCache(corpid, marketing_secret)
  if (!access_token) return false

  const res = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket`, { access_token })

  if (res.ticket) {
    await redisSetExpire('marketBrainJssdkTicket', 2 * 60 * 60, res.ticket)
    ticket = res.ticket
  }

  return ticket
}

export async function getCorpid(query) {
  const { company_id, store_id } = query
  let baseInfo = await getCooperateBaseInfo(company_id, store_id) || {}
  const { corpid } = baseInfo
  return corpid || undefined
}
