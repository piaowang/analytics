import DBConnectService from '../services/db-connect-setting.service'
import _ from 'lodash'
import {Response} from '../utils/Response'
import db from '../models'
import customOrders from '../services/sugo-custom-orders.service'
import dimensionsServices from '../services/sugo-dimensions.service'
import DashboardCategoryMapService from '../services/sugo-dashboard-category-map.service'

export default class controller {

  constructor() {
    this.ssService = new DBConnectService()
  }

  async create(ctx) {
    const result = await this.ssService.create(ctx.q)
    ctx.body = Response.ok(result)
  }

  async delete(ctx) {
    let id = ctx.q
    let res = await DBConnectService.getInstance().remove({id: id})
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
    let res = await DBConnectService.getInstance().findAndCountAll(where, {
      offset,
      limit
    })
    ctx.body = Response.ok(res)
  }

  async testConnection(ctx) {
    let res = await BusinessDbServices.testConnection(ctx.q)
    ctx.body = res
  }

  async updateState(ctx) {
    let data = ctx.q
    let res = await DBConnectService.getInstance().update(data, {id: data.id})
    ctx.body = Response.ok(res)
  }
}
