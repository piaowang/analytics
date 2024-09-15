/**
 * 微信服务，封装了微信的一些查询、发送消息接口
 */
import FetchKit from '../utils/fetch-kit'
import conf from '../config'
import Redis from './redis.service'
import _ from 'lodash'

//这个保存的是自己的企业微信 现有管理客户和客户的客户的企业微信的需求
const {corpId: selfCorPid, secret: selfSecret, agentId} = conf.wechat


export async function getAccessTokenWithRedisCache(corpId = selfCorPid, secret = selfSecret) {
  if (!corpId || !secret) {
    return null
  }
  const WECHAT_ACCESS_TOKEN = `wechat_access_token_${corpId}_${secret}`
  let cachecAccessToken = await Redis.get(WECHAT_ACCESS_TOKEN)
  if (cachecAccessToken) {
    // console.log('read cached access_token: ', cachecAccessToken)
    return cachecAccessToken
  }
  let {access_token, ...rest} = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`) || {}
  // { access_token, errcode: 0, errmsg: 'ok', expires_in: 7200 }
  if (!access_token || rest.errmsg !== 'ok') {
    return null
  }
  await Redis.setWithExpire(WECHAT_ACCESS_TOKEN, access_token, rest.expires_in)
  // console.log('cached access_token:', access_token)
  return access_token
}

export async function getWechatDepartments(parentDepartmentId = null) {
  if (!selfCorPid || !selfSecret) {
    return []
  }

  let access_token = await getAccessTokenWithRedisCache()
  if (!access_token) {
    throw new Error('load access_token fail')
  }

  let args = _.compact([
    parentDepartmentId ? `&id=${parentDepartmentId}` : ''
    // extra args
  ])
  let url = `https://qyapi.weixin.qq.com/cgi-bin/department/list?access_token=${access_token}${args.join('')}`
  let {department, ...rest0} = await FetchKit.get(url) || {}
  return department
}

export async function getWechatUserlist(departmentId, fetchChild = false) {
  if (!selfCorPid || !selfSecret) {
    return []
  }

  let access_token = await getAccessTokenWithRedisCache()
  if (!access_token) {
    throw new Error('load access_token fail')
  }

  let args = _.compact([
    departmentId ? `&department_id=${departmentId}` : '',
    fetchChild ? '&fetch_child=1' : ''
    // extra args
  ])
  let {userlist, ...rest1} = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${access_token}${args.join('')}`) || {}
  return userlist
}

export async function sendWechatMsg(toWho, content, timeout = 15 * 1000) {
  let access_token = await getAccessTokenWithRedisCache()
  if (!access_token) {
    throw new Error('load access_token fail')
  }
  let {users = [], parties = [], tags = []} = toWho
  await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${access_token}`, {
    touser : users.join('|'),
    toparty : parties.join('|'),
    totag : tags.join('|'),
    msgtype : 'text',
    agentid : +agentId,
    text : {
      content : content
    }
  }, {timeout})
}


export async function getFollowUserList(accessToken) {
  let {follow_user, ...rest} = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_follow_user_list?access_token=${accessToken}`)

  if (_.isEmpty(follow_user) || rest.errmsg !== 'ok') {
    return []
  }
  return follow_user
}

//获取员工详细信息
export async function getUserDetailInfo(accessToken, userid) {
  let result = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userid}`)

  if (result.errmsg !== 'ok') {
    return {}
  }
  return result
}

//获取客户列表
export async function externalcontactList(accessToken, userid) {
  let result = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${accessToken}&userid=${userid}`)

  if (_.isEmpty(result.external_userid) || result.errmsg !== 'ok') {
    return []
  }
  return result.external_userid
}

export async function externalcontactConvertToOpenid(accessToken, userid) {
  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/convert_to_openid?access_token=${accessToken}`, { external_userid: userid })

  if (result.errmsg !== 'ok') {
    return ''
  }
  return result.openid
}


