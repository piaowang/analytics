import SugoPortalPagesService from '../../services/portals/sugo-portal-pages.service'
import { Response } from '../../utils/Response'
import _ from 'lodash'

export default class PortalPagesController {
  async getPortalPages(ctx) {
    let { portalId, id } = ctx.params
    let query = _.isEmpty(ctx.q) ? ctx.query : ctx.q

    const portalPagesService = SugoPortalPagesService.getInstance()
    if (id) {
      let model = await portalPagesService.findOne({ portalId, id })
      ctx.body = Response.ok(model)
      return
    }

    let res = await portalPagesService.listAndCount({ ...query, portalId })
    const result = Response.ok(res.rows)
    result.count = res.count
    ctx.body = result
  }

  async createPortalPage(ctx) {
    let { portalId } = ctx.params
    let { user } = ctx.session
    let { id: currUserId } = user

    let model = ctx.q

    model.portalId = portalId
    model.createdBy = currUserId
    try {
      const portalPagesService = SugoPortalPagesService.getInstance()
      let res = await portalPagesService.create(model)
      ctx.body = Response.ok(res)
    } catch (error) {
      throw new Error('操作失败')
    }
  }

  async updatePortalPage(ctx) {
    let { portalId, id } = ctx.params
    let { user } = ctx.session
    let { id: currUserId } = user

    let nextInst = ctx.q
    nextInst.updatedBy = currUserId
    const portalPagesService = SugoPortalPagesService.getInstance()
    let res = await portalPagesService.update(nextInst, {
      id,
      portalId
    })
    ctx.body = Response.ok(res)
  }

  async deletePortalPage(ctx) {
    let { portalId, id } = ctx.params

    const portalPagesService = SugoPortalPagesService.getInstance()
    let res = await portalPagesService.remove({
      id,
      portalId
    })
    ctx.body = Response.ok(res)
  }
}
