/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:25:09
 * @description 智能营销-营销场景controller
 */
import ScenesService from '../../services/marketing/scenes.service'
import { Response } from '../../utils/Response'
import EventsService from '../../services/marketing/events.service'

export default class SugoMarketingScenesController {

  constructor() {
    this.scenesService =  new ScenesService()
    this.eventsService =  new EventsService()
  }

  async getList(ctx) {
    const { model_id } = ctx.q
    if (!model_id) {
      return ctx.body = Response.ok([])
    }
    const sql = `
      SELECT scenes.*,
      (SELECT COUNT(*) FROM sugo_marketing_events AS event WHERE event.scene_id=scenes.id) AS event_total,
      (SELECT COUNT(*) FROM sugo_marketing_events AS event WHERE event.scene_id=scenes.id AND event.status=1) AS opened_total
      FROM sugo_marketing_scenes AS scenes
      WHERE scenes.model_id=:model_id
      ORDER BY status DESC;
    `
    const res = await this.scenesService.findBySQL(sql, { model_id })
    ctx.body = Response.ok(res)
  }

  async save(ctx) {
    const model = ctx.q
    const { id } = ctx.params
    const {company_id, id: userId} = ctx.session.user
    if (!model.model_id) {
      return ctx.body = Response.error(ctx, '保存失败，缺少模型ID参数')
    }
    let existed = await this.scenesService.findOne({
      model_id: model.id,
      name: model.name
    })
    if (existed) return ctx.body = Response.error(ctx, '保存失败，重复名称')
    // 新增操作
    if (!id) {
      const res = await this.scenesService.findOrCreate({
        name: model.name,
        model_id: model.id,
        company_id,
        created_by: userId
      },{
        ...model,
        company_id,
        created_by: userId
      })
      return ctx.body = Response.ok(res)
    }

    /********************更新操作************************* */
    if (model.statusHasModified === true) {
      // 批量更新事件任务状态
      await this.eventsService.batchModifyEventScheduleJobs({
        model_id: model.model_id,
        scene_id: id,
        status: model.status
      })
    }

    await this.scenesService.update({
      ...model,
      company_id,
      updated_by: userId
    }, { id })
    ctx.body = Response.ok(model)
  }

  async delete(ctx) {
    const { id } = ctx.params
    const { model_id } = ctx.q
    if (!id || !model_id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
    // 服务端校验是否没有其他子记录
    const sql = `
      SELECT COUNT(*) AS total FROM sugo_marketing_models AS model, sugo_marketing_scenes AS scene, sugo_marketing_events AS event
      WHERE model.id=scene.model_id AND event.model_id=model.id AND event.scene_id=scene.id AND model.id=:model_id AND scene.id=:id
    `
    const [{ total }] = await this.scenesService.findBySQL(sql, { id, model_id })
    if (Number(total) > 0) {
      return ctx.body = Response.error(ctx, '操作失败，此场景下包含事件数据')
    }
    const res = await this.scenesService.remove({ id, model_id })
    ctx.body = Response.ok(res)
  }
}
