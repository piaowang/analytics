/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:30:26
 * @description 智能营销-营销事件service
 */

import { BaseService } from '../base.service'
import RedisScheduleService from '../redis-schedule.service'
import druidQueryService from '../druid-query.service'
import segmentService from '../segment.service'
import { log, err } from '../../utils/log'
import { getMarketingEventCronExpression } from 'common/marketing'
import { MARKETING_TASK_TYPE, MARKETING_EVENT_STATUS, MARKETING_TASK_STATUS, MARKETING_TYPE_COLUMN, MARKETING_SEND_CHANNEL } from 'common/constants'
import _ from 'lodash'

export default class MarketingEventsService extends BaseService {

  constructor() {
    super('MarketingEvents')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:marketing-events:scheduler'})
    this.prefix_key = 'marketing-events-task'
  }

  /**
   * @description 触发事件定时任务函数
   * @param {any} event
   * @memberOf MarketingEventsService
   */
  async taskRunning({ data: event }) {
    log(`start running ${this.prefix_key}`, event.name)
    const currentDate = new Date()
    const { id: module_id, created_by, updated_by } = event
    // 需校验该事件所在的场景是否已关闭，如果已关闭，则不执行
    const task = await this.db.MarketingTasks.findOne({
      where: {
        module_id,
        type: MARKETING_TASK_TYPE.EVENTS
      }
    })
    if(_.isEmpty(task)) return 
    const task_id = task.id // 任务ID
    const count = await this.db.MarketingTaskExecutions.count({
      where: {
        id: task.id
      },
      raw: true
    })

    const updateTaskData = {
      status: MARKETING_TASK_STATUS.RUNNING,
      execute_time: currentDate
    }
    if (count === 0) {
      updateTaskData.first_execute_time = currentDate
    }
    // 更新任务状态为运行中
    await task.update(updateTaskData, { id: task.id })
    // 创建任务执行记录（执行中）
    const execution = await this.db.MarketingTaskExecutions.create({
      task_id,
      execute_time: currentDate,
      status: MARKETING_TASK_STATUS.EXECUTING,
      created_by
    })
    const execute_id = execution.id
    // 事件发生每次发送前更新用户群
    await segmentService.update({
      update: { updated_by },
      query: {
        where: {
          id: event.usergroup_id
        }
      }
    })

    // 获取分群用户，手机，token 注意：目前版本根据所在分群的项目获取token或手机号
    // 根据权重筛选过滤分群人数，并组装文案信息
    const userGroup = await this.db.Segment.findByPk(event.usergroup_id)
    const { sendUsers, contrastUsers, predict_total, actual_total } = await this.getUserList(event, userGroup)

    if (_.isEmpty(sendUsers)) {
    // 更新任务执行记录状态为失败
      await execution.update({
        predict_total, // 预计发送量 该任务中捞取到的用户数*发送比例
        actual_total, // 在预计发送的用户中，能匹配到手机号或token的量
        updated_by,
        status: MARKETING_TASK_STATUS.FAILED
      }, { id: execution.id })
      log(`run ${this.prefix_key} success`)
      return
    }

    // 组装文案信息
    const taskDetails = await this.getMarketingTaskDetails({
      sendUsers,
      data: event,
      execute_id,
      task_id,
      userGroup
    })
    // 写入任务明细记录
    await this.db.MarketingTaskDetails.bulkCreate(taskDetails)
    // 将对比组用户写入分群
    const contrastTaskDetails = contrastUsers.map(distinct_id => ({
      distinct_id,
      task_id,
      module_id,
      execute_id,
      group_type: 1, // 对比组
      send_type: event.send_channel,
      send_state: 0, // 0 未发送
      created_by: updated_by || created_by
    }))
    await this.db.MarketingTaskDetails.bulkCreate(contrastTaskDetails)
    // 更新任务执行记录状态为已完成
    await execution.update({
      predict_total, // 预计发送量 该任务中捞取到的用户数*发送比例
      actual_total, // 在预计发送的用户中，能匹配到手机号或token的量
      updated_by,
      status: MARKETING_TASK_STATUS.DONE
    }, { id: execution.id })
    log(`run ${this.prefix_key} success`)
  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async addScheduleJob(event) {
    if (!event) return
    const { timer, timer_type } = event
    const crons = getMarketingEventCronExpression(timer, timer_type)
    let idx = 0
    for (let cron of crons) {
      const key = this.getJobKey(`${event.id}:${timer_type}:${idx}`)
      log('start marketing-event => ', event.name, key)
      await this.redisSchedule.addJob(key, {
        // every: '20 seconds', // local test
        ...cron,
        path: './marketing/events.service',
        func: 'taskRunning',
        data: event,
        counter: event.check_counter || 0
      })
      idx++
    }
  }

  async removeScheduleJob(event) {
    if (!event) return
    const { timer, timer_type } = event
    const crons = getMarketingEventCronExpression(timer, timer_type)
    let idx = 0
    for (let cron of crons) {
      const key = this.getJobKey(`${event.id}:${timer_type}:${idx}`)
      log('stop marketing-event => ', event.name, key)
      await this.redisSchedule.cancelJob(key)
      idx++
    }
  }

  async getUserList(event, userGroup) {
    const { usergroup_id, send_channel, send_ratio } = event
    const { druid_datasource_id: datasource_id } = userGroup
    let druid_datasource_id
    let datasource = await this.db.SugoDatasources.findByPk(datasource_id, { raw: true })
    if (datasource.type === 2 ) {
      druid_datasource_id = datasource_id
    } else {
      let project = await this.db.SugoProjects.findByPk(_.get(userGroup,'params.relatedUserTagProjectId'), { raw: true })
      druid_datasource_id = project.datasource_id
    }
    let sendUsers = [] // 发送组
    let contrastUsers = [] // 对比组
    let predict_total = 0 // 预计发送总用户数(该任务中捞取到的用户数*发送比例)
    let actual_total = 0  // 实际发送量(在预计发送的用户中，能匹配到手机号或token的量)
    const userTotal = _.get(userGroup, 'params.total', 0)
    try {
      // 获取分群用户列表
      const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')
      const channelDimension = send_channel === MARKETING_SEND_CHANNEL.PUSH ? MARKETING_TYPE_COLUMN.PUSH : MARKETING_TYPE_COLUMN.SMS
      predict_total = Math.round(userTotal * send_ratio * 0.01)
      let userList = await druidQueryService.queryByExpression({
        druid_datasource_id,
        // dimensions: [userIdDimension, channelDimension],
        filters: [{
          'col': 'distinct_id',
          'op': 'lookupin',
          'eq': usergroup_id
        }],
        enableDesensitiz: false,
        selectLimit: 9999999,
        'select': [userIdDimension, channelDimension],
        'selectOrderDirection': 'desc',
        'splitType': 'groupBy',
        'queryEngine': 'tindex'
      })


      sendUsers = userList.filter(i => !_.isEmpty(i[channelDimension]))
      if (sendUsers.length > predict_total) {
        sendUsers = _.take(_.shuffle(sendUsers), predict_total)
      }
      actual_total = sendUsers.length
      contrastUsers = _.differenceWith(userList, sendUsers, _.isEqual)
      contrastUsers = contrastUsers.map( i => i[userIdDimension])
      // 排除不能匹配手机号或token的用户
      // const validUserList = userList.map(item => {
      //   const userId = item[userIdDimension]
      //   const value = item[channelDimension]
      //   if (!_.isEmpty(value)) { // TODO 校验是否合法手机号码，token
      //     return item
      //   } else {
      //     contrastUsers.push(userId) // 设置对比组id
      //     return undefined
      //   }
      // }).filter(_.identity)

      // if (validUserList.length > 0 && predict_total > 0) { //
      //   const shufflUserList = _.shuffle(validUserList)
      //   sendUsers = _.take(shufflUserList, predict_total)
      //   actual_total = sendUsers.length
      //   if (actual_total > predict_total) {
      //     const res = _.takeRight(shufflUserList, actual_total - predict_total)
      //     contrastUsers.push(_.keys(res)) // 设置对比组id
      //   }
      // }
    } catch (e) {
      throw Error(e)
    }

    return {
      sendUsers,
      contrastUsers,
      predict_total,
      actual_total
    }
  }

  /**
   * @description 生成任务明细，组装发送文案内容
   * @param {any} { sendUsers, event, task, userGroup }
   * @returns marketingTaskDetails
   * @memberOf MarketingEventsService
   */
  async getMarketingTaskDetails({ sendUsers, data, task_id, execute_id, userGroup }) {
    const { id, send_channel, copywriting, updated_by, created_by } = data
    let { title, content, url, pushland } = copywriting
    url = url + `?module_id=${id}`
    const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')
    const channelDimension = send_channel === MARKETING_SEND_CHANNEL.PUSH ? MARKETING_TYPE_COLUMN.PUSH : MARKETING_TYPE_COLUMN.SMS
    const channelKey = send_channel === MARKETING_SEND_CHANNEL.PUSH ? 'token' : 'mobile'
    const marketingTaskDetails = sendUsers.map(item => ({
      distinct_id: item[userIdDimension],
      task_id,
      module_id: id,
      execute_id,
      [channelKey]: item[channelDimension],
      send_type: send_channel,
      send_state: 0, // 0 未发送
      group_type: 0, // 发送组
      created_by: updated_by || created_by,
      // 根据渠道设置文案内容
      ...(send_channel === MARKETING_SEND_CHANNEL.PUSH ? { title, content, page_code: pushland } : { content: _.template(content)({ url }) })
    }))
    return marketingTaskDetails
  }

  /**
   * @description 批量开启/关闭事件任务状态(场景启用、停用时需批量更新事件任务状态)
   * @param {any} { model_id, scene_id, status }
   */
  async batchModifyEventScheduleJobs({ model_id, scene_id, status }) {
    if (!model_id || !scene_id || status === undefined) {
      throw new Error('model_id or scene_id is undefined')
    }

    // 查找所有相关场景下已开启的事件列表
    const events = await this.findAll({
      model_id,
      scene_id,
      status: MARKETING_EVENT_STATUS.OPEN
    }, { raw: true })

    if (!events.length) {
      return
    }
    log(`场景状态${status === MARKETING_EVENT_STATUS.CLOSE ? '停用' : '启用'}批量同步事件任务状态`)
    const results = events.map(data => {
      if (status === MARKETING_EVENT_STATUS.CLOSE) {
        // 停用场景操作需停止该场景下所有已启用事件任务
        return this.removeScheduleJob(data)
      } else if (status === MARKETING_EVENT_STATUS.OPEN) {
        // 启用场景需开启该场景下所有已启用事件任务
        return this.addScheduleJob(data)
      }
    })
    await Promise.all(results)
  }

  async initEventTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    const sql = `
      SELECT event.* FROM sugo_marketing_models AS model, sugo_marketing_scenes AS scene, sugo_marketing_events AS event
      WHERE model.id=scene.model_id AND event.model_id=model.id AND event.scene_id=scene.id
      AND scene.status=1 AND event.status=1
    `
    const events = await this.findBySQL(sql)
    if (!events.length) {
      return
    }
    log('初始智能营销-营销事件定时任务: ', events.length)
    // 清除当前模块所有相关定时任务key
    await this.redisSchedule.clearJobs()
    process.nextTick(async () => {
      await Promise.all(events.map(data => this.addScheduleJob(data)))
    })
  }
}
