
//发短信
import conf from '../config'
import moment from 'moment'
import {generate} from 'shortid'
import {log, err} from '../utils/log'
import {sign, formBody} from './msg'
import {dec} from 'sugo-encoder'
import db from '../models'

const {aliyunAccessKey, test} = conf
let key = dec(aliyunAccessKey)

//验证邮件地址的邮件
export async function sendValidateEmail({ToAddress, code, host}) {
  let Subject = '验证您的邮件地址[数果科技]'
  let addr = `${host}/validate-email/${code}`
  let HtmlBody = `
    <h1>点击下面的链接验证您的邮件地址</h1>
    <hr />
    <p>
      <a href="${addr}">${addr}</a>
    </p>
    <hr />
    <p>
      您收到这封邮件是因为，这个邮件地址被用于
      <a href="${host}/reg">注册数果星盘用户</a>
      , 如果不是您本人操作，请忽略本邮件
    </p>
    <p>请勿回复此邮件，因为该地址仅用来发送邮件，无法接收到邮件回复</p>
    <hr />
    <p>
      <a href="http://sugo.io">广东数果科技</a>
    </p>
  `

  return sendMail({ToAddress, Subject, HtmlBody})
}

//重置密码邮件
export async function sendResetPasswordEmail({ToAddress, code, host}) {
  let Subject = '重置密码[数果科技]'
  let addr = `${host}/reset-password/${code}`
  let HtmlBody = `
    <h1>点击下面的链接重置您的数果星盘密码</h1>
    <hr />
    <p>
      <a href="${addr}">${addr}</a>
    </p>
    <hr />
    <p>如果不是您本人正在进行重置密码，请忽略本邮件</p>
    <p>请勿回复此邮件，因为该地址仅用来发送邮件，无法接收到邮件回复</p>
    <hr />
    <p>
      <a href="http://sugo.io">广东数果科技</a>
    </p>
  `

  return sendMail({ToAddress, Subject, HtmlBody})
}


/*
名称	类型	是否必须	描述
Action	String	必须	操作接口名，系统规定参数，取值：SingleSendMail
AccountName	String	必须	管理控制台中配置的发信地址
ReplyToAddress	Boolean	必须	是否使用管理控制台中配置的回信地址（状态必须是验证通过）
AddressType	Number	必须	取值范围0~1: 0为随机账号(推荐,可以更好的统计退信情况);1为发信地址
ToAddress	String	必须	目标地址，多个Email地址可以逗号分隔
FromAlias	String	可选	发信人昵称,长度小于15个字符 例如:发信人昵称设置为"小红"，发信地址为"test@example.com"，收信人看到的发信地址为"小红"<test@example.com>
Subject	String	可选	邮件主题,建议填写
HtmlBody	String	可选	邮件html正文
TextBody	String	可选	邮件text正文

名称	类型	是否必须	描述
Format	String	否	返回值的类型，支持JSON与XML。默认为XML
Version	String	是	API版本号，为日期形式：YYYY-MM-DD，本版本对应为2015-11-23
AccessKeyId	String	是	阿里云颁发给用户的访问服务所用的密钥ID
Signature	String	是	签名结果串，关于签名的计算方法，请参见 签名机制。
SignatureMethod	String	是	签名方式，目前支持HMAC-SHA1
Timestamp	String	是	请求的时间戳。日期格式按照ISO8601标准表示，并需要使用UTC时间。格式为YYYY-MM-DDThh:mm:ssZ 例如，2015-11-23T04:00:00Z（为北京时间2015年11月23日12点0分0秒）
SignatureVersion	String	是	签名算法版本，目前版本是1.0
SignatureNonce	String	是	唯一随机数，用于防止网络重放攻击。用户在不同请求间要使用不同的随机数值
RegionId	String	否	机房信息
*/
export async function sendMail({ToAddress, Subject, HtmlBody}) {

  //未开通邮件服务
  if (!conf.aliyunEmailAddr || !aliyunAccessKey) {
    throw new Error('未开通邮件服务')
  }

  //test
  if (test) {
    log('test mode on, email=', HtmlBody)
    return {
      Model: 'test-email',
      RequestId: 'test-email'
    }
  }

  let base = {
    Action: 'SingleSendMail',
    AccountName: conf.aliyunEmailAddr,
    ReplyToAddress: false,
    AddressType: 0,
    ToAddress,
    FromAlias: '广东数果科技',
    Subject,
    HtmlBody,

    Format: 'JSON',
    Version: '2015-11-23',
    AccessKeyId: key,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: moment().utc().format(),
    SignatureVersion: '1.0',
    SignatureNonce: generate()
  }

  let s = sign(base)
  base.Signature = s
  let body = formBody(base)
  debug('post email to')
  debug('https://dm.aliyuncs.com/')
  debug('subject:', Subject)
  debug('body:', body)
  let res = await fetch('https://dm.aliyuncs.com/', {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    }
  })
    .then(res => res.json())
    .catch(e => {
      err('发送邮件出错了', e.stack)
      throw e
    })
  debug('send email result:', res)
  await db.EmailLog.create({
    result: res,
    from: conf.aliyunEmailAddr,
    to: ToAddress,
    body: HtmlBody,
    subject: Subject
  })
  return res

}
