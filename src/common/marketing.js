import { MARKETING_EVENT_TIMER_TYPE } from './constants'
import moment from 'moment'

/**
 * @description
 * @typeof MarketingEventTimer
 * @property {Array} realTimers [{star, end, value, unit}]
 * @property {string} timingTimer
 */

/**
 * @description 获取营销事件营销时机对应的cron表达式
 * @param {MarketingEventTimer} timer 营销时机
 * @param {MARKETING_EVENT_TIMER_TYPE} timer_type 营销时机类型0=
 * @returns [CronExpression]
 */
export function getMarketingEventCronExpression(timer, timer_type) {
  const { realTimers, timingTimer } = timer
  // 定时事件
  if(MARKETING_EVENT_TIMER_TYPE.TIMING === timer_type) {
    const timing = moment(timingTimer, 'HH:mm')
    return [{
      cron: `${timing.minutes()} ${timing.hours()} * * *`
    }]
  }
  // 实时事件
  return realTimers.map(({start, end, value, unit}) => {
    // */n * * * * // 每隔n分钟
    // 0 */n * * *  // 每隔n小时（整点）
    let cron
    if (unit === 'minute') {
      cron = `*/${value} * * * *`
    } else {
      // 以开始时间的分钟算，每隔n小时
      const startMinute = start.split(':')[1]
      cron = `${startMinute} */${value} * * *`
    }
    let currentDate = moment(start, 'HH:mm').toDate()
    let endDate = moment(end, 'HH:mm').toDate()
    if ((endDate.getTime() - Date.now()) <= 0) { // 结束日期过期，往后推1天
      currentDate = moment(currentDate).add(1, 'day').toDate()
      endDate = moment(endDate).add(1, 'day').toDate()
    }
    return {
      currentDate,
      endDate,
      cron
    }
  })
}


export function checkExpireAndGenCron({timingDate: timerDate, timingTimer: timerTime}) {
  const [Y,M,D] = timerDate.split('-')
  const [H,m] = timerTime.split(':')
  timerDate = ~~timerDate.replace(/\-/g, '')
  timerTime = ~~timerTime.replace(/\:/g, '')
  const nowDay = ~~moment().format('YYYY-MM-DD').replace(/\-/g, '')
  const nowTime = ~~moment().format('HH:mm').replace(/\:/g, '')

  //昨天的 true
  const isDisableDate = timerDate < nowDay
  //时间小于等于当前 true
  const isDisableTime = timerTime <= nowTime

  const isTomorrow = timerDate > nowDay
  //昨天的 直接是true  今天的,需要判断时间
  let isDisable = isDisableDate || (
    timerDate === nowDay && isDisableTime
  )

  if (isTomorrow) isDisable = false
  //申请的时间大于当前一刻,直接return 
  if (isDisable) return false

  return `0 ${m} ${H} ${D} ${M} *`
}
