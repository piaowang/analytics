import _ from 'lodash'
import { log, err } from '../utils/log'
import DruidQueryService from './druid-query.service'
import RedisSchedule from './redis-schedule.service'
import MonitorAlarmsService from './sugo-monitor-alarms.service'
import MonitorAlarmsExceptionsService from './sugo-monitor-alarms-exceptions.service'
import db from '../models'
import {SUGO_ALARMS_API_KEYS, ALARM_UNUSUAL_RULES} from '../../common/constants'

/**
 * 定时调度任务的执行内容处理服务层（执行任务声明文件）
 */
export default class ScheduleJobService {

  constructor() {
    this.redisSchedule = new RedisSchedule({prefix: 'sugo:monitor-alarms:scheduler'})
  }

  static getInstance() {
    if(!this._instance) {
      this._instance = new ScheduleJobService()
    }
    return this._instance
  }

  getNotifyModeByAlarmType = async (alarmType) => {
    let { curInterface: curInterfaceId, curTemplate: curTemplateId } = alarmType || {}
    if (curTemplateId) {
      let template = await db.SugoAlarmNotifyTemplates.findOne({ where: { id: curTemplateId }, raw: true })
      if (template) {
        curInterfaceId = template.interface_id
      }
    }
    let buildInIntf = _.find(_.values(SUGO_ALARMS_API_KEYS), {id: curInterfaceId})
    if (buildInIntf) {
      return buildInIntf.name
    }
    let intf = await db.SugoAlarmInterfaces.findOne({ where: { id: curInterfaceId }, raw: true })
    return intf && intf.name || '未知告警方式'
  }

  /**
   * 监控任务回调-执行检测功能
   */
  monitorAlarms = async (params) => {
    if (!params || !_.get(params, 'data.id')) {
      return
    }
    const monitorAlarmsService = MonitorAlarmsService.getInstance()
    const alarmsExceptionsService = MonitorAlarmsExceptionsService.getInstance()
    let { counter, data: monitor } = params
    
    // 从数据库中取得最新的数据，避免多进程导致的状态不一致问题
    monitor = await monitorAlarmsService.findOne({id: monitor.id}, {raw: true})
    if (!monitor) {
      await monitorAlarmsService.cancelMonitorJob(params.monitor)
      return
    }
    const {
      name,
      query_params,
      metric_rules: { metric, rules },
      status,
      alarm_rule
    } = monitor

    // 暂停中的不做检查
    if (!status) {
      await monitorAlarmsService.cancelMonitorJob(monitor)
      return
    }
    log(counter,'开始检查告警任务 => ', monitor.project_name, name)
    // 查询druid获取满足过滤条件的最新阀值（去除缓存）
    const res = await DruidQueryService.queryByExpression(query_params)
    const checkTime = new Date() // 查询 druid 后再记录检测时间，避免由于队列引起的延迟，而导致检测时间不精确
    if (_.isEmpty(res)) { // 获取数据失败的终止检查
      err('监控告警获取数据失败：', monitor.project_name, monitor.name, res)
      return
    }
    const [ { [metric]: dbThreshold = 0 } ] = res
    
    // 是否发生异常
    let unusualRules = _(rules)
      .map(rule => {
        let {operator, threshold, thresholdEnd} = rule
        return MonitorAlarmsService.compareRule(dbThreshold, operator, threshold, thresholdEnd) ? rule : null
      })
      .compact()
      .value()

    let unusual = _.some(unusualRules)

    let updateData = {
      // 上次检测时间
      prev_monitor_time: checkTime,
      // 上次检测结果: 1=正常；0=异常
      prev_monitor_result: unusual ? 0 : 1
    }
    // 发生异常时，更新异常次数
    if (unusual) {
      // 更新检测次数
      counter = await this.redisSchedule.updateJobCounter(monitor.id)
      // 设置异常次数
      updateData.check_counter = counter
    }

    // 恢复正常则重置异常计数次数为0
    if (!unusual && monitor.prev_monitor_result === 0 /* 异常 */) {
      // 恢复正常时重置异常次数为零
      updateData.check_counter = 0
      updateData.prev_monitor_result = 1 // 正常
      updateData.prev_monitor_time = new Date()
    }
    // 更新告警记录
    await monitorAlarmsService.update(updateData, { id: monitor.id })

    let shouldNotify = unusual && (
      (alarm_rule === ALARM_UNUSUAL_RULES[0].key && monitorAlarmsService.isFibonacci(counter))
      || alarm_rule === ALARM_UNUSUAL_RULES[1].key
      || (alarm_rule === ALARM_UNUSUAL_RULES[2].key && counter === 1)
    )

    // 创建异常记录
    let createdException
    try {
      // 发生异常写入异常历史记录
      if (shouldNotify) {
        createdException = await alarmsExceptionsService.createAlarmExceptions({alarmState: []}, monitor, dbThreshold, checkTime, counter)
      }
    } catch(e) {
      err('监控告警检查错误：', monitor.project_name, monitor.name)
      err(e.stack)
    }
    
    // 发送告警通知，不等待其结束，尽快关闭 redis 锁，避免影响后续任务
    this.doNotify(unusual, counter, monitor, dbThreshold, createdException)
  }

  async doNotify(unusual, counter, monitor, dbThreshold, createdException) {
    const monitorAlarmsService = MonitorAlarmsService.getInstance()
    let now = new Date()
    let alarmStatus = {
      time: now,
      alarmState: await Promise.all((monitor.alarm_types || []).map(async t => ({
        time: now,
        state: false,
        notify_mode: await this.getNotifyModeByAlarmType(t)
      })))
    }
    try {
      /**
       * alarmState: {
       *    time: //通知时间
       *    alarm_recovery: true/false, // 是否恢复正常通知
       *    alarmStatus: [{ time, state, notify_mode }] // 通知状态
       * }
       */
      let res = await monitorAlarmsService.sendMonitorAlarmsNodify(unusual, counter, monitor, dbThreshold)
      if (res) {
        alarmStatus = res
      }
    } catch (e) {
      err('告警通知异常：', monitor.project_name, monitor.name)
      err(e.stack)
    } finally {
      // 发送完短信后再修改异常的发送信息，避免太久不产生异常，影响大屏效果
      if (createdException) {
        createdException.notify_status = alarmStatus.alarmState
        createdException.alarm_notify_time = alarmStatus.time
        await createdException.save()
      }
    }
  }
}
