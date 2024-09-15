import _ from 'lodash'
import moment from 'moment'
import { log, err } from '../utils/log'
import { BaseService } from './base.service'
import SugoAlarmNotifyTemplate from './sugo-alarm-notify-template'
import RedisSchedule from './redis-schedule.service'
import FetchKit from '../utils/fetch-kit'
import {
  SUGO_ALARMS_API_KEYS, ALARM_UNUSUAL_RULES, MetricRulesAlarmLevelEnum,
  MetricRulesAlarmLevelTranslation, dateOptionsGen, DEFAULT_TEMPLATES
} from '../../common/constants'
import ContactService from './contact.service'
import {mapAwaitAll, toQueryParams, immutateUpdate} from '../../common/sugo-utils'
import SugoAlarmInterfaceService from './sugo-alarm-interface.service'
import { sendMail } from '../utils/email'
import { sendMsg } from '../utils/msg'
import db from '../models'
import DruidColumnType, { isCharDimension, isNumberDimension, isTimeDimension } from '../../common/druid-column-type'
import {convertDateType, isRelative} from '../../common/param-transform'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'
import {sendWechatMsg} from './wechat.service'
import shell from 'shelljs'

const timeout = 15 * 1000

/**
 *
 * @param {{users: [], parties: [], tags: []}} toWho
 * @param {string} content
 * @returns {Promise<*>}
 */
async function sendWechat(toWho, content) {
  try {
    return sendWechatMsg(toWho, content, timeout)
  } catch (e) {
    return null
  }
}

/**
 * 告警告警服务层
 */
export default class SugoMonitorAlarmsService extends BaseService {

