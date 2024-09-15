import SugoMonitorAlarmsService from '../services/sugo-monitor-alarms.service'
import SugoMonitorAlarmsExceptionsService from '../services/sugo-monitor-alarms-exceptions.service'
import SugoAlarmNotifyTemplateSrv from '../services/sugo-alarm-notify-template'
import {returnResult, returnError} from '../utils/helper'
import db from '../models'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'
import moment from 'moment'
import _ from 'lodash'
import {AlarmExceptionHandleState} from '../../common/constants'
import FetchKit from '../utils/fetch-kit'
import {getAccessTokenWithRedisCache, getWechatDepartments, getWechatUserlist} from '../services/wechat.service'
import {genMonitorConditionFilterPredicate} from '../../common/monitorHelper'

/**
 * 监控告警控制层
 */
class SugoMonitorAlarmsController {

  constructor() {
    this.monitorAlarmsService = new SugoMonitorAlarmsService()
    this.monitorAlarmsExceptionsService = new SugoMonitorAlarmsExceptionsService()
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoMonitorAlarmsController()
    }
    return this._instance
  }

  query = async ctx => {
    const { company_id } = ctx.session.user
    const { id, projectId } = ctx.params
    let whereCond = ctx.q || {}
    if (id) {
      const model = await this.monitorAlarmsService.findOne({...whereCond, id, company_id})
      return returnResult(ctx, model)
    }
    // 查询列表时必须带上此参数
    whereCond.project_id = projectId
    const other = {
      order: [
        ['updated_at', 'DESC']
      ]}
    const models = await this.monitorAlarmsService.findAll({...whereCond, company_id}, other)
    returnResult(ctx, models)
  }

  create = async ctx => {
    const { company_id } = ctx.session.user
    let obj = ctx.q
    if (!obj.name) {
      return returnError(ctx, '操作失败，缺少参数')
    }
    let existed = await this.monitorAlarmsService.findOne({ name: obj.name })
    if (existed) {
      return returnError(ctx, '你已经添加过这个告警了')
    }
    obj.company_id = company_id
    const res = await this.monitorAlarmsService.create(obj)
    // 默认创建计数从0开始
    res.check_counter = 0
    // 添加到任务
    await this.monitorAlarmsService.addMonitorJob(res, 1)
    returnResult(ctx, res)
  }

  // 更新告警记录
  update = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    obj.id = id
    let existed = await this.monitorAlarmsService.findOne({ name: obj.name })
    if (existed && existed.id !== id) {
      return returnError(ctx, '告警名称重复，请重新输入')
    }
    // 更新之前取消任务
    await this.monitorAlarmsService.cancelMonitorJob(obj)
    // 重置上次检测时间 | 上次检测结果 | 异常次数 | 3项 信息要重置
    obj.check_counter = 0
    obj.prev_monitor_result = null
    obj.prev_monitor_time = null
    const res = await this.monitorAlarmsService.update(obj, { id, company_id })
    // 更新之后重置告警任务
    if (obj.status) {
      await this.monitorAlarmsService.addMonitorJob(obj)
    }
    returnResult(ctx, res)
  }

  // 删除告警记录
  remove = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    const res = await this.monitorAlarmsService.remove({ id, company_id })
    // 删除的时候也需要停止任务
    await this.monitorAlarmsService.cancelMonitorJob({ id })
    returnResult(ctx, res)
  }

  // 暂停、启动监控告警
  changeMonitor = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    const res = await this.monitorAlarmsService.changeMonitor(obj, { id, company_id })
    returnResult(ctx, res)
  }

  // 获取告警异常记录
  getExceptions = async ctx => {
    const { company_id } = ctx.session.user
    const { id: monitorId } = ctx.params
    let {
      page = 1, pageSize = 20, detection_time, project_id, handleState, level, exceptionId, monitorIds,
      // 按产生异常当时的告警条件筛选
      monitorCondFilters
    } = ctx.q
    // 分页
    const limit = pageSize
    const offset = pageSize * (page - 1)
    let whereCond = {
      company_id
    }
    if (exceptionId) {
      whereCond.id = exceptionId
    }
    if (monitorId && monitorId !== 'all') {
      monitorIds = _.uniq([...(monitorIds || []), monitorId])
    }
    // monitorIds 为 null 则不限
    if (monitorIds) {
      whereCond.monitor_id = {$in: monitorIds}
    }

    if (handleState) {
      whereCond.handle_info = handleState === AlarmExceptionHandleState.unhandled
        ? { $or: [{ handleState: null }, { handleState }] }
        : { handleState }
    }
    if (level) {
      whereCond.alarm_level = level
    }
    // 异常检测时间过滤
    if (detection_time) {
      whereCond.detection_time = Array.isArray(detection_time)
        ? { $between: detection_time.map(tStr => moment(tStr).toISOString()) }
        : moment(detection_time).toISOString()
    }
    const include = [{
      model: db.SugoMonitorAlarms,
      attributes: ['id', 'project_id'],
      where: { project_id },
      distinct: true
    }]
    const order = [ ['updated_at', 'DESC'] ]
    const res = _.isEmpty(monitorCondFilters)
      ? await this.monitorAlarmsExceptionsService.findAndCountAll(whereCond, { include, limit, offset, order })
      : await this.monitorAlarmsExceptionsService.findAndCountAllClientSide(whereCond, { include, limit, offset, order },
        genMonitorConditionFilterPredicate(monitorCondFilters, exception => _.get(exception.query_params, 'filters')))
    returnResult(ctx, res)
  }

  /**
   * 更新告警异常
   * @param ctx
   * @returns {Promise<void>}
   */
  updateException = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    obj.updated_by = userId
    const res = await this.monitorAlarmsExceptionsService.update(obj, { id, company_id })
    returnResult(ctx, res)
  }

  // 删除告警异常记录
  removeExceptions = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    const res = await this.monitorAlarmsExceptionsService.remove({ id, company_id })
    returnResult(ctx, res)
  }

  // 测试通知接口
  doTesting = async (ctx) => {
    const { dbThreshold } = ctx.q
    const monitor = { ...ctx.q }
    const res = await this.monitorAlarmsService.doSendNotify(true, monitor, dbThreshold)
    returnResult(ctx, res)
  }

  // 根据处理状态取得异常数量
  getExceptionsCount = async ctx => {
    const { company_id } = ctx.session.user
    let { projectId, handleState } = ctx.q || {}

    const recs = await db.SugoMonitorAlarmsExceptions.findAll({
      attributes: ['id'],
      where: {
        handle_info: handleState === AlarmExceptionHandleState.unhandled
          ? { $or: [{ handleState: null }, { handleState }] }
          : { handleState },
        company_id
      },
      include: [{
        model: db.SugoMonitorAlarms,
        where: { project_id: projectId },
        attributes: ['project_id']
      }]
    })

    returnResult(ctx, _(recs).filter(ex => ex.SugoMonitorAlarm.project_id === projectId).size())
  }

  // 查询告警通知模版
  getNotifyTemplates = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let { where: whereCond, ...rest } = ctx.q || {}

    let srv = SugoAlarmNotifyTemplateSrv.getInstance()
    let res
    if (id) {
      res = await srv.findOne({ ...whereCond, id, company_id })
    } else {
      res = await srv.findAll({ ...whereCond, company_id }, { order: [
        ['updated_at', 'DESC']
      ] })
    }
    returnResult(ctx, res)
  }

  createNotifyTemplate = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    let obj = ctx.q
    obj.company_id = company_id
    obj.created_by = userId
    let srv = SugoAlarmNotifyTemplateSrv.getInstance()
    let result = await srv.create(obj)
    returnResult(ctx, result)
  }

  updateNotifyTemplate = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    obj.updated_by = userId
    let srv = SugoAlarmNotifyTemplateSrv.getInstance()
    const result = await srv.update(obj, { id, company_id })
    returnResult(ctx, result)
  }

  deleteNotifyTemplate = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    // TODO 如果有用到这个模版，则不能删除?
    let srv = SugoAlarmNotifyTemplateSrv.getInstance()
    const result = await srv.remove({ id, company_id })
    returnResult(ctx, result)
  }

  getWeChatDepartments = async ctx => {
    const { departmentId } = ctx.query
    try {
      let department = await getWechatDepartments(departmentId)
      returnResult(ctx, department || [])
    } catch (e) {
      returnResult(ctx, e.message, 0, 500)
    }
  }

  getWeChatContacts = async ctx => {
    let { departmentId } = ctx.query
    try {
      if (!departmentId) {
        let department = await getWechatDepartments()
        if (_.some(department)) {
          departmentId = _.get(department, '[0].id')
        }
      }
      let userlist = await getWechatUserlist(departmentId, true)
      returnResult(ctx, userlist || [])
    } catch (e) {
      returnResult(ctx, e.message, 0, 500)
    }
  }
}

export default SugoMonitorAlarmsController.getInstance()

//通过扩展module扩展之
moduleExtend(__filename)
