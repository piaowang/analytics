import moment from 'moment'
import macaddress from 'macaddress'

//服务的错误信息返回定义
export function returnError(ctx, msg, status = 400) {
  ctx.status = status
  return ctx.body = {
    error: msg
  }
}

//服务的返回结果
export function returnResult(ctx, result, code = 0, status) {
  if (status) ctx.status = status
  return ctx.body = {
    result,
    code
  }
}

export function setCacheControlByTimeRange(ctx, since, until, cacheForHistoryData = 60 * 60 * 24 * 7, cacheForRecentlyData = 30) {
  // 假设查询时间区间 [a, b]，b < Now - 7 days 的话则算是查历史数据
  // 允许浏览器缓存一周、非历史数据缓存 30 秒（待定）
  // 如果是查最近 15 分钟以内的数据，则不缓存
  if (until && moment(until).isBefore(moment().add(-7, 'days'))) {
    ctx.set('Cache-Control', `private,max-stale=0,max-age=${cacheForHistoryData}`)
  } else if (since && moment(since).isAfter(moment().add(-7, 'days'))) {
    ctx.set('Cache-Control', 'private,max-stale=0,max-age=0')
  } else {
    ctx.set('Cache-Control', `private,max-stale=0,max-age=${cacheForRecentlyData}`)
  }
}

//convert sequenlize instance to js object
export const toJs = inst => inst.get({ plain: true })

// 获取机器mac地址
let macAddressCache = null

export const getMacaddress = () => {
  if (macAddressCache) {
    return macAddressCache
  }
  return new Promise((resolve, reject) => {
    macaddress.one((err, macAddress) => {
      if (err) reject(err)
      macAddressCache = macAddress
      resolve(macAddress)
    })
  })
}

