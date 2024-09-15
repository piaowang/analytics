import ScenesService from '../../services/market-brain/scenes.service'
import { Response } from '../../utils/Response'
import EventsService from '../../services/market-brain/events.service'
import ModelsService from '../../services/market-brain/models.service'

export default class SugoMarketBrainScenesController {

  constructor() {
    this.scenesService =  new ScenesService()
    this.eventsService =  new EventsService()
    this.modelsService = new ModelsService()
  }

  async getList(ctx) {
    const { model_id } = ctx.q
    if (!model_id) {
      return ctx.body = Response.ok([])
    }
    const sql = `
      select scenes.*,
      (select count(*) from sugo_market_brain_events as event where event.scene_id=scenes.id and event.belongs=0) as event_total,
      (select count(*) from sugo_market_brain_events as event where event.scene_id=scenes.id and event.tactics_status=1 and tactics_status is not null) as opened_total
      from sugo_market_brain_scenes as scenes
      where scenes.model_id=:model_id and scenes.name <> '系统暂存用'
      order BY status desc
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
      model_id: model.model_id,
      name: model.name
    })
    if (existed) return ctx.body = Response.error(ctx, '保存失败，重复名称')
    // 新增操作
    if (!id) {
      const res = await this.scenesService.create({
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
      select count(*) as total from sugo_market_brain_models as model, sugo_market_brain_scenes as scene, sugo_market_brain_events as event
      where model.id=scene.model_id and event.model_id=model.id and event.scene_id=scene.id and model.id=:model_id and scene.id=:id and event.belongs = 0
    `
    const [{ total }] = await this.scenesService.findBySQL(sql, { id, model_id })
    if (Number(total) > 0) {
      return ctx.body = Response.error(ctx, '操作失败，此场景下包含事件数据')
    }

    let tempModel = await this.modelsService.findOrCreate({ name: '系统暂存用' }, { name: '系统暂存用' })
    let tempScene = await this.scenesService.findOrCreate({ name: '系统暂存用' }, { name: '系统暂存用', model_id: tempModel[0].id })
    await this.eventsService.update({ model_id: tempModel[0].id, scene_id: tempScene[0].id }, { scene_id: id, belongs: 1 })
    const res = await this.scenesService.remove({ id, model_id })
    ctx.body = Response.ok(res)
  }
}
