import * as d3 from 'd3'
import moment from 'moment'
import _ from 'lodash'

const { commaFormatterParam, decimalFormatterParam, int02FormatterParam } = window.sugo.liveScreenFormatter
let commaFormatter = d3.format(commaFormatterParam)
let decimalFormatter = d3.format(decimalFormatterParam)
let int02Formatter = _.flow(val => parseInt(val), d3.format(int02FormatterParam))

export const ISOTimeFormatStr = 'YYYY-MM-DDTHH:mm:ss.sss[Z]'
export const isISODateStr = str => {
  return moment(str, ISOTimeFormatStr, true).isValid()
}

function _metricValueFormatterFactory(format) {
  if (!format || format === 'none') {
    // 默认格式化规则，整数使用逗号，小数取两位
    return val => {
      return isISODateStr(val)
        ? moment(val).format('YYYY-MM-DD HH:mm:ss')
        : Number.isInteger(val) ? commaFormatter(val) : decimalFormatter(val)
    }
  }
  if (format === 'duration') {
    return val => {
      let d = moment.duration(val, 'seconds')
      let mmss = moment(0).add(d).utc().format('mm:ss')
      return `${int02Formatter(d.asHours())}:${mmss}`
    }
  }
  if (format === 'duration-complete') {
    return val => {
      let d = moment.duration(val, 'seconds')
      let hhmmss = moment(0).add(d).utc().format('HH 小时 mm 分 ss 秒')
      if (1 <= d.asYears()) {
        return `${d.years()} 年 ${d.months()} 月 ${d.days()} 天 ${hhmmss}`
      }
      if (1 <= d.asMonths()) {
        return `${d.months()} 月${d.days()} 天 ${hhmmss}`
      }
      if (1 <= d.asDays()) {
        return `${d.days()} 天 ${hhmmss}`
      }
      return hhmmss
    }
  }
  return d3.format(format)
}

const metricValueFormatterFactory = format => {
  const numFormatter = _metricValueFormatterFactory(format);
  return val => {
    if (val === '--' || _.isEmpty(val) && !_.isNumber(val)) {
      return '--'
    }
    return numFormatter(val)
  }
}

export default metricValueFormatterFactory

export const axisFormatterFactory = format => {
  if (!format || format === 'none' || _.startsWith(format, 'duration')) {
    return metricValueFormatterFactory(format)
  }
  return d3.format(format)
}
