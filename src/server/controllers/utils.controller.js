
import db from '../models'
import {generate} from 'shortid'
import {returnError, returnResult} from '../utils/helper'
import {log} from '../utils/log'
import {sendCode} from '../utils/msg'
import testEmail from '../../common/test-email'
import {sendResetPasswordEmail} from '../utils/email'
import conf from '../config'
import moment from 'moment'
import { Response } from '../utils/Response'
import qr from 'qr-image'
const {cellcodeExpireTime} = conf
import {validateLicense} from 'sugo-license-manager'
import { register, getCreateTime, getDays} from '../utils/license-kit'
import _ from 'lodash'

// sendValidateEmail({
//   ToAddress: 'zxdong@gmail.com',
//   code: '90',
//   host: 'http://localhost:8080'
// })

const validateCellcode = async ctx => {
  let {cellcode} = ctx.q
  let {session} = ctx
  if (!cellcode) {
    return ctx.body = {
      error: '请先发送验证码'
    }
  }

  if (cellcode.toLowerCase() !== session.cellcode) {
    return ctx.body = {
      error: '验证码不正确'
    }
  }

  let now = new Date().getTime()

  if (now - session.sendCellCodeTime > cellcodeExpireTime) {
    return returnError(ctx, '验证码已经过期，请重新发送验证码', 200)
  }

  ctx.body = {
    code: 0
  }
}

const sendCellcode = async ctx => {
  let {cell} = ctx.q

  if (!/^1[0-9]{10}$/.test(cell)) {
    return returnError(ctx, '手机号码不正确', 200)
  }

  let {session} = ctx
  let now = (new Date()).getTime()
  let lastTime = session.sendCellCodeTime || 0
  let diff = Math.floor((now - lastTime) / 1000)

  //60s only for one send code
  if (diff < 60) {
    return returnError(ctx, '太频繁了，请${60 - diff}秒再发送')
  }

  let ig = await db.SugoCompany.findOne({
    where: {
      cellphone: cell,
      deleted: false
    }
  })

  if (ig) {
    return returnError(ctx, '手机号码已经被注册', 200)
  }

  session.sendCellCodeTime = now

  let rand = generate()
  rand = rand.slice(0, 4)
  session.cellcode = rand.toLowerCase()
  session.cellnum = cell
  let res = await sendCode(cell, rand)
  log('send msg res', JSON.stringify(res || ''))
  returnResult(ctx, res)
}

const validateCompanyName = async ctx => {
  let {companyName} = ctx.q

  let ig = await db.SugoCompany.findOne({
    where: {
      name: companyName
    }
  })
  if (ig) {
    ctx.body = {
      error: '公司名已经被注册，请换一个'
    }
  } else {
    ctx.body = {
      code: 0
    }
  }
}

const validateCellphone = async ctx => {
  let {cellphone} = ctx.q

  let ig = await db.SugoCompany.findOne({
    where: {
      cellphone
    }
  })

  if (ig) {
    ctx.body = {
      error: '手机号码已经被注册，请换一个'
    }
  } else {
    ctx.body = {
      code: 0
    }
  }
}

const validateEmail = async ctx => {
  let {email} = ctx.q
  if (_.trim(email) && !testEmail(email)) {
    return ctx.body = {
      error: '邮件地址格式不对'
    }
  }

  if (_.trim(email)) {
    let ig = await db.SugoUser.findOne({
      where: { email }
    })
    if (ig) {
      ctx.body = {
        error: '地址已经被占用，请换一个邮件地址'
      }
      return
    }
  }
  ctx.body = {
    code: 0
  }
}

const applyResetPassword = async ctx => {
  let {email} = ctx.q
  if (!testEmail(email)) {
    return returnError(ctx, '邮件地址不符合格式')
  }
  let indb = await db.SugoUser.findOne({
    where: {
      email
    }
  })

  if (!indb) {
    return returnError(ctx, '邮件地址未注册')
  }

  let ve = await db.EmailValidate.create({
    user_id: indb.id,
    expire: moment().add(24, 'hours')._d
  })

  let res = await sendResetPasswordEmail({
    ToAddress: email,
    code: ve.id,
    host: ctx.local.host
  })

  returnResult(ctx, res)
}

// 完成激活 验证产品序列号
const verify = async ctx => {
  let {code, license} = ctx.q
  let resp = new Response()
  // const cwd = process.cwd()
  // const pack = require(cwd + '/package.json')
  const days = getDays(license)
  if (isNaN(days) || days <= 0) {
    resp.success = false
    resp.code = 500
    resp.message = 'PRODCODE_MISSING'
  }
  const createTime = getCreateTime(license)
  const licenseData = {
    prodCode: code,
    // appVersion: pack.version, // 不验证版本号
    start: null,
    createTime,
    days
  }
  if (!code) {
    resp.success = false
    resp.code = 500
    resp.message = 'PRODCODE_MISSING'
    return returnResult(ctx, resp.serialize())
  }
  try {
    validateLicense(licenseData, license)
  } catch (e) {
    resp.success = false
    resp.code = 500
    resp.message = 'LICENSE_FAILED'
    return returnResult(ctx, resp.serialize())
  }
  let res = await register(license, licenseData)
  resp.success = res.code === 200
  if (res.code === -1) { // 已激活
    resp.message = 'OK'
  } else if(res.code === 500) {
    resp.code = res.code
    resp.message = res.message
  }
  return returnResult(ctx, resp.serialize())
}

async function genQrImage(ctx) {
  let {url} = ctx.query
  let qr_png = qr.image(url, { type: 'png', size: 6 })
  ctx.type = 'image/png'
  ctx.body = qr_png
}

export default {
  validateCellcode,
  sendCellcode,
  validateEmail,
  applyResetPassword,
  validateCompanyName,
  validateCellphone,
  verify,
  genQrImage
}
