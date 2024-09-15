import { BaseService } from './base.service'
import _ from 'lodash'
import db, { quoteIdentifiers } from '../models'
import moment from 'moment'

/**
 * @description 巡检员service
 * @export
 * @class InspectorService
 * @extends {BaseService}
 */
export default class CutvCustomReport extends BaseService {

  constructor() {
    super('CutvCustomReport')
  }

  async list(query) {
    const {
      datasource_id,
      timeRange: [since, until],
      page,
      pageSize
    } = query
    const params = ['sdk_type', 'app_version']
    let condition1 = ''
    params.map(i => {
      if(query[i]) {
        condition1 += `AND ${i}='${query[i]}' `
      }
    })

    //累计启动数需要非去重的
    const sql = `CREATE TEMP TABLE t_tmp1(datasource_id VARCHAR,event_name VARCHAR,sdk_type VARCHAR,app_version VARCHAR, count_date timestamp with time zone,device_count INT, device_count_distinct INT,  month_active INT, week_active INT) ON COMMIT DROP;
    INSERT INTO t_tmp1 SELECT datasource_id, event_name, sdk_type, app_version, count_date, device_count, device_count_distinct, month_active, week_active
    FROM cutv_custom_report 
    WHERE datasource_id='${datasource_id}' AND count_date>='${moment(since).toISOString()}' AND count_date<='${moment(until).toISOString()}';

    SELECT sum_turnon_table.count_date, sum_turnon_table.sum_turnon, week_active_table.sum_week_active, month_active_table.sum_month_active, sum_register_table.sum_register, sum_android_turnon_table.sum_android_turnon, sum_ios_turnon_table.sum_ios_turnon, sum_ios_turnon_distinct_table.sum_ios_turnon_distinct, sum_android_turnon_distinct_table.sum_android_turnon_distinct, sum_ios_month_active_table.sum_ios_month_active, sum_android_month_active_table.sum_android_month_active, sum_android_week_active_table.sum_android_week_active,sum_ios_week_active_table.sum_ios_week_active FROM
    (SELECT count_date, SUM(device_count) AS sum_turnon FROM t_tmp1
    WHERE event_name='启动' ${condition1}
    GROUP BY count_date) sum_turnon_table
    LEFT JOIN
    (SELECT count_date, SUM(week_active) AS sum_week_active FROM t_tmp1
    WHERE event_name='启动' ${condition1}
    GROUP BY count_date) week_active_table
    ON sum_turnon_table.count_date=week_active_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(month_active) AS sum_month_active FROM t_tmp1
    WHERE event_name='启动' ${condition1}
    GROUP BY count_date) month_active_table
    ON sum_turnon_table.count_date=month_active_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count) AS sum_register FROM t_tmp1
    WHERE event_name='首次安装' ${condition1}
    GROUP BY count_date) sum_register_table
    ON sum_register_table.count_date=sum_turnon_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count) AS sum_android_turnon FROM t_tmp1
    WHERE sdk_type='android' AND event_name='启动'
    GROUP BY count_date) sum_android_turnon_table
    ON sum_turnon_table.count_date=sum_android_turnon_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(month_active) AS sum_android_month_active FROM t_tmp1
    WHERE sdk_type='android' AND event_name='启动'
    GROUP BY count_date) sum_android_month_active_table
    ON sum_turnon_table.count_date=sum_android_month_active_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(week_active) AS sum_android_week_active FROM t_tmp1 
    WHERE sdk_type='android' AND event_name='启动'
    GROUP BY count_date) sum_android_week_active_table
    ON sum_turnon_table.count_date=sum_android_week_active_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count_distinct) AS sum_android_turnon_distinct FROM t_tmp1
    WHERE sdk_type='android' AND event_name='启动'
    GROUP BY count_date) sum_android_turnon_distinct_table
    ON sum_turnon_table.count_date=sum_android_turnon_distinct_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count) AS sum_ios_turnon FROM t_tmp1 
    WHERE sdk_type='Objective-C' AND event_name='启动'
    GROUP BY count_date) sum_ios_turnon_table
    ON sum_turnon_table.count_date=sum_ios_turnon_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(month_active) AS sum_ios_month_active FROM t_tmp1 
    WHERE sdk_type='Objective-C' AND event_name='启动'
    GROUP BY count_date) sum_ios_month_active_table
    ON sum_turnon_table.count_date=sum_ios_month_active_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(week_active) AS sum_ios_week_active FROM t_tmp1 
    WHERE sdk_type='Objective-C' AND event_name='启动'
    GROUP BY count_date) sum_ios_week_active_table
    ON sum_turnon_table.count_date=sum_ios_week_active_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count_distinct) AS sum_ios_turnon_distinct FROM t_tmp1 
    WHERE sdk_type='Objective-C' AND event_name='启动'
    GROUP BY count_date) sum_ios_turnon_distinct_table
    ON sum_turnon_table.count_date=sum_ios_turnon_distinct_table.count_date
    ORDER BY sum_turnon_table.count_date DESC
    LIMIT ${pageSize} offSet ${pageSize * (page - 1)}`

    const count = `CREATE TEMP TABLE t_tmp1(datasource_id VARCHAR,event_name VARCHAR,sdk_type VARCHAR,app_version VARCHAR,count_date DATE,device_count INT, device_count_distinct INT, month_active INT, week_active INT) ON COMMIT DROP;
    INSERT INTO t_tmp1 SELECT datasource_id, event_name, sdk_type, app_version, count_date, device_count, device_count_distinct, month_active, week_active
    FROM cutv_custom_report 
    WHERE datasource_id='${datasource_id}' AND count_date>='${moment(since).toISOString()}' AND count_date<='${moment(until).toISOString()}';

    SELECT count(sum_turnon_table.count_date) FROM
    (SELECT count_date, SUM(device_count) AS sum_turnon FROM t_tmp1
    WHERE event_name='启动' ${condition1}
    GROUP BY count_date) sum_turnon_table
    LEFT JOIN
    (SELECT count_date, SUM(device_count) AS sum_register FROM t_tmp1
    WHERE event_name='首次安装' ${condition1}
    GROUP BY count_date) sum_register_table
    ON sum_register_table.count_date=sum_turnon_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count) AS sum_android_turnon FROM t_tmp1
    WHERE sdk_type='android' AND event_name='启动'
    GROUP BY count_date) sum_android_turnon_table
    ON sum_turnon_table.count_date=sum_android_turnon_table.count_date
    LEFT JOIN
    (SELECT count_date, SUM(device_count) AS sum_ios_turnon FROM t_tmp1 
    WHERE sdk_type='Objective-C' AND event_name='启动'
    GROUP BY count_date) sum_ios_turnon_table
    ON sum_turnon_table.count_date=sum_ios_turnon_table.count_date`
    const sum = await db.client.query(sql)
    const total = await db.client.query(count)
    return {
      sum:sum[0],
      total: total[0]
    }
  }

