/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:25:09
 * @description 智能营销-营销模型controller
 */
import ModelsService from '../../services/market-brain/models.service'
import customOrderService from '../../services/sugo-custom-orders.service'
import { Response } from '../../utils/Response'
import { CUSTOM_ORDER_MODULES } from 'common/constants'
import _ from 'lodash'

export default class SugoMarketBrainModelsController {

  constructor() {
    this.modelsService =  new ModelsService()
    this.db = this.modelsService.db
  }

  /**
   * @description 排序处理
   * @param {any} ctx
   * @param {any} list
   */
  async sortList (ctx, list) {
    const { company_id, id: userId } = ctx.session.user
    const order = await customOrderService.getCustomModuleOrder({
      module_id: CUSTOM_ORDER_MODULES.MARKETING_MODELS,
      company_id
    })
    const sortIds = _.get(order, 'module_orders', [])
    if(sortIds.length) { // 排序设置
      list = _.sortBy(list, o => sortIds.indexOf(o.id))
    }
    return list
  }

  async getList(ctx) {
    const sql = `
      select model.*,
      (select count(*) from sugo_market_brain_scenes scenes where scenes.model_id=model.id and scenes.status=1) as scene_total,
      (select count(*) from sugo_market_brain_events event, sugo_market_brain_scenes scs where event.model_id=model.id and event.scene_id=scs.id and event.tactics_status=1 and event.belongs=0) as event_total
      from sugo_market_brain_models model
      where model.name <> '系统暂存用'
      group by model.id
      order by model.created_at desc
    `
    let res = await this.modelsService.findBySQL(sql)
    res = await this.sortList(ctx, res)
    ctx.body = Response.ok(res)
  }

  async getAllModelsAndScenes(ctx) {
    let res = await this.modelsService.findAll({}, {
      attributes: ['id', 'name'],
      include: [{
        model: this.db.MarketBrainScenes,
        attributes: ['id', 'name']
      }]
    })
    res = await this.sortList(ctx, res)
    ctx.body = Response.ok(res)
  }

  /**
   * @description 新增、修改模型数据
   * @param {any} ctx
   * @returns 
   * @memberOf SugoMarketBrainModelController
   */
  async save(ctx) {
    const model = ctx.q
    const { id } = ctx.params
    const { company_id, id: userId } = ctx.session.user
    if (!_.isEmpty(model.module_orders)) { // 保存排序设置
      const res = await customOrderService.updateCustomModuleOrder({
        module_orders: model.module_orders,
        module_id: CUSTOM_ORDER_MODULES.MARKETING_MODELS,
        user_id: userId,
        company_id
      })
      return ctx.body = Response.ok(res)
    }
    const existed = await this.modelsService.findOne({ name: model.name }, { raw: true })
    if (!id) {
      if (existed) {
        return ctx.body = Response.error(ctx, '模型名称重复，请重新输入')
      }
      const res = await this.modelsService.create({
        ...model,
        company_id,
        created_by: userId
      })
      return ctx.body = Response.ok(res)
    }

    /**---------------------更新操作-------------------------------- */
    if (existed && existed.id !== id) {
      return ctx.body = Response.error(ctx, '模型名称重复，请重新输入')
    }
    await this.modelsService.update({
      ...model,
      company_id,
      updated_by: userId
    }, { id })
    ctx.body = Response.ok(model)
  }

  async delete(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    // 服务端校验是否没有其他子记录
    const sql = `
      select count(*) as total from sugo_market_brain_scenes as scene left join sugo_market_brain_events as event on scene.id= event.scene_id
      where scene.model_id=:model_id or event.model_id=:model_id and event.belongs = 0
    `
    const [{ total }] = await this.modelsService.findBySQL(sql, { model_id: id })
    if (Number(total) > 0) { // zhi
      return ctx.body = Response.error(ctx, '操作失败，此模型下包含场景数据和策略数据')
    }

    const res = await this.modelsService.remove({ id })
    ctx.body = Response.ok(res)
  }
}
