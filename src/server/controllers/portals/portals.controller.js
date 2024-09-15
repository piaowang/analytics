import SugoPortalsService from '../../services/portals/sugo-portals.service'
import {Response} from '../../utils/Response'
import _ from 'lodash'

export default class PortalsController {
  
  async getPortals(ctx) {
    let {id} = ctx.params
    let query = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    let companyId = _.get(ctx.session, 'user.company_id') // 目前允许不登录也能调用
    
    const portalsService = SugoPortalsService.getInstance()
    if (id) {
      let model = await portalsService.findOne(companyId ? {id, companyId} : {id})
      ctx.body = Response.ok(model)
      return
    }
    
    let res = await portalsService.listAndCount(companyId ? {...query, companyId} : query)
    const result  = Response.ok(res.rows)
    result.count = res.count
    ctx.body = result
  }
  
  async createPortal(ctx) {
    let {user} = ctx.session
    let {company_id, id: userId} = user
    let model = ctx.q
    
    const portalsService = SugoPortalsService.getInstance()
    
    // 重名检查
    let sameNameModel = await portalsService.findOne({
      $or: [
        {name: model.name},
        {basePath: model.basePath}
      ],
      companyId: company_id
    })
    if (sameNameModel) {
      throw new Error('存在同名或同路径的门户，请修改名称再试')
    }
    
    model.createdBy = userId
    model.companyId = company_id
    let res = await portalsService.create(model)
    ctx.body = Response.ok(res)
  }
  
  async updatePortal(ctx) {
    let {id} = ctx.params
    let nextInst = ctx.q
    
    let {user} = ctx.session
    let {company_id, id: userId} = user
  
    nextInst.updatedBy = userId
    // TODO 重名检查
    const portalsService = SugoPortalsService.getInstance()
    let res = await portalsService.update(nextInst, {
      id,
      companyId: company_id
    })
    ctx.body = Response.ok(res)
  }
  
  async deletePortal(ctx) {
    let {id} = ctx.params
    
    let {user} = ctx.session
    let {company_id} = user
    const portalsService = SugoPortalsService.getInstance()
    let res = await portalsService.remove({
      id,
      companyId: company_id
    })
    ctx.body = Response.ok(res)
  }
}
