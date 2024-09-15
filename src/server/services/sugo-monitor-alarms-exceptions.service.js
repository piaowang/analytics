import { BaseService } from './base.service'
import SugoMonitorAlarmsService from './sugo-monitor-alarms.service'
import {MetricRulesAlarmLevelTranslation} from '../../common/constants'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'

/**
 * 监控告警异常记录服务层-CRUD
 */
export default class SugoMonitorAlarmsExceptionsService extends BaseService {

  constructor() {
    super('SugoMonitorAlarmsExceptions')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoMonitorAlarmsExceptionsService()
    }
    return this._instance
  }

  /**
   * 写入异常告警记录
   * @param {*} alarmStatus: {
   *    time: //通知时间
   *    alarm_recovery: true/false,
   *    alarmStatus: [{ time, state, notify_mode }]
   * }
   * @param {*} monitor
   * @param {*} dbThreshold
   * @param {*} now
   */
  createAlarmExceptions = async (alarmStatus, monitor, dbThreshold, detection_time, counter) => {
    const { metric_rules: { title, rules }  }  = monitor
    let {operator, threshold, thresholdEnd, level} = SugoMonitorAlarmsService.findMaxLevelAlarmRule(dbThreshold, rules)
    const op = {
      greaterThan: '大于',
      lessThan: '小于',
      between: '介于',
      exclude: '排除'
    }
    let endVal = ''
    if (thresholdEnd) {
      endVal = '~' + thresholdEnd
    }
    return await this.create({
      monitor_id: monitor.id,
      monitor_name: monitor.name,
      /* 通知状态
      * notify_status: {
      *    alarm_recovery: true/false,
      *    alarmStatus: [{ time, state, notify_mode }]
      * }
      */
      notify_status: alarmStatus.alarmState,
      // 异常检测时间
      detection_time,
      // 告警通知时间
      alarm_notify_time: alarmStatus.time,
      //异常告警值: 指标别名 > 阀值
      trigger_rules: `${title}【${dbThreshold}】 ${op[operator]} ${threshold}${endVal}`,
      // 告警等级
      alarm_level: level || 'warning',
      company_id: monitor.company_id,
      // 当前检测次数
      check_counter: counter,
      created_at: new Date()
    })
  }
}

//通过扩展module扩展之
moduleExtend(__filename)
