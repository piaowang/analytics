
//发短信
import conf from '../config'
import crypto from 'crypto'
import moment from 'moment'
import {generate} from 'shortid'
import {err} from '../utils/log'
import {dec} from 'sugo-encoder'
import _ from 'lodash'
import db from '../models'

const {aliyunAccessKey, aliyunAccessSecret, test, aliyunSmsTemplateCode, aliyunSmsSignName} = conf
let secret = dec(aliyunAccessSecret)
let key = dec(aliyunAccessKey)

// let a = 'POST&%2F&AccessKeyId%3Dtestid%26Action%3DSingleSendSms%26Format%3DXML%26ParamString%3D%257B%2522name%2522%253A%2522d%2522%252C%2522name1%2522%253A%2522d%2522%257D%26RecNum%3D13098765432%26RegionId%3Dcn-hangzhou%26SignName%3D%25E6%25A0%2587%25E7%25AD%25BE%25E6%25B5%258B%25E8%25AF%2595%26SignatureMethod%3DHMAC-SHA1%26SignatureNonce%3D9e030f6b-03a2-40f0-a6ba-157d44532fd0%26SignatureVersion%3D1.0%26TemplateCode%3DSMS_1650053%26Timestamp%3D2016-10-20T05%253A37%253A52Z%26Version%3D2016-09-27'
// const hmac1 = crypto.createHmac('sha1', 'testsecret&')
// hmac1.update(a)
// debug(encodeURIComponent(hmac1.digest('base64')), 'h1')

/*
  StringToSign=
    HTTPMethod + “&” +
    percentEncode(“/”) + ”&” +
    percentEncode(CanonicalizedQueryString)
*/

function parse (obj) {
  let keys = Object.keys(obj)
  keys.sort()
  //debug(keys.join(','), 'keys')
  return keys.reduce((prev, key) => {
    return prev + `&${key}=${encodeURIComponent(obj[key])}`
  }, '')
}

export function formBody (obj) {
  let keys = Object.keys(obj)
  return keys.reduce((prev, key) => {
    return prev + `&${key}=${obj[key]}`
  }, '').slice(1)
}

export function sign(obj) {
  let str1 = parse (obj)
  let str = 'POST&' +
    encodeURIComponent('/') + '&' +
    encodeURIComponent(str1.slice(1))
  const hmac = crypto.createHmac('sha1', secret + '&')
  hmac.update(str)
  return encodeURIComponent(hmac.digest('base64'))

}

/*
Action	String	必须	操作接口名，系统规定参数，取值：SingleSendSms
SignName	String	必须	管理控制台中配置的短信签名（状态必须是验证通过）
TemplateCode	String	必须	管理控制台中配置的审核通过的短信模板的模板CODE（状态必须是验证通过）
RecNum	String	必须	目标手机号，多个手机号可以逗号分隔
ParamString	String	必选	短信模板中的变量；数字需要转换为字符串；个人用户每个变量长度必须小于15个字符。 例如:短信模板为：“接受短信验证码${no}”,此参数传递{“no”:”123456”}，用户将接收到[短信签名]接受短信验证码123456

Format	String	否	返回值的类型，支持JSON与XML。默认为XML
Version	String	是	API版本号，为日期形式：YYYY-MM-DD，本版本对应为2016-09-27
AccessKeyId	String	是	阿里云颁发给用户的访问服务所用的密钥ID
Signature	String	是	签名结果串，关于签名的计算方法，请参见 签名机制。
SignatureMethod	String	是	签名方式，目前支持HMAC-SHA1
Timestamp	String	是	请求的时间戳。日期格式按照ISO8601标准表示，并需要使用UTC时间。格式为YYYY-MM-DDThh:mm:ssZ 例如，2015-11-23T04:00:00Z（为北京时间2015年11月23日12点0分0秒）
SignatureVersion	String	是	签名算法版本，目前版本是1.0
SignatureNonce	String	是	唯一随机数，用于防止网络重放攻击。用户在不同请求间要使用不同的随机数值
RegionId	String	否	机房信息
*/
export async function sendCode(RecNum, code) {

  return await sendMsg(RecNum, 'code', {code})

}

/**
 * 
 * @param {String} RecNum 必须	目标手机号，多个手机号可以逗号分隔
 * @param {String} templateName 必须 模板名称，使用前必须在config.default.js中aliyunSmsTemplateCode里定义
 * @param {Object} Param 必选	短信模板中的变量；数字需要转换为字符串；个人用户每个变量长度必须小于15个字符。 例如:短信模板为：“接受短信验证码${no}”,此参数传递{“no”:”123456”}，用户将*          接收到[短信签名]接受短信验证码123456
 * @param {String} signName 可选 签名名称 默认为main，使用前必须在config.default.js中aliyunSmsSignName里定义
 */
export async function sendMsg(RecNum, templateName, Param, signName = 'main') {

  let TemplateCode = aliyunSmsTemplateCode[templateName]
  if (!TemplateCode || !aliyunAccessKey) {
    throw new Error('没有开通短信功能')
  }
  //test
  if (test || !TemplateCode) {
    debug(RecNum, templateName, Param, signName)
    return {
      Model: 'test-msg',
      RequestId: 'test-msg'
    }
  }

  let base = {
    Action: 'SingleSendSms',
    SignName: aliyunSmsSignName[signName],
    TemplateCode,
    RecNum,
    ParamString: JSON.stringify(Param),
    Format: 'JSON',
    Version: '2016-09-27',
    AccessKeyId: key,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: moment().utc().format(),
    SignatureNonce: generate(),
    SignatureVersion: '1.0'
  }

  base.Signature = sign(base)
  let body = formBody(base)
  debug('send msg body:', body)
  let res = await fetch('http://sms.aliyuncs.com/', {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  })
    .then(res => res.json())
    .catch(e => {
      err('发送短信出错了', e.stack)
      throw e
    })
  debug('send msg result:', res)
  await db.MsgLog.create({
    result: res,
    to: RecNum,
    templateCode: TemplateCode
  })
  return res
}
