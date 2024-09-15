import crypto from 'crypto'
import { parseString } from 'xml2js'
import CustomService from '../../services/market-brain/external-user.service'
import StaffService from '../../services/market-brain/staff.service'
import ResultService from '../../services/market-brain/result.service'
import conf from '../../config'

const { marketbrainWechatReceiveEventServer: { token, encodingAESKey },
  site: {
    marketBrain: {
      shouldUpdateContactMe = false
    }
  }
} = conf

export default class SugoMarketBrainTasksController {

  constructor() {
    this.customService =  new CustomService()
    this.staffService =  new StaffService()
    this.resultService = new ResultService()
  }

  //暂时没人用
  async initListenWxEvent(ctx) {
    const { msg_signature, timestamp, nonce, echostr } = ctx.query
  
    const tmpArr = [token, timestamp, nonce, echostr]
    const tmpStr = sha1(tmpArr.sort().join(''))
    if (tmpStr === msg_signature) {
      // 原样返回echostr参数内容
      let aesKey = Buffer.from(encodingAESKey + '=', 'base64')
      let result = _decode(echostr, aesKey)
      console.log(new Date(), result,'企业微信事件回调get===')
      return ctx.body = result
    }
    console.log(new Date(), '微信事件监听服务验签失败get===')
    console.log(tmpStr)
    console.log(msg_signature)
  }

  //暂时没人用
  async listenWxEvent(ctx) {
    const { msg_signature, timestamp, nonce } = ctx.query
    const { Encrypt, ToUserName } = ctx.request.body.xml
  
    const echostr = Encrypt[0]
  
    const tmpArr = [token, timestamp, nonce, echostr]
    const tmpStr = sha1(tmpArr.sort().join(''))
    if (tmpStr === msg_signature) {
      let aesKey = Buffer.from(encodingAESKey + '=', 'base64')
      let result = _decode(echostr, aesKey)
      result = await parseXml(result)
      result = result.xml || {}
      console.log(new Date(), result,'企业微信事件回调post===')
      return ctx.body = {}
    }
    console.log(new Date(), '微信事件监听服务验签失败post===')
    console.log(tmpStr)
    console.log(msg_signature)
  }

  async updateSomeStaff(ctx) {
    const { company_id = null, store_id = null } = ctx.request.body
    if (!company_id && !store_id) {
      return ctx.body = Response.error()
    }

    if (company_id === 'all') {
      //TODO
      await this.staffService.updateAllStaffAndExternalUser()
      await this.resultService.getGroupMsgResultSchedule()
      if (shouldUpdateContactMe)  await this.staffService.updateAllStaffContactMe()
      // await this.resultService.dayReportSchedule()
      // await this.resultService.hurryStaff()
    }
  }
}











function sha1(str) {
  const md5sum = crypto.createHash('sha1')
  md5sum.update(str)
  const ciphertext = md5sum.digest('hex')
  return ciphertext
}

function PKCS7Decoder (buff) {
  var pad = buff[buff.length - 1]
  if (pad < 1 || pad > 32) {
    pad = 0
  }
  return buff.slice(0, buff.length - pad)
}

function _decode(data, aesKey) {
  let aesCipher = crypto.createDecipheriv('aes-256-cbc', aesKey, aesKey.slice(0, 16))
  aesCipher.setAutoPadding(false)
  let decipheredBuff = Buffer.concat([aesCipher.update(data, 'base64'), aesCipher.final()])
  decipheredBuff = PKCS7Decoder(decipheredBuff)
  let len_netOrder_corpid = decipheredBuff.slice(16)
  let msg_len = len_netOrder_corpid.slice(0, 4).readUInt32BE(0)
  const result = len_netOrder_corpid.slice(4, msg_len + 4).toString()
  return result // 返回一个解密后的明文-
}

function parseXml(str) {
  return new Promise((resolve, reject) => {
    parseString(str, function(err, result) {
      if (err) return reject(err)
      resolve(result)
    })
  })
}