  constructor() {
    super('SugoMonitorAlarms')
    this.redisSchedule = new RedisSchedule({prefix: 'sugo:monitor-alarms:scheduler'})
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoMonitorAlarmsService()
    }
    return this._instance
  }

  /**
   * 创建告警定时任务，并启动任务
   * @param monitor 告警记录
   * @returns {Promise<void>}
   */
  addMonitorJob = async (monitor) => {
    if (!monitor) return
    log('start monitor => ', monitor.name || monitor.id)
    const { time_rules } = monitor
    // cron:
    // 0 */n * * * * // 每隔n分钟
    // 0 0 */ * * *  // 每隔n小时
    await this.redisSchedule.addJob(monitor.id, {
      every: `${time_rules.time} ${time_rules.unit}`,
      // every: '20 seconds',
      // path: './scheduler-job.service',
      func: 'monitorAlarms',
      data: monitor,
      counter: monitor.check_counter || 0
    })
  }

  /**
   * 停止告警定时任务
   * @param monitor 告警记录
   * @returns {Promise<void>}
   */
  cancelMonitorJob = async (monitor) => {
    if (!monitor) return
    log('stop monitor => ', monitor.name || monitor.id)
    await this.redisSchedule.cancelJob(monitor.id)
  }

  /**
   * 暂停、启动监控告警
   * @param {any} obj
   * @param {any} where 
   * @returns 
   * @memberof SugoMonitorAlarmsService
   */
  changeMonitor = async (obj, where) => {
    try {
      let updateData = { status: obj.status }
      if (obj.status) {
        // 重启后第一次启动需要将计数重置为0
        const check_counter = 0
        // 重置数据库中的告警记录
        updateData.check_counter = check_counter
        updateData.prev_monitor_result = null
        updateData.prev_monitor_time = null
        // 重置缓存中的告警记录
        obj.check_counter = check_counter
        obj.prev_monitor_result = null
        obj.prev_monitor_time = null
        await this.addMonitorJob(obj)
      } else {
        await this.cancelMonitorJob(obj)
      }
      // 更新告警状态和异常次数
      return this.update(updateData, where)
    } catch (e) {
      const opt = obj.status ? '启动' : '暂停'
      throw new Error(`${opt}监控告警失败：${ e.message}`)
    }
  }

  /**
   * 程序启动时初始化所有状态为[监控中]的定时监控任务
   * @memberOf SugoMonitorAlarmsService
   */
  initMonitor = async () => {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    // 清理历史缓存中的配置
    await this.redisSchedule.clearJobs()
    log('初始化监控告警定时任务')
    const res = await this.findAll()
    process.nextTick( async () => {
      for (const obj of res) {
        const monitor = obj.get({ plain: true })
        if (monitor.status) {
          await this.addMonitorJob(monitor)
        }
      }
    })
  }

  isPerfectSquare = (n) => {
    return n > 0 && Math.sqrt(n) % 1 === 0
  }

  /**
   * 判断是否为斐波那契数列
   * @param {*} n
   */
  isFibonacci = (n) => {
    const res = 5 * n * n
    return n > 0 && (this.isPerfectSquare(res + 4) || this.isPerfectSquare(res - 4))
  }

  /**
   * 比较告警阀值是否符合设定规则
   * @param {*} dbThreshold
   * @param {*} operator 
   * @param {*} threshold 
   * @param {*} thresholdEnd
   */
  static compareRule = (dbThreshold, operator, threshold, thresholdEnd) => {
    let unusual = false
    if ('greaterThan' === operator) { // >
      unusual = dbThreshold > threshold
    } else if ('lessThan' === operator) { // <
      unusual = dbThreshold < threshold
    } else if ('between' === operator) { // in
      unusual = dbThreshold >= threshold && dbThreshold <= thresholdEnd
    } else if ('exclude' === operator) { // not in
      unusual = !(dbThreshold >= threshold && dbThreshold <= thresholdEnd)
    }
    return unusual
  }

  /**
   * 发送自定义接口消息通知
   * @param {*} unusual 告警阀值状态（true=异常，false=正常)
   * @param {*} curInterface 当前自定义接口记录
   * @param {*} monitor 监控告警记录
   * @return { time, state, notify_mode }
   */
  sendApiNodify = async (unusual, curInterface, monitor, globalParams, curReceivers) => {
    const { method, type, url, content_type, params, error_template, normal_template } = curInterface

    const tmpl = unusual ? error_template : normal_template
    // 接口类型：0=邮件;1=短信
    const contacts = curReceivers.map(r => r[Number(type) === 0 ? 'email' : 'phone'])
    const content = _.template(tmpl)(globalParams)

    if (+type === SUGO_ALARMS_API_KEYS.SHELL.type) {
      return await this.shellNodify(curInterface, curReceivers, content, params)
    }

    let body = _.reduce(params, (result, value, key) => {
      if (value.val === '${contacts}') {
        result[value.key] = contacts.join(',')
      } else if (value.val === '${content}') {
        result[value.key] = content
      } else {
        result[value.key] = value.val
      }
      return result
    }, {})
    
    let options = { method }
    if (method.toLowerCase() === 'post') {
      options.headers = {
        'Content-Type': `application/${content_type}`
        // 'Accept': 'application/json'
      }
    }
    let result = {
      time: new Date(),
      state: false,
      notify_mode: curInterface.type
    }
    try {
      debug('告警-API请求URL: ', url)
      debug('告警-API请求headers: ', JSON.stringify(options, null, 2))
      debug('告警-API请求参数: ', JSON.stringify(body, null, 2))
      if (content_type === 'x-www-form-urlencoded') {
        body = toQueryParams(body)
      }
      const res = await FetchKit[method.toLowerCase()](url, body, options)
      result.state = true
      log('告警-API请求结果: ', res)
      return result
    } catch (e) {
      result.state = false
      err('告警-API请求错误: ', curInterface.name, monitor.name)
      err(e.stack)
      return result
    }
  }

  static findMaxLevelAlarmRule(dbThreshold, rules) {
    return _(rules)
      .map(rule => {
        let {operator, threshold, thresholdEnd} = rule
        return SugoMonitorAlarmsService.compareRule(dbThreshold, operator, threshold, thresholdEnd) ? rule : null
      })
      .compact()
      .maxBy(rule => MetricRulesAlarmLevelEnum[rule.level || 'warning']) || rules[0]
  }

  async translateFilter(flt, dicts) {
    let {col, op, eq} = flt
    let eqs = _.compact(_.isArray(eq) ? eq : [eq])
    if (op === 'or' || op === 'and' || op === 'not') {
      return await this.translateFilters(eqs.map(subFlt => ({...flt, ...subFlt})), dicts)
    }
    let {dimNameDict} = dicts
    let dbDim = _.get(dimNameDict, col) || {name: col, type: DruidColumnType.String}
    if (isCharDimension(dbDim)) {
      return `${dbDim.title || col} ${op === 'in' || op === 'contains' ? '包含' : '不包含'} ${eqs.join('、')}`
    } else if (isNumberDimension(dbDim)) {
      return `${dbDim.title || col} ${op === 'in' ? '介于' : '排除'} [${eqs[0]}, ${eqs[1]})`
    } else if (isTimeDimension(dbDim)) {
      let relativeTime = isRelative(eq) ? eq : 'custom'
      if (relativeTime === 'custom') {
        let [since, until] = relativeTime === 'custom' ? eq : convertDateType(relativeTime, 'iso')
        return `${dbDim.title || col} ${op === 'in' ? '介于' : '排除'} ${since} ~ ${until}`
      } else {
        let buildTitle = (dateType) => {
          const units = {
            years: '年',
            months: '月',
            weeks: '周',
            days: '天',
            hours: '小时',
            minutes: '分钟',
            seconds: '秒',
            quarter: '季度'
          }
          //convert '6 days' => [6, 'days']
          let split = dateType.split(' ')
          let arr = [Number(split[0]), split[1]]
          return `最近${Math.abs(arr[0])}${units[arr[1]] || '天'}`
        }
        let {exact} = dateOptionsGen()
        let exactDateOption = _.find(exact, {dateType: eq})
        let title = exactDateOption && exactDateOption.title || buildTitle(eq)
        return `${dbDim.title || col} ${op === 'in' ? '介于' : '排除'} ${title}（${moment().format('YYYY-MM-DD')}）`
      }
    } else {
      debug('未知维度类型: ' + col)
      return ''
    }
  }

  /**
   * 将筛选条件翻译成中文
   * @param filters
   * @param dicts
   */
  async translateFilters(filters, dicts = {}) {
    if (_.isEmpty(dicts.dimNameDict)) {
      let dbDims = await db.SugoDimensions.findAll({
        where: {
          parentId: dicts.dataSourceId
        },
        raw: true
      })
      dicts = {...dicts, dimNameDict: _.keyBy(dbDims, 'name')}
    }
    let arr = await mapAwaitAll(filters, flt => this.translateFilter(flt, dicts))
    return arr.filter(_.identity).join('，')
  }

  /**
   * 执行发送通知
   * @param {*} unusual 告警阀值状态（true=异常，false=正常)
   * @param {*} monitor 监控告警记录
   * @param {*} dbThreshold 查询的实时指标值
   * @return [{ time, state, notify_mode }]
   */
  doSendNotify = async (unusual, monitor, dbThreshold) => {
    const { metric_rules: { title, rules }, alarm_types, query_params, project_name, name, failureTimeOverwrite } = monitor
    let {operator, threshold, thresholdEnd, level} = SugoMonitorAlarmsService.findMaxLevelAlarmRule(dbThreshold, rules)

    // 准备 db 数据
    const receiverIds = _.flatMap(alarm_types, o => o.receivers)
    const templateIds = alarm_types.map(o => o.curTemplate)
    const recvDepartmentIds = alarm_types.filter(o => _.isEmpty(o.receivers)).map(o => o.receiverDepartment)

    if (!monitor.project_id) {
      throw new Error('Missing project_id in monitor')
    }
    let dbProject = await db.SugoProjects.findOne({where: {id: monitor.project_id}})

    let notifyTemplates = await SugoAlarmNotifyTemplate.getInstance().findAll({
      id: { $in : templateIds }
    }, {raw: true})

    const interfaceIds = _.compact([...alarm_types.map(o => o.curInterface), ...notifyTemplates.map(te => te.interface_id)])

    const receivers = await ContactService.queryMany({
      $or: [
        {id: { $in: receiverIds }},
        {department_id: { $in: recvDepartmentIds }}
      ]
    }, {raw: true})

    const interfaces = await SugoAlarmInterfaceService.getInstance().findAll({
      id: { $in: interfaceIds }
    }, {raw: true})

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
    const params = {
      projectName: project_name,
      monitorName: name,
      failureTime: moment(failureTimeOverwrite || undefined).format('YYYY年MM月DD日 HH时mm分ss秒'),
      rules: `${title}: [${dbThreshold}] ${op[operator]} ${threshold}${endVal}`,
      filter: await this.translateFilters(_.get(query_params, 'filters') || [], {
        dataSourceId: dbProject.datasource_id,
        projectId: monitor.project_id
      }),
      level: MetricRulesAlarmLevelTranslation[level || 'warning']
    }

    let resutls = []
    // alarm_types: [{"receivers": ["HkBO_vrOZ"], "curInterface": "SkYB1nKOW"}]
    for (const type of alarm_types) {
      let result = {
        time: new Date(),
        state: false
      }
      let {
        curInterface: curInterfaceId,
        receivers: curReceiverIds,
        curTemplate: curTemplateId,
        receiverDepartment: receiverDepartmentId,
        error_template,
        normal_template,
        tempInterface
      } = type

      let dbTemplate = _.find(notifyTemplates, {id: curTemplateId}) || DEFAULT_TEMPLATES
      if (dbTemplate.interface_id) {
        curInterfaceId = dbTemplate.interface_id
      }
      // 优先使用自定义的模版
      if (!error_template) {
        error_template = dbTemplate.error_template
      }
      if (!normal_template) {
        normal_template = dbTemplate.normal_template
      }
      const curReceivers = _.isEmpty(curReceiverIds)
        ? receivers.filter(r => r.department_id === receiverDepartmentId)
        : receivers.filter(r => curReceiverIds.includes(r.id))
      if (curInterfaceId === SUGO_ALARMS_API_KEYS.EMAIL.id) { // 平台短信发送接口
        const emailSubject = `日志平台-监控告警【${name}】${unusual ? '异常':'恢复正常'}通知`
        const emails = curReceivers.map(rec => rec.email).join(',')
        const res = await sendMail({
          ToAddress: emails,
          Subject: emailSubject,
          HtmlBody: _.template(unusual ? error_template.replace(/\n/g, '<br/>') : normal_template.replace(/\n/g, '<br/>'))(params)
        })
        result.notify_mode = SUGO_ALARMS_API_KEYS.EMAIL.name
        if (!res.Code) {
          result.state = true // 发送成功
          result.time = new Date() // 发送时间
        }
      } else if (curInterfaceId === SUGO_ALARMS_API_KEYS.SMS.id) { // 平台邮件发送接口
        const phones = curReceivers.map(rec => rec.phone).join(',')
        // config.js配置的模板id对应的key
        const tmpl = unusual ? 'errorAlarms' : 'normalAlarms'
        const res = await sendMsg(phones, tmpl, params)
        result.notify_mode = SUGO_ALARMS_API_KEYS.SMS.name
        if (!res.errcode) {
          result.state = true
          result.time = new Date()
        }
      } else if (curInterfaceId === SUGO_ALARMS_API_KEYS.WECHAT.id) { // 微信发送接口
        // config.js配置的模板id对应的key
        let content = _.template(unusual ? error_template : normal_template)(params)
        const res = await sendWechat(_.isEmpty(receiverIds) ? {parties: [receiverDepartmentId]} : {users: curReceiverIds}, content)
        result.notify_mode = SUGO_ALARMS_API_KEYS.WECHAT.name
        if (res && !res.errcode) {
          result.state = true
          result.time = new Date()
        }
      } else {
        // 自定义接口发送，暂不支持自定义通知模版
        let curInterface = curInterfaceId === 'temp' ? tempInterface : _.find(interfaces, {id: curInterfaceId})
        if (!curInterface) {
          continue
        }
        // 优先使用自定义的模版
        if (error_template) {
          curInterface = immutateUpdate(curInterface, 'error_template', () => error_template)
        }
        if (normal_template) {
          curInterface = immutateUpdate(curInterface, 'normal_template', () => normal_template)
        }
        result = await this.sendApiNodify(unusual, curInterface, monitor, params, curReceivers)
      }
      resutls.push(result)
    }
    return resutls
  }

  /**
   * 发送监控告警通知
   * @param {*} unusual 告警阀值状态（true=异常，false=正常)
   * @param {*} monitor 监控告警记录
   * @param {*} dbThreshold 查询的实时指标值
   * @return {
   *    time: //通知时间
   *    alarm_recovery: true/false,
   *    alarmStatus: [{ time, state, notify_mode }]
   * }
   */
  sendMonitorAlarmsNodify = async (unusual, counter, monitor, dbThreshold) => {
    const { alarm_rule, alarm_recovery, prev_monitor_result } = monitor
    let result = {}
    if (!unusual) {
      // alarm_recovery: true=设置了恢复正常发送通知；false=未设置正常通知
      // prev_monitor_result: 0=异常；1=正常
      // 只要检测正常且上次为异常就重置异常次数
      if (prev_monitor_result === 0) {
        // 重置缓存中告警记录
        await this.redisSchedule.updateJobProps(monitor.id, 'data.prev_monitor_result', 1)
        await this.redisSchedule.updateJobProps(monitor.id, 'data.prev_monitor_time', new Date())
        await this.redisSchedule.updateJobProps(monitor.id, 'data.check_counter', 0)
        await this.redisSchedule.updateJobProps(monitor.id, 'counter', 0)
        // 正常时是否重置告警记录标识（方便回调后更新数据库操作）
        result.reset = true
      }
      // 设置了恢复正常告警通知：发送正常告警消息
      if (alarm_recovery && prev_monitor_result === 0) {
        log(monitor.name, ' => 发送恢复正常告警消息')
        let res = []
        try {
          // 通知时间
          result.time = new Date()
          res = await this.doSendNotify(false, monitor, dbThreshold)
          result.alarmState = res
        } catch (e) {
          err('发送恢复正常告警消息错误：')
          err(e.stack)
        }
        return result
      }
      // 正常情况无需发送通知
      return null
    }

    /////////////////////// 异常情况 处理发送通知//////////////////////////////////////////
    // 更新缓存中上一次检查状态为异常
    await this.redisSchedule.updateJobProps(monitor.id, 'data.prev_monitor_result', 0)
    // 当检查次数为斐波那契数列时，发送告警
    if (alarm_rule === ALARM_UNUSUAL_RULES[0].key) {
      const isFiboNumber = this.isFibonacci(counter)
      // 异常以衰减式次数(符合斐波拉契数列)发送通知
      if (isFiboNumber) {
        // 通知时间
        result.time = new Date()
        log(monitor.name, ' =>【异常以衰减式】 发送异常告警消息')
        const res = await this.doSendNotify(true, monitor, dbThreshold)
        result.alarmState = res
      }
    } else if (alarm_rule === ALARM_UNUSUAL_RULES[1].key) {
      // 通知时间
      result.time = new Date()
      log(monitor.name, ' =>【每次检测发送】 发送异常告警消息')
      // 每次检测发送异常均发送通知
      const res = await this.doSendNotify(true, monitor, dbThreshold)
      result.alarmState = res
    } else if (alarm_rule === ALARM_UNUSUAL_RULES[2].key) {
      // 第一次的检测发生异常发送一次通知后，后面的异常不再通知，直至恢复正常。
      if (counter === 1) {
        // 通知时间
        result.time = new Date()
        log(monitor.name, ' => 【同类发送】发送异常告警消息')
        const res = await this.doSendNotify(true, monitor, dbThreshold)
        result.alarmState = res
      }
    }
    return result.time ? result : null
  }

  async shellNodify(curInterface, curReceivers, content, params = []) {
    const path = curInterface.url
    let result = {
      time: new Date(),
      state: true,
      notify_mode: curInterface.type
    }

    let reg = /(.sh)$/
    if (!path || !reg.test(path)) {
      result.state = false
      return result
    }

    let contentVal = ''
    let contactsVal = []
    let val = ''
    _.map(params, (value, key) => {
      if (value.val === '${contacts}') {
        curReceivers.map( i => {
          const { name, phone, email } = i
          contactsVal.push(`${name} ${phone} ${email}`)
        })
      } else if (value.val === '${content}') {
        contentVal = content
      } else {
        val += value.val
      }
      return result
    }, {})

    contactsVal.map( contact => {
      let commond = `${path} '${contentVal}' '${contact}' '${val}'`
      shell.exec(`${commond}`,function (code, stdout, stderr) {
        if ( code === 0 ) return
        result.state = false
      })
    })
    
    return result
  }
}

//通过扩展module扩展之
moduleExtend(__filename)
