import MarketingPushLandPageService from '../../services/marketing/push-land-page.service'
import { Response } from '../../utils/Response'

export default class SugoMarketingPushLandPageController {

  constructor() {
    this.marketingPushLandPageService =  new MarketingPushLandPageService()
  }

  async getList(ctx) {
    let { page, pageSize, where = {} } = ctx.q
    if (where.name) {
      where.name = {
        $like: `%${where.name}%`
      }
    }
    const res = await this.marketingPushLandPageService.findAndCountAll(where,{
      raw: true,
      limit: pageSize * 1,
      offset: (page - 1) * pageSize, 
      order: [['created_at', 'DESC']]
    })
    if (res) return ctx.body = Response.ok(res)
  }

  async getAllList(ctx) {
    const res = await this.marketingPushLandPageService.findAll({},{
      raw: true,
      attributes: ['id', 'name', 'code']
    })
    if (res) return ctx.body = Response.ok(res)
  }

  async create(ctx) {
    const { user: { id: user_id} } = ctx.session
    const { id, name, code } = ctx.q
    const existed = await this.marketingPushLandPageService.findOne({ $or: { name, code }}, {raw: true})
    if (!id && existed) return ctx.body = Response.fail('名称或CODE重复，请重新输入')
    if (id) {
      if (existed && existed.id !== id) {
        return ctx.body = Response.error(ctx, '名称或CODE重复，请重新输入')
      }
      await this.marketingPushLandPageService.update({...ctx.q, updated_by: user_id }, {id})
      return ctx.body = Response.ok()
    }
    const params = Object.assign(ctx.q, { created_by: user_id})
    await this.marketingPushLandPageService.create(params)
    ctx.body = Response.ok()
  }

  async delete(ctx) {
  }
}
