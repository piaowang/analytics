import CutvCustomReport from '../services/cutv-custom-report.service'
import db from '../models'
import { Response } from '../utils/Response'
import { defineTypes, PropTypes } from '../../common/checker'
import _ from 'lodash'

const $checker = {
  list: defineTypes({
    datasource_id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['Android, IOS']),
    app_version: PropTypes.string,
    timeRange: PropTypes.array.isRequired,
    page: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired
  })
}

export default class CutvReportController {

  constructor() {
    this.cutvCustomReport = new CutvCustomReport()
  }

  async list(ctx) {
    const checked = $checker.list(ctx.q)
    if (!checked.success) {
      return ctx.body = Response.fail(checked.message)
    }
    let { timeRange, page, pageSize, sdk_type, app_version, datasource_id } = ctx.q
    if (sdk_type === 0) sdk_type = 'android'
    if(sdk_type === 1) sdk_type = 'Objective-C'

    let res0 = await this.cutvCustomReport.list({sdk_type, timeRange, page, pageSize, app_version, datasource_id})
    
    let sum = _.get(res0,'sum', [])
    const { total, android, ios } = await this.cutvCustomReport.countTotalDevice(datasource_id,sdk_type, app_version) 
    sum = sum.map( i => {
      i.weekLiveness = (i.sum_week_active * 100 / (Math.max(total, 1))).toFixed(2) + '%'
      i.monthLiveness = (i.sum_month_active * 100 / (Math.max(total, 1))).toFixed(2) + '%'
      i.androidmonthRetention = (i.sum_android_month_active * 100 / (Math.max(android, 1))).toFixed(2) + '%'
      i.androidTurnOnPerPeople = i.sum_android_turnon_distinct > 0 ? (i.sum_android_turnon / i.sum_android_turnon_distinct).toFixed(2) : (0).toFixed(2)
      i.iOSmonthRetention = (i.sum_ios_month_active * 100 / (Math.max(ios,1))).toFixed(2) + '%'
      i.iOSTurnOnPerPeople = i.sum_ios_turnon_distinct > 0 ? (i.sum_ios_turnon / i.sum_ios_turnon_distinct).toFixed(2) : (0).toFixed(2)
      return i
    })
    return ctx.body = Response.ok({total: _.get(res0,'total[0].count',0), sum})
  }
}

