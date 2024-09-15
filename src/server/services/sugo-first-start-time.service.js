import { BaseService } from './base.service'
import moment from 'moment'
import _ from 'lodash'
import db, { quoteIdentifiers } from '../models'

export default class FirstStartTimeService extends BaseService {
  static instance = null

  constructor() {
    /** @see {Model} */
    super('SugoFirstStartTime')
    this.instance = null
  }

  /**
   * @return {FirstStartTimeService}
   */
  static getInstance() {
    if (FirstStartTimeService.instance === null) {
      FirstStartTimeService.instance = new FirstStartTimeService()
    }
    return FirstStartTimeService.instance
  }

  async getFirstStartTime(params) {
    const { app_type, device_id, app_version, channel = '', project_id } = params
    const [[res]] = await db.client.query(
      `select * from ${quoteIdentifiers(`sugo_${project_id}`)}
      where app_type =:app_type and device_id =:device_id  limit 1`,
      {
        replacements: {
          app_type,
          device_id
        }
      })

    if (!_.isEmpty(res)) {
      if (res.app_version !== app_version) {
        await db.client.query(
          `update ${quoteIdentifiers(`sugo_${project_id}`)}
          set app_version =:app_version
          where app_type =:app_type and device_id =:device_id`,
          {
            replacements: {
              app_version,
              app_type,
              device_id
            }
          }
        )
      }
      return { isFirstStart: false, firstStartTime: moment(res.start_time) + 0 }
    }
    const now = new Date()
    await db.client.query(
      `insert into ${quoteIdentifiers(`sugo_${project_id}`)}(app_type,device_id,app_version, channel, start_time)
      values(:app_type, :device_id, :app_version, :channel, :now)`,
      {
        replacements: {
          app_version,
          app_type,
          device_id,
          channel,
          now
        }
      })
    return { isFirstStart: true, firstStartTime: now }
  }

  async getDeviceCountByDatasourseName(dsNames, date = '' ) {
    let res = []
    for (let i = 0; i < dsNames.length; i++) {
      try {
        const [count] = await db.client.query(`select count(1) as count, app_type, ${quoteIdentifiers(`${dsNames[i]}`)} as datasource_name from ${quoteIdentifiers(`sugo_${dsNames[i]}`)} where start_time < ${quoteIdentifiers(`${date}`)} group by app_type`)
        res = res.concat(count)
      } catch (error) {
      }
    }
    return res
  }
}
