/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:25:09
 * @description 智能营销-营销事件controller
 */
import EventsService from '../../services/marketing/events.service'
import TasksService from '../../services/marketing/task.service'
import MarketingResultsService from '../../services/marketing/result.service'
import MarketingTaskExecution from '../../services/marketing/task-execution.service'
import segmentService from '../../services/segment.service'
import { Response } from '../../utils/Response'
import _ from 'lodash'
import moment from 'moment'
import { MARKETING_EVENT_STATUS, MARKETING_TASK_TYPE, MARKETING_TASK_STATUS } from 'common/constants'

export default class SugoMarketingEventsController {

  constructor() {
    this.eventsService =  new EventsService()
    this.tasksService = new TasksService()
    this.marketingResultsService = new MarketingResultsService()
    this.taskExecutionService = new MarketingTaskExecution()
    this.db = this.eventsService.db
  }

  async getList(ctx) {
    const { name, status, send_channel, model_id, scene_id, page = 1, page_size = 10, created_range } = ctx.q

    let where = {}
    if (model_id) {
      where.model_id = model_id
    }
    if (scene_id) {
      where.scene_id = scene_id
    }
    if (send_channel !== void 0) {
      where.send_channel = send_channel
    }
    if (status !== void 0) {
      where.status = status
    }
    if (name) {
      where.name = {
        $like: `%${name}%`
      }
    }
    if (created_range !== void 0) {
      where.created_at = {
        $between:  [
          moment(created_range[0]).toISOString(),
          moment(created_range[1]).add(1, 'day').toISOString()
        ]
      }
    }
    const res = await this.eventsService.findAndCountAll(where, {
      include: [{
        model: this.db.MarketingModels,
        attributes: [['name', 'modelName']]
      },
      {
        model: this.db.MarketingScenes,
        attributes: [['name', 'sceneName']]
      }],
      limit: page_size,
      offset: (page - 1) * page_size,
      order: [
        ['status', 'DESC'],
        ['send_channel', 'ASC'],
        ['created_at','DESC']
      ],
      raw: true
    })
    ctx.body = Response.ok(res)
  }

  async findById(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '非法请求，缺少ID参数')
    }
    const res = await this.eventsService.findByPk(id)
    ctx.body = Response.ok(res)
  }

  async save(ctx) {
    const model = ctx.q
    const { id } = ctx.params
    const {company_id, id: userId} = ctx.session.user
    if (!model.model_id) {
      return ctx.body = Response.error(ctx, '保存失败，缺少模型ID参数')
    }
    const existed = await this.eventsService.findOne({ name: model.name }, { raw: true })
    // 新增营销事件操作
    if (!id) {
      if (existed) {
        return ctx.body = Response.error(ctx, '事件名称重复，请重新输入')
      }
      const data = await this.eventsService.create({
        ...model,
        company_id,
        created_by: userId
      })
      if (model.status === MARKETING_EVENT_STATUS.OPEN) {
        // 插入任务记录或更新任务状态
        await this.eventsService.addScheduleJob(data)
      }
      // 同步任务状态信息
      await this.tasksService.syncTaskStatus({
        data,
        type: MARKETING_TASK_TYPE.EVENTS
      })
      return ctx.body = Response.ok(data)
    }

    /**---------------------更新操作-------------------------------- */
    if (existed && existed.id !== id) {
      return ctx.body = Response.error(ctx, '事件名称重复，请重新输入')
    }

    await this.eventsService.update({
      ...model,
      company_id,
      updated_by: userId
    }, { id })
    const data ={
      id,
      ...model,
      company_id,
      updated_by: userId
    }

    // 没有发送时机参数时直接返回
    if (!data.timer) {
      return ctx.body = Response.ok(data)
    }

    await this.eventsService.removeScheduleJob(data)
    if (model.status === MARKETING_EVENT_STATUS.OPEN) {
      await this.eventsService.addScheduleJob(data)
    }
    // 同步任务状态信息
    await this.tasksService.syncTaskStatus({
      data,
      type: MARKETING_TASK_TYPE.EVENTS
    })
    ctx.body = Response.ok(data)
  }

  async delete(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    // 服务端校验是否没有其他子记录
    const sql = `
      SELECT COUNT(*) AS total FROM sugo_marketing_tasks task, sugo_marketing_task_executions ex, sugo_marketing_events event
      WHERE task.module_id=event.id AND task.id=ex.task_id AND event.id=:id
    `
    const [{ total }] = await this.eventsService.findBySQL(sql, { id })
    if (Number(total) > 0) {
      return ctx.body = Response.error(ctx, '操作失败，该事件曾经执行，不能删除')
    }

    const task = await this.tasksService.findOne({ module_id: id })
    if (!_.isEmpty(task)) {
      const { status } = task
      if (status === MARKETING_TASK_STATUS.PREPARING) await this.tasksService.remove({ module_id: id })
    }
    const res = await this.eventsService.remove({ id })

    ctx.body = Response.ok(res)
  }

  async getResult(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失误, 缺少参数')
    }
    const event = await this.eventsService.findOne({id},{raw:true})

    const { usergroup_id } = event
    const userGroup = await segmentService.get({
      where: {
        id: usergroup_id
      }
    })
    const userGroupName = _.get(userGroup,'[0].title', '')
    event.userGroupName = userGroupName

    const resGroup = await this.marketingResultsService.findAll({
      module_id: id,
      send_time: { $lt: moment().startOf('day').toISOString()}
    }, {
      raw: true,
      limit: 7,
      order: [['created_at', 'ASC']]
    })

    const res = {
      eventInfo: event,
      lastRes: _.get(resGroup, `[${resGroup.length - 1}]`,{}),
      resGroup
    }
    return ctx.body = Response.ok(res)
  }

  async getResultByDate(ctx) {
    const { id, timeRange } = ctx.q
    const [since, until] = timeRange
    const resGroup = await this.marketingResultsService.findAll({
      module_id: id,
      send_time: { $between: [moment(since).toISOString(), moment(until).toISOString()]}
    }, {
      raw: true,
      order: ['created_at']
    })
    return ctx.body = Response.ok(resGroup)
  }

  async isLcScene(ctx) {
    const { scene_id } = ctx.q
    if (!scene_id) return ctx.body = Response.ok({})
    let res = await this.db.SegmentWIthMarketingScene.findOne({
      where: {
        scene_id
      },
      raw: true,
      include: {
        model: this.db.Segment,
        raw: true
      }
    }) || {}

    let segment = {}

    for (let k in res) {
      if ( k.includes('Segment')) segment[k.replace('Segment.', '')] = res[k]
    }

    return ctx.body = Response.ok(segment)
  }
}
