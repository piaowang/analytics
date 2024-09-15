import { log } from '../utils/log'
import {checkColumnExists} from '../utils/db-utils'

export default async db => {
  // 插入 处理信息, query_params 到监控告警表，query_params 是当时触发告警的条件
  // 插入 部门 到联系人表
  /*
  handle_info: JSONB
  {
    handleState: 'unhandled' // unhandled, handling, ignored, handled
    remark: '',
    extraAlarmTypes: [
     {
        curInterface: '', // 告警接口ID (通知模版?)
        receivers: []     // 接收人ID
      }
    ]
  }
   */

  const version = '0.18.3'
  const sqlAddHandleInfo = 'ALTER TABLE public.sugo_monitor_alarms_histories ADD handle_info JSONB DEFAULT \'{}\' NULL;'
  const sqlAddQueryParams = 'ALTER TABLE public.sugo_monitor_alarms_histories ADD query_params JSONB DEFAULT \'{}\' NULL;'
  const sqlAddDepartmentIdFk = 'ALTER TABLE public.sugo_contacts ADD department_id VARCHAR(32) DEFAULT NULL NULL;'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    // 插入 处理信息 到监控告警表
    let existsHandleInfo = await checkColumnExists(db, t, 'sugo_monitor_alarms_histories', 'handle_info')
    if (!existsHandleInfo) {
      await db.client.query(sqlAddHandleInfo, { type: db.client.QueryTypes.RAW, transaction: t })
      log('add column \'handle_info\' done')
    }

    // 插入 当前查询条件 到监控告警表
    let existsQueryParams = await checkColumnExists(db, t, 'sugo_monitor_alarms_histories', 'query_params')
    if (!existsQueryParams) {
      await db.client.query(sqlAddQueryParams, { type: db.client.QueryTypes.RAW, transaction: t })

      // 填充告警表的 query_params 字段
      let allExceptions = await db.SugoMonitorAlarmsExceptions.findAll({
        include: [{
          model: db.SugoMonitorAlarms,
          attributes: ['id', 'query_params']
        }],
        transaction: t
      })
      let ps = allExceptions.map(exc => {
        exc.query_params = exc.SugoMonitorAlarm.query_params
        return exc.save({transaction: t})
      })
      await Promise.all(ps)
      log('add column \'query_params\' done')
    }

    // 插入 部门Id 到联系人表
    let exists = await checkColumnExists(db, t, 'sugo_contacts', 'department_id')
    if (!exists) {
      await db.client.query(sqlAddDepartmentIdFk, { type: db.client.QueryTypes.RAW, transaction: t })
      log('add column \'department_id\' done')
    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })

    log(`update ${version} done`)
  })
}
