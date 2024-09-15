/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:25:09
 * @description 智能营销-营销模型controller
 */
import ModelsService from '../../services/marketing/models.service'
import customOrderService from '../../services/sugo-custom-orders.service'
import { Response } from '../../utils/Response'
import { CUSTOM_ORDER_MODULES } from 'common/constants'
import _ from 'lodash'

export default class SugoMarketingModelsController {

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
      SELECT model.*,
      (SELECT COUNT(*) FROM sugo_marketing_scenes scenes WHERE scenes.model_id=model.id AND scenes.status=1) AS scene_total,
      (SELECT COUNT(*) FROM sugo_marketing_events event, sugo_marketing_scenes scs WHERE event.model_id=model.id AND event.scene_id=scs.id AND event.status=1) AS event_total
      FROM sugo_marketing_models model
      GROUP BY model.id
      ORDER BY model.created_at DESC;
    `
    let res = await this.modelsService.findBySQL(sql)
    res = await this.sortList(ctx, res)
    ctx.body = Response.ok(res)
  }

  async getAllModelsAndScenes(ctx) {
    let res = await this.modelsService.findAll({}, {
      attributes: ['id', 'name'],
      include: [{
        model: this.db.MarketingScenes,
        attributes: ['id', 'name']
      }]
    })
    res = await this.sortList(ctx, res)
    ctx.body = Response.ok(res)
  }

  async getModelByLifeCycleId(ctx) {
    const { id } = ctx.q

    let res = await this.db.LifeCycleMarketingModel.findOne({
      where: {
        life_cycle_id: id
      },
      include: [{
        model: this.db.MarketingModels
      }],
      raw: true
    })

    return ctx.body = Response.ok(res)
  }

  /**
   * @description 新增、修改模型数据
   * @param {any} ctx
   * @returns 
   * @memberOf SugoMarketingModelsController
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

  /**
   * @description 删除营销模型记录
   * @param {any} ctx
   * @returns
   * @memberOf SugoMarketingModelsController
   */
  async delete(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    // 服务端校验是否没有其他子记录
    const sql = `
      SELECT COUNT(*) AS total FROM sugo_marketing_scenes AS scene LEFT JOIN sugo_marketing_events AS event ON scene.id= event.scene_id
      WHERE scene.model_id=:model_id OR event.model_id=:model_id
    `
    const [{ total }] = await this.modelsService.findBySQL(sql, { model_id: id })
    if (Number(total) > 0) { // zhi
      return ctx.body = Response.error(ctx, '操作失败，此模型下包含场景数据和事件数据')
    }
    const res = await this.modelsService.remove({ id })
    ctx.body = Response.ok(res)
  }
}
