import {parseISODate} from 'chronoshift'
import Expression from 'sugo-plywood'
import _ from 'lodash'
import moment from 'moment'

const START_OF_TIME = '1000'
const END_OF_TIME = '3000'

export function dateToIntervalPart(date) {
  return date.toISOString()
    .replace('.000Z', 'Z')
    .replace(':00Z', 'Z')
    .replace(':00Z', 'Z')
}

export function toDate(date) {
  if (date === null || typeof date === 'undefined')
    return null
  if (typeof date === 'string' || typeof date === 'number')
    date = parseISODate(date, Expression.defaultParserTimezone)
  if (!date.getDay)
    return null
  return date
}

/** 转换为druid查询的interval参数值 */
export function toInterval(params) {
  const intervals = params.split('/')

  let result = [START_OF_TIME, END_OF_TIME]
  if (intervals && intervals[0]) {
    let start = toDate(intervals[0])
    start = new Date(start.valueOf() + 1)
    result[0] = dateToIntervalPart(start)
  }
  if (intervals && intervals[1]) {
    let end = toDate(intervals[1])
    end = new Date(end.valueOf() + 1)
    result[1] = dateToIntervalPart(end)
  }
  return result.join('/')
}

export function luceneIntervalFormatToUtc(interval) {
  if (_.isArray(interval)) {
    let [from, to] = interval[0].split('/')
    return [`${moment(from).toISOString()}/${moment(to).toISOString()}`]
  }

  // is string
  let [from, to] = interval.split('/')
  return `${moment(from).toISOString()}/${moment(to).toISOString()}`
}