  async countTotalDevice(datasource_id,sdk_type, app_version) {
    const projectId = await db.SugoProjects.findOne({
      where: {
        datasource_id
      },
      attributes: ['id', 'datasource_name'],
      raw: true
    })
    const appId = await db.SugoDataAnalysis.findAll({
      where: {
        project_id: projectId.id,
        access_type: {
          $or: [0,1]
        }
      },
      attributes: ['id', 'access_type'],
      raw: true
    })

    let androidWhere = ''
    let iosWhere = ''
    appId.map( i => {
      if (i.access_type === 0) androidWhere = 'app_type=\'1\''
      if (i.access_type === 1) iosWhere = 'app_type=\'2\''
    })

    let totalWhere = ''
    if (sdk_type === 'android') totalWhere += `WHERE ${androidWhere}`
    if (sdk_type === 'Objective-C') totalWhere += `WHERE ${iosWhere}`
    if (app_version) totalWhere += ` AND app_version='${app_version}'`
    const tableName = quoteIdentifiers(`sugo_${projectId.datasource_name}`)
    const sql = `SELECT android_count, ios_count, total_count  FROM (
    (SELECT count(device_id) AS android_count FROM ${tableName} WHERE ${quoteIdentifiers(`${androidWhere}`)}) a
    CROSS JOIN (SELECT count(device_id) AS ios_count FROM ${tableName} WHERE ${quoteIdentifiers(`${iosWhere}`)}) b 
    CROSS JOIN (SELECT count(device_id) AS total_count FROM ${tableName} ${quoteIdentifiers(`${totalWhere}`)}) c )`
    let res = await db.client.query(sql)
    const { android_count, ios_count, total_count } = res[0][0]
    return {
      total: total_count,
      android: android_count,
      ios: ios_count
    }
  }
}
