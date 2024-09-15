
import { 
  getAccessTokenWithRedisCache, 
  externalcontactAddMsgTemplate, 
  messageSend,
  getAppChat,
  creatAppChat 
} from '../../wechat.service'
import db from '../../../models'
import _ from 'lodash'
import { mapAwaitAll, forAwaitAll } from 'common/sugo-utils';
import { SENDCHANNELENUM, NISSANCHANNELENUM } from 'common/marketBrain/constants'
import Redis from '../../redis.service'
import conf from '../../../config'
import FetchKit from '../../../utils/fetch-kit'
import { log, err } from '../../../utils/log'

//这个保存的是自己的企业微信 现有管理客户和客户的客户的企业微信的需求
const { 
  externalAddress,
  site: {
    loginLogoName,
    cdn,
    marketBrain: { 
      nissan: { 
        smsConfig: {
          appid: smsAppId = 'cbbVs3WxjJFdxohLehzCp59YgHRthIfyZ4B',
          secret: smsSecret = 'ZTNmZWFmNTlmNzlhMGQ5YmMxYTg5Nzc5OWE5MGVjZWI',
          template_code,
          msgUrl
        }
} } } } = conf

export default class NissanMarketService  {
  constructor() {
  }

  async appPush({event, execution, userList}) {
    const { id, created_by, updated_by, usergroup_id, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name, touch_up_way, send_channel } = event

    if (touch_up_way !== 1 || SENDCHANNELENUM['nissan'][touch_up_way][send_channel] !== NISSANCHANNELENUM['appPush']) return

    if (_.isEmpty(userList)) return

    let { cooperate = {}, cooperateWhere } = await this.getCooperateParams(jwt_company_id, jwt_store_id)
    

    const { corpid, custom_contact_secret, enterprise_app_id, marketing_secret } = cooperate

    //没有存该门店企业微信信息 不触发下方逻辑
    if (!corpid || !custom_contact_secret) return

    let staffList = await db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null }
      },
      raw: true
    })

    if (_.isEmpty(staffList)) return
    const userIdList = staffList.map( i => i.userid)
    const pgStaffUserIdDict = _.keyBy(staffList, 'userid')

    const accessToken = await getAccessTokenWithRedisCache(corpid, marketing_secret)
    //存储的企业微信信息不能换到accessToken 不触发逻辑
    if (!accessToken) return


    await mapAwaitAll(_.chunk(userIdList, 1000), async (chunk) => {
      let touser = chunk.join('|')
      const params = {
        touser,
        "msgtype": "text",
        "agentid": +enterprise_app_id,
        "text": {
        "content": `${content}\n<a href=\"${externalAddress}/?oauth2=true&company_id=df_nissan&company_name=东风日产&execute_id=${execution.id}\">列表页</a>`
        }
      }
      let externalcontactAddMsgTemplateRes = await messageSend(accessToken, params)

      // const { fail_list, msgid } = externalcontactAddMsgTemplateRes

      // await db.MarketBrainTaskDetails.update({
      //   msgid
      // }, {
      //   where: {
      //     execute_id: execution.id,

      //   }
      // })
    })


  }


  async arriveAppPush({event, execution, userList}) {
    const { id, created_by, updated_by, usergroup_id, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name, touch_up_way, send_channel } = event

    if (touch_up_way !== 1 || SENDCHANNELENUM['nissan'][touch_up_way][send_channel] !== NISSANCHANNELENUM['arriveAppPush']) return

    let { cooperate = {}, cooperateWhere } = await this.getCooperateParams(jwt_company_id, jwt_store_id)
    

    const { corpid, custom_contact_secret, enterprise_app_id, marketing_secret } = cooperate

    //没有存该门店企业微信信息 不触发下方逻辑
    if (!corpid || !custom_contact_secret) return

    let staffList = await db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null }
      },
      raw: true
    })

    if (_.isEmpty(staffList)) return
    const userIdList = staffList.map( i => i.userid)

    let customerList = await db.MarketBrainCustom.findAll({
      where: {
        sa_id: userIdList,
        unionid: { $in: userList.map(i => i.unionid) }
      },
      raw: true
    })

    if (_.isEmpty(customerList)) return

    const customerUnionIdMap = {}
    customerList.map(i => {
      if (!i.unionid) return
      if (!customerUnionIdMap[i.unionid]) customerUnionIdMap[i.unionid] = i
    })

    const accessToken = await getAccessTokenWithRedisCache(corpid, marketing_secret)
    //存储的企业微信信息不能换到accessToken 不触发逻辑
    if (!accessToken) return


    await mapAwaitAll(_.chunk(_.keys(customerUnionIdMap), 1000), async (chunk) => {
      await mapAwaitAll(chunk, async unionid => {
        let sa_id = _.get(customerUnionIdMap[unionid], 'sa_id') 
        let userid = _.get(customerUnionIdMap[unionid], 'userid') 
        if (!sa_id) return
        const params = {
          touser: sa_id,
          "msgtype": "text",
          "agentid": +enterprise_app_id,
          "text": {
          "content": `${content}\n<a href=\"${externalAddress}/?oauth2=true&company_id=df_nissan&company_name=东风日产&unionid=${unionid}&execute_id=${execution.id}&userid=${userid}\">详情页</a>`
          }
        }
        let externalcontactAddMsgTemplateRes = await messageSend(accessToken, params)
      })

    })
  }

  async contactPush({event, execution, userList}) {
    const { name, usergroup_id, touch_up_way, send_channel, jwt_company_id, jwt_store_id, copywriting: { content, url },guide_content, jwt_store_name } = event

    //发送渠道是微信 且精准人群 才触发下方逻辑
    if (touch_up_way !== 1 || SENDCHANNELENUM['nissan'][touch_up_way][send_channel] !== NISSANCHANNELENUM['contactPush']) return

    let { cooperate = {}, cooperateWhere } = await this.getCooperateParams(jwt_company_id, jwt_store_id)

    const { corpid, custom_contact_secret } = cooperate

    //没有存该门店企业微信信息 不触发下方逻辑
    if (!corpid || !custom_contact_secret) return

    let staffList = await db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null }
      },
      raw: true
    })

    //该门店没有录入员工 或 没有开通客户联系的员工 不触发逻辑
    if (_.isEmpty(staffList)) return

    const userIdList = staffList.map( i => i.userid)
    const pgStaffUserIdDict = _.keyBy(staffList, 'userid')

    const pgCustomList = await db.MarketBrainCustom.findAll({
      // where: {
      //   sa_id: {
      //     $or: userIdList,
      //   }
      // },
      where: {
        sa_id: { $in: userIdList },
        unionid: { $in: userList.map(i => i.unionid) }
      },
      raw: true
    })

    //开通了客户联系的员工没有客户 不触发逻辑
    if (_.isEmpty(pgCustomList)) return

    const accessToken = await getAccessTokenWithRedisCache(corpid, custom_contact_secret)
    //存储的企业微信信息不能换到accessToken 不触发逻辑
    if (!accessToken) return

    let staffWithCustomDict = {}
    pgCustomList.map( i => {
      if (!i.openid) return
      //该用户不在本次活动范围内

      if (!staffWithCustomDict[i.sa_id]) return staffWithCustomDict[i.sa_id] = [{ openid: i.openid, userid: i.userid }]

      staffWithCustomDict[i.sa_id].push({ openid: i.openid, userid: i.userid })
    })

    let targetStaffList = []
    for (let k in staffWithCustomDict) {
      if (!pgStaffUserIdDict[k].staff_id) continue

      let targetPgStaff = pgStaffUserIdDict[k]
      targetStaffList.push(targetPgStaff.userid)

      let params = {
        sender:  k,
        external_userid: staffWithCustomDict[k].map( i => i.userid),
        text: {
          content
        },
        link: {
          title: name,
          //todo 换成个业务用的图
          picurl: `${externalAddress}/_bc/sugo-analytics-static/assets/images/logo.png`,
          desc: jwt_store_name,
          //这里为表单里填写的url
          url: url || ''
        }
      }

      let externalcontactAddMsgTemplateRes = await externalcontactAddMsgTemplate(accessToken, params)
      // const { fail_list, msgid } = externalcontactAddMsgTemplateRes

    }
  }

  /**
   * 获取 token 并缓存到 redis
   */
  async getAccessTokenWithRedisCache() {
    const WECHAT_ACCESS_TOKEN = `nissan_sms_authorization_header_token`
    let cachecAccessToken = await Redis.get(WECHAT_ACCESS_TOKEN)
    if (cachecAccessToken) {
      return cachecAccessToken
    }
    let res
    try {
      res = await FetchKit.post(
        `https://open.chebaba.com/oauth/token?grant_type=client_credentials`, { }, {
          headers: {
            Authorization: this.genAuthorization()
          }
        }) || {}
    }catch (e) {
      log(e)
    }
    const {access_token, msg = '', ...rest} = res
    if (msg.includes('获取token频率超出限制')) {
      return null
    }
    if (!access_token) {
      log(`${new Date()} 智能营销: 东风日产短信逻辑 请求车巴巴短信平台token失败=====`)
      return null
    }
    await Redis.setWithExpire(WECHAT_ACCESS_TOKEN, access_token, rest.expires_in)
    return access_token
  }

  genAuthorization() {
    let appid = smsAppId
    let secret = smsSecret
    let auth = `${appid}:${secret}`
    const buf = Buffer.from(auth, 'ascii');
    return "Basic "+buf.toString('base64')
  }

  async smsContact({event, userList}) {
    const { id, created_by, updated_by, usergroup_id, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name, touch_up_way, send_channel } = event

    //发送渠道是短信 且精准人群 才触发下方逻辑
    if (touch_up_way !== 0 || SENDCHANNELENUM['nissan'][touch_up_way][send_channel] !== '短信' || !usergroup_id) return

    const token = await this.getAccessTokenWithRedisCache()
    if (!token) {
      log(new Date() + '车巴巴短信平台token申请超过每小时限制====')
      return
    }

    const mobileSet = []
    await mapAwaitAll(userList, async (item) => {
      const mobile = item.mobile || null
      if (!mobile) return
      //防止轰炸某个人
      if (mobileSet.includes(mobile)) return

      mobileSet.push(mobile)
      const client_ip = this.getIPAdress()

      const res = await FetchKit.get(
        msgUrl, {
          mobile,
          client_ip,
          template_code,
          url: url + '%2B'
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        log(`${new Date()} 智能营销 短信结果: , ${res}`)
    })

    
  }

  async getCooperateParams(jwt_company_id, jwt_store_id) {
    let cooperateWhere = {}
    if (jwt_company_id && jwt_company_id !== 'null') cooperateWhere.company_id = jwt_company_id
    if (jwt_store_id && jwt_store_id !== 'null') cooperateWhere.store_id = jwt_store_id

    // todo 创建用户的时候 匹配下staff表 获取company_id store_id 否则正常登录没有这两个值
    // 没有这两个值 条件为空 空条件findOne 会找到表中的第一条记录 
    // if (_.isEmpty(cooperateWhere)) return {}
    let cooperate = await db.MarketBrainCooperate.findOne({
      where: cooperateWhere, 
      raw: true,
      attributes: ['corpid', 'custom_contact_secret', 'address_book_secret', 'marketing_secret', 'enterprise_app_id']
    })

    return { cooperate, cooperateWhere }
  }

  /**获取本机ip**/
  getIPAdress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
      var iface = interfaces[devName];
      for (var i = 0; i < iface.length; i++) {
        var alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }

}
