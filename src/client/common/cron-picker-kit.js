import later from 'later'
import parser from 'cron-parser'
import moment from 'moment'

export function getPeriodOptions() {
  return [
    // {
    //   label: '分钟',
    //   value: 'minute',
    //   prep: ''
    // },
    {
      label: '小时',
      value: 'hour',
      prep: 'at'
    }, {
      label: '天',
      value: 'day',
      prep: 'at'
    }, {
      label: '周',
      value: 'week',
      prep: 'on'
    },
    {
      label: '月',
      value: 'month',
      prep: 'on the'
    }/* {
      label: '年',
      value: 'year',
      prep: 'on the'
    } */
  ]
}

function getRange(n) {
  return [...Array(n).keys()]
}

function getRangeOptions(n) {
  return getRange(n).map((v) => {
    return {
      label: `0${v}`.slice(-2),
      value: v
    }
  })
}

export function getMinuteOptions() {
  return getRangeOptions(60)
}

export function getHourOptions() {
  return getRangeOptions(24)
}

export function ordinalSuffix(n) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const val = n % 100

  return `${n}${suffixes[(val - 20) % 10] || suffixes[val] || suffixes[0]}`
}

export function getDayOptions() {
  return [
    {
      label: '星期天',
      value: 0
    }, {
      label: '星期一',
      value: 1
    }, {
      label: '星期二',
      value: 2
    }, {
      label: '星期三',
      value: 3
    }, {
      label: '星期四',
      value: 4
    }, {
      label: '星期五',
      value: 5
    }, {
      label: '星期六',
      value: 6
    }
  ]
}

export function getMonthDaysOptions() {
  return getRange(31).map((v) => {
    return {
      label: ordinalSuffix(v + 1),
      value: v + 1
    }
  })
}

function monthsList() {
  return [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月'
  ]
}

export function getMonthOptions() {
  return monthsList().map((m, index) => {
    return {
      label: m,
      value: index + 1
    }
  })
}

export function getMinuteCron(value) {
  return '* * * * *'
}

export function getHourCron(value) {
  return `${value.minute} * * * *`
}

export function getDayCron(value) {
  return `${value.minute} ${value.hour} * * *`
}

export function getWeekCron(value) {
  return `${value.minute} ${value.hour} * * ${value.day}`
}

export function getMonthCron(value) {
  return `${value.minute} ${value.hour} ${value.day} * *`
}

export function getYearCron(value) {
  return `${value.minute} ${value.hour} ${value.day} ${value.month} *`
}

export function getIntervalCron(value) {
  switch (value.type) {
    case 'hour':
      return value.hour === '0' ?  `${value.minute} * * * *` : `${value.minute} ${value.startHour || '*'}/${value.hour} * * *`
    case 'minute':
      return  `*/${value.hour} * * * *`
    default:
      return value.hour === '0' ?  `${value.minute} * * * *` : `${value.minute} ${value.startHour || '*'}/${value.hour} * * *`
  }
}

export const SELECT_PERIOD = {
  Minute: 'minute',
  Hour: 'hour',
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Year: 'year'
}

export function getCron(state) {
  const {
    selectedPeriod,
    selectedHourOption,
    selectedDayOption,
    selectedWeekOption,
    selectedMonthOption,
    selectedYearOption,
    selectedIntervalOption
  } = state

  switch (selectedPeriod) {
    case 'minute':
      return getMinuteCron({})
    case 'hour':
      return getHourCron(selectedHourOption)
    case 'day':
      return getDayCron(selectedDayOption)
    case 'week':
      return getWeekCron(selectedWeekOption)
    case 'month':
      return getMonthCron(selectedMonthOption)
    case 'year':
      return getYearCron(selectedYearOption)
    case 'atInterval': 
      return getIntervalCron(selectedIntervalOption)
    default:
      return '* * * * *'
  }
}

export function getNextTriggerDate(exp) {
  var options = {
    iterator: false,
    tz: 'Asia/Shanghai'
  }
  return parser.parseExpression(exp, options)
}

/**
 * @description
 * @param {any} cron
 * @param {any} [opts={currentDate, endDate}]
 * @param {number} [limit=3]
 */
export function getNextTriggerByCronParser(cron, opts = {}, limit = 3) {
  const options = {
    ...opts,
    iterator: false,
    tz: 'Asia/Shanghai'
  }
  let { currentDate, endDate } = options
  if (currentDate && endDate) { // 设置有时间限定条件时
    if ((endDate.getTime() - Date.now()) <= 0) { // 结束日期过期，往后推1天
      options.currentDate = moment(currentDate).add(1, 'day').toDate()
      options.endDate = moment(endDate).add(1, 'day').toDate()
    }
  }
  const interval = parser.parseExpression(cron, options)
  let idx = 0
  let results = []
  while (true) {
    if (idx >= limit) {
      break
    }
    try {
      const obj = interval.next()
      if ((new Date(obj.toString()) - Date.now()) > 0) { // 已过期事件排除显示
        results.push(moment(obj.toString()).format('YYYY-MM-DD HH:mm'))
        idx++
      }
    } catch (e) {
      break
    }
  }
  return results
}

export function getNextTriggerDateByLater(exp, beginDate, count = 3) {
  if(!exp) return []
  later.date.timezone = overviewTimeZone
  later.date.timezone('Asia/Shanghai')
  let currDate = beginDate && moment().diff(beginDate) < 0 ? moment(beginDate) : moment()
  const list = later.schedule(later.parse.cron(exp, exp.split(' ').length === 6)).next(count, currDate)
  return list.map(p => moment(p).format('YYYY-MM-DD HH:mm'))
}

function overviewTimeZone(timezone) {

  // configure the date builder used to create new dates in the right timezone
  later.date.build = function (Y, M, D, h, m, s) {
    return timezone !== false ? moment(new Date(Y, M, D, h, m, s)).tz(timezone).toDate() : new Date(Date.UTC(Y, M, D, h, m, s))
  }
  // configure the accessor methods
  var get = timezone !== false ? 'get' : 'getUTC',
    d = Date.prototype

  later.date.getYear = d[get + 'FullYear']
  later.date.getMonth = d[get + 'Month']
  later.date.getDate = d[get + 'Date']
  later.date.getDay = d[get + 'Day']
  later.date.getHour = d[get + 'Hours']
  later.date.getMin = d[get + 'Minutes']
  later.date.getSec = d[get + 'Seconds']

  // set the isUTC flag
  later.date.isUTC = timezone === false
}