export async function externalcontactAddMsgTemplate(accessToken, params) {
  //https://open.work.weixin.qq.com/api/doc#90000/90135/91560  两个参数看这里
  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_msg_template?access_token=${accessToken}`, params)

  if (result.errcode !== 0) {
    console.log(new Date(), result.errmsg ,'营销大脑 企业微信客户联系推送失败======')
    return params.external_userid
  }
  if (result.errmsg !== 'ok') {
    console.log(new Date(), result.errmsg, '营销大脑 企业微信客户联系推送失败======')
  }

  return result
}

export async function messageSend(accessToken, params) {
  //和上面的重复了 参数传递方式不同
  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`, params)

  if (result.errcode !== 0) {
    console.log(new Date(), result.errmsg ,'营销大脑 企业微信消息推送失败======')
    return 
  }
  if (result.errmsg !== 'ok') {
    console.log(new Date(), result.errmsg, '营销大脑 企业微信消息推送告警======')
  }
  
}


export async function getGroupMsgResult(accessToken, msgid) {
  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_group_msg_result?access_token=${accessToken}`, {
    msgid
  })

  if (result.errmsg !== 'ok') {
    console.log(new Date(), result.errmsg ,'营销大脑 企业微信外部联系人消息推送结果统计失败======')
    return []
  }

  return result.detail_list
}

export async function externalcontact(accessToken, userid) {
  let result = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get?access_token=${accessToken}&external_userid=${userid}`)

  if (result.errmsg !== 'ok') {
    console.log(new Date(), result.errmsg ,'营销大脑 企业微信外部联系人查询详细信息失败======')
    return {}
  }

  return result

}

export async function getAppChat({accessToken, chatid}) {
  chatid = chatid.replace(/\-/g,'')
  let result = await FetchKit.get(`https://qyapi.weixin.qq.com/cgi-bin/appchat/get?access_token=${accessToken}&chatid=${chatid}`)

  if (result.errmsg !== 'ok') {
    if (result.errcode === 86003) {
      return false
    }
    console.log(new Date(), result.errmsg ,'营销大脑 查询群聊失败======')
    return {}
  }
  return result
}

export async function creatAppChat({accessToken, userList, chatid, chatName, owner}) {
  chatid = chatid.replace(/\-/g,'')
  const params = {
    'name' : chatName,
    'userlist' : userList,
    'chatid' : chatid
  }

  if (owner) params.owner = owner

  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/appchat/create?access_token=${accessToken}`, params)

  if (result.errmsg !== 'ok') {
    console.log(new Date(), result.errmsg ,'营销大脑 企业微信新建群聊失败======')
    return {}
  }
}

export async function pullNewsToAppChat({accessToken, chatid, msgtype, ...others }) {
  chatid = chatid.replace(/\-/g,'')
  const params = {
    chatid,
    msgtype,
    ...others
  }

  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/appchat/send?access_token=${accessToken}`, params)

  if (result.errmsg !== 'ok') {
    console.log(new Date(), result.errmsg ,'营销大脑 企业微信发送群聊消息失败======')
    return {}
  }
}

export async function getUserContactMe(accessToken, userid) {
  //https://work.weixin.qq.com/api/doc/90000/90135/92572#%E9%85%8D%E7%BD%AE%E5%AE%A2%E6%88%B7%E8%81%94%E7%B3%BB%E3%80%8C%E8%81%94%E7%B3%BB%E6%88%91%E3%80%8D%E6%96%B9%E5%BC%8F
  let result = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_contact_way?access_token=${accessToken}`, {
    "type" :1,
    "scene":2,
    "user" : [userid]
 })

  if (result.errmsg !== 'ok') {
    if (result.errcode !== 0) {
      console.log(new Date(), result.errmsg ,'营销大脑 获取导购联系我config失败======')
      return false
    }
  }

  const { config_id } = result

  const qrcodeRes = await FetchKit.post(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get_contact_way?access_token=${accessToken}`, {
    config_id
  })

  if (qrcodeRes.errmsg !== 'ok') {
    if (qrcodeRes.errcode !== 0) {
      console.log(new Date(), qrcodeRes.errmsg ,'营销大脑 获取导购联系我config失败======')
      return false
    }
  }


  return {
    contact_me: _.get(qrcodeRes, 'contact_way.qr_code', null),
    contact_me_config: config_id
  }
}