import EventsService from '../../services/market-brain/events.service'
import TasksService from '../../services/market-brain/task.service'
import segmentService from '../../services/segment.service'
import { Response } from '../../utils/Response'
import _ from 'lodash'
import moment from 'moment'
import { MARKETING_EVENT_STATUS, MARKETING_TASK_TYPE, MARKET_BRAIN_BELONGS } from 'common/constants'
import { JPush } from 'jpush-async'
import conf from '../../config'

const { 
  site: {
    marketBrain: { 
      feature
  } } } = conf

export default class SugoMarketBrainEventsController {

  constructor() {
    this.eventsService =  new EventsService()
    this.tasksService = new TasksService()
    this.db = this.eventsService.db
  }

  async getList(ctx) {
    const { name, status, send_channel, model_id, scene_id, page = 1, page_size = 10, created_range, belongs, jwt_company_name, jwt_store_name, tactics_status, touch_up_way } = ctx.q

    const { jwt_company_id, jwt_store_id } = _.get(ctx, 'state.jwtData.others', {})
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
    if (tactics_status !== void 0) {
      where.tactics_status = tactics_status
    }
    if (touch_up_way !== void 0) {
      where.touch_up_way = touch_up_way
    }
    if (name) {
      where.name = {
        $like: `%${name}%`
      }
    }

    where.belongs = belongs || 0
    
    if (where.belongs === 1) {
      if (jwt_company_id) {
        where.jwt_company_id = jwt_company_id
      }
      if (jwt_store_id) {
        where.jwt_store_id = jwt_store_id
      }
      if (jwt_company_name) {
        where.jwt_company_name = jwt_company_name
      }
      if (jwt_store_name) {
        where.jwt_store_name = jwt_store_name
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
        model: this.db.MarketBrainModels,
        attributes: [['name', 'modelName']]
      },
      {
        model: this.db.MarketBrainScenes,
        attributes: [['name', 'sceneName']]
      }],
      limit: page_size,
      offset: (page - 1) * page_size,
      order: [
        ['status', 'DESC']
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
    // 单点登录数果系统时 会有这些参数 一般第三方都会通过单点登录方式使用该功能
    const { jwt_company_id, jwt_store_id, company_name: jwt_company_name, store_name: jwt_store_name } = _.get(ctx, 'state.jwtData.others', {})

    const existed = await this.eventsService.findOne({ name: model.name, belongs: model.belongs }, { raw: true })
    // 新增营销事件操作
    if (!id) {
      if (existed) {
        return ctx.body = Response.error(ctx, `${model.belongs === 0 ? '策略' : '活动'}名称重复，请重新输入`)
      }

      //策略 活动 都在一张表保存 belongs 0 策略 1 活动
      if (model.belongs === 1) {
        model.jwt_company_id = jwt_company_id
        model.jwt_store_id = jwt_store_id
        model.jwt_company_name = jwt_company_name
        model.jwt_store_name= jwt_store_name
      }

      const data = await this.eventsService.create({
        ...model,
        company_id,
        created_by: userId
      })

      //有两个状态值 tactics_status和status 前端有根据belongs处理status 策略的表单填的是 tactics_status
      if (model.status === MARKETING_EVENT_STATUS.OPEN) {
        // 插入任务记录或更新任务状态
        await this.eventsService.addScheduleJob(data)
      }
      if (model.belongs === 1) {
        // 同步任务状态信息
        await this.tasksService.syncTaskStatus({
          data
        })
      }
      return ctx.body = Response.ok(data)
    }

    /**---------------------更新操作-------------------------------- */
    if (existed && existed.id !== id) {
      return ctx.body = Response.error(ctx, '名称重复，请重新输入')
    }
    await this.eventsService.update({
      ..._.omit(model, 'id'),
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

    // todo 加新的前取消掉旧的 但是一旦有这个取消操作 到了时间后就不再执行 这个取消操作有问题
    //具体问题在 定时任务加到redis里了 但是redis-schedule.service 里的 jobs没了这个
    //为什么要取消 再加? 1.是redis-schedule.service上 on message 逻辑 dowork完后 还又加了一次 把键名占住 不取消就加不上 
    //2.旧任务不取消 键名被占住 加不上新的 
    // await this.eventsService.removeScheduleJob(data)

    if (model.status === MARKETING_EVENT_STATUS.OPEN) {
      await this.eventsService.addScheduleJob(data)
    }
    if (model.belongs === MARKET_BRAIN_BELONGS.ACTIVE) {
      // 同步任务状态信息
      await this.tasksService.syncTaskStatus({
        data
      })
    }
    ctx.body = Response.ok(data)
  }

  async delete(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }

    const existed = await this.eventsService.findOne({ id }, { raw: true })
    await this.eventsService.removeScheduleJob(existed)
    await this.eventsService.delete(id)
    // // 服务端校验是否没有其他子记录
    // const sql = `
    //   SELECT COUNT(*) AS total FROM sugo_market_brain_tasks task, sugo_market_brain_task_executions ex, sugo_market_brain_events event
    //   WHERE task."module_id"=event."id" AND task."id"=ex.task_id AND event."id"=:id
    // `
    // const [{ total }] = await this.eventsService.findBySQL(sql, { id })
    // if (Number(total) > 0) {
    //   return ctx.body = Response.error(ctx, '操作失败，该活动曾经执行，不能删除')
    // }
    // await this.eventsService.removeScheduleJob({id, name: ''})
    // const res = await this.eventsService.remove({ id })
    ctx.body = Response.ok()
  }

  async testJpush(ctx) {
    const { copywriting, targetUser } = ctx.q
    const { platform, title, content, pushTarget, jpushExtraObj } = copywriting
    const extra = {}
    const jpushExtra = []
    for (let k in jpushExtraObj) {
      jpushExtra.push({
        key: jpushExtraObj[k].key,
        val: jpushExtraObj[k].val 
      })
    }
    jpushExtra.map( i => {
      extra[i.key] = i.val
    })

    const that = this
    const serviceDict = {
      wxjTyj: that.eventsService.wxjTyjService,
      common: that.eventsService.commonService,
    }

    let notification = await serviceDict[feature].genJpushNotification({ platform, title, content, extra})
    const audience = pushTarget === 0 ? JPush.registration_id(targetUser) : JPush.alias(targetUser)
    await serviceDict[feature].doJpush({
      platform,
      notification,
      audience: audience
    })
    return ctx.body = Response.ok()
  }
}
