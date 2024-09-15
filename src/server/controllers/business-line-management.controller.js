import BusinessLineManagementService from '../services/business-line-management.service.js'
import _ from 'lodash'
import {Response} from '../utils/Response'

export default class controller {

  constructor() {
    this.ssService = new BusinessLineManagementService()
  }

  async create(ctx) {
    var data = ctx.q
    let { user } = ctx.session
    var newData = 
    {
      name:data.name,
      created_by:user.id,
      updated_by:user.id,
      company_id:user.company_id,
      describe:data.describe
    }
    const result = await this.ssService.create(newData)
    ctx.body = Response.ok(result)
  }

  async delete(ctx) {
    let id = ctx.q.id
    let res = await BusinessLineManagementService.getInstance().remove({id: id})
    ctx.body = Response.ok(res)
  }

  async getList(ctx) {
    let {search, limit, offset} = ctx.q
    offset += offset * limit
    let where = {}
    if (search !== '') {
      where = {
        db_alais: {'$like': `%${search}%`}
      }
    }
    let res = await BusinessLineManagementService.getInstance().findAll(null)
    ctx.body = Response.ok(res)
  }

  async updateState(ctx) {
    let data = ctx.q
    let res = await BusinessLineManagementService.getInstance().update(data, {id: data.id})
    ctx.body = Response.ok(res)
  }
}
