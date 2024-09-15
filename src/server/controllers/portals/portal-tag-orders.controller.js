import SugoPortalTagOrdersService from '../../services/portals/sugo-portal-tag-orders.service'
import {Response} from '../../utils/Response'

export default class PortalTagOrderController {
  sugoPortalTagOrderService = SugoPortalTagOrdersService.getInstance()
  
  async query(ctx) {
    const order = await this.sugoPortalTagOrderService.findAll()
    ctx.body = Response.ok(order)
  }
  
  async create(ctx) {
    const body = ctx.q || ctx.request.body
    body.createdBy = ctx.session.user?.id || 'unknown'
    const res = await this.sugoPortalTagOrderService.create(body)
    ctx.body = Response.ok(res)
  }
  
  async update(ctx) {
    const body = ctx.q || ctx.request.body
    body.updatedBy = ctx.session.user?.id || 'unknown'
    const res = await this.sugoPortalTagOrderService.update(
      body,
      { id: ctx.params.id }
    )
    ctx.body = Response.ok(res)
  }
  
  async destroy(ctx) {
    const res = await this.sugoPortalTagOrderService.remove({
      id: ctx.params.id
    })
    ctx.body = Response.ok(res)
  }
}
