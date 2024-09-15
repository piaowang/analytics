import db from '../models'
import macaddress from 'macaddress'
import { Response } from '../utils/Response'
import { ds as dsUtil, generateLicense } from 'sugo-license-manager'
import CryptoJs from 'crypto-js'
import { compressUrlQuery, decompressUrlQuery} from '../../common/sugo-utils'
import _ from 'lodash'
import moment from 'moment'
import FetchKit from '../utils/fetch-kit'

const LICENSE_META_TYPE = 'license-log'

/**
 * 获取产品注册码
 */
export const getRegCode = () => {
  return new Promise((resolve, reject) => {
    macaddress.one(function (err, mac) {
      if (err) {
        reject(err)
      }
      resolve(CryptoJs.MD5(mac).toString().toUpperCase())
    })
  })
}

// 验证是否已有license，且license未过期
export const verifyRegCode = async (val) => {
  let resp = new Response()
  let license = val
  if (!license) {
    const meta = await db.Meta.findOne({
      where: {
        name: LICENSE_META_TYPE
      }
    })
    if (meta === null) { // license还为生成，需要根据注册码生成license
      resp.success = false
      resp.code = 1002
      resp.message = 'PRODCODE_MISSING'
      return resp.serialize()
    }
    const { value } = meta.get({plain: true})
    license = decompressUrlQuery(value)
  }
  const t1 = moment(getExpireTime(license))
  const days = getDays(license)
  if (!t1.isValid() || isNaN(days) || days <= 0) {
    resp.success = false
    resp.code = 1008
    resp.message = 'LICENSE_FAILED'
    return resp.serialize()
  }
  // 比较时用秒单位
  const res = await validate(moment(t1).add(days, 'days'), t1, 'seconds')
  if (res <= 0) { // license已过期
    resp.success = false
    resp.code = 1008
    resp.message = 'LICENSE_EXPIRE'
    return resp.serialize()
  }
  // 取出剩余天数
  const surplusDays = await  validate(moment(t1).add(days, 'days'), t1)
  resp.success = true
  resp.result = {days: surplusDays, expireTime: moment(t1).add(days, 'days')}
  resp.message = 'OK'
  return resp.serialize()
}

const decHash = (license) => {
  const arr = license.split('-')
  const str = _.slice(arr, 4).join(''), key = _.slice(arr, 0, 4).join('')
  try {
    return dsUtil(str, key).split(',')
  } catch (e) {
    return []
  }
}

/** 获取license中的起始时间 返回 时间字符串 */
export const getExpireTime = (license) => {
  try {
    return decHash(license)[1]
  } catch (e) {
    return null
  }
}

/** 获取license中的授权天数 */
export const getDays = (license) => {
  try {
    const val = decHash(license)[0]
    return Number(val)
  } catch (e) {
    return null
  }
}

export const getCreateTime = (license) => {
  try {
    return decHash(license)[2]
  } catch (e) {
    return null
  }
}

// 激活产品序列号
export const register = async (license, licenseData) => {
  let resp = new Response()
  const ff = async () => {
    const v = await getCurrentTime()
    return moment(v).format('YYYY-MM-DD HH:mm:ss')
  }
  let oldRecord = await db.Meta.findOne({
    where: {
      name: LICENSE_META_TYPE
    }
  })
  if (oldRecord !== null) { // 已激活验证是否重复license使用
    const { value } = oldRecord.get({plain: true})
    const arr = decHash(decompressUrlQuery(value)), oldCreateTime = arr[2]
    if (!arr || arr.length === 0 || !oldCreateTime) {
      resp.success = false
      resp.code = 500
      resp.message = 'LICENSE_FAILED'
      return resp.serialize()
    }
    if (_.includes(oldCreateTime.split(';'), licenseData.createTime)) {
      resp.success = false
      resp.code = 500
      resp.message = 'HAS_USED'
      return resp.serialize()
    }
    // 如果根据输入的license没查找到则是累计license操作，查询出原来的license记录
    // 取出历史licene里剩余天数，合并到新的license里
    const oldDays = arr[0], oldTime = arr[1]
    // 取出剩余天数
    const surplusDays = await  validate(moment(oldTime).add(oldDays, 'days'), oldTime)
    // 累计剩余天数 (surplusDays会忽略当前天，所以加1天)
    licenseData.days = parseInt(licenseData.days, 10) + (parseInt(surplusDays, 10) + 1)
    // 保存旧的已激活过license创建时间，以便验证是否重复使用license
    licenseData.createTime = [oldCreateTime, licenseData.createTime].join(';')
  }
  // 将开始时间写入license，重新生成并写入数据库
  licenseData.start = await ff()
  const finalLicense = getLicense(generateLicense(licenseData))
  await db.Meta.destroy({
    where: {
      name: LICENSE_META_TYPE
    }
  })
  const [result, isCreate] = await db.Meta.findOrCreate({
    where: {
      name: LICENSE_META_TYPE,
      value: compressUrlQuery(finalLicense)
    }
  })
  let success = isCreate && result !== null
  resp.success = success
  resp.code = success ? 200 : -1
  resp.message = success ? 'OK' : 'FAILED'
  return resp.serialize()
}

const getLicense = (data) => {
  if (data.message === 'ok' && data.errorCode === 0) {
    return data.license
  }
  return null
}

const getCurrentTime = async () => {
  // try {
  //   const res = await FetchKit.get('http://astro.sugo.io/api/plyql/health') // 获取服务端时间校验
  //   if (res !== '') {
  //     _t = moment(res.split('@')[1])
  //   }
  // } catch (e) {
  //   _t = moment()
  // }
  return moment()
}

// 验证序列号里时间是否已过期，并返回时间差（天数）
const validate = async (t1, start, unit = 'days') => {
  let _t2 = await getCurrentTime()
  let _t1 = moment(t1), _start = moment(start)
  if (_t2 <= _start) _t2 = _start // 如果当前时间小于时间，则取起始时间
  return _t1.diff(_t2, unit)
}
