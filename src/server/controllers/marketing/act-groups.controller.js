import { Response } from '../../utils/Response'
import MarketingActManagerService from '../../services/marketing/act-manager.service'
import marketingActivitysService from '../../services/marketing/actives.service'
import db, { quoteIdentifiers } from '../../models'
import moment from 'moment'
import _ from 'lodash'

export default class SugoMarketingActGroupsController {

  constructor() {
    this.marketingActGroupsService =  new MarketingActManagerService()
    this.marketingActivitysService =  new marketingActivitysService()
  }

  async getList(ctx) {
    const { page = 1, pageSize = 10, name, created_range } = ctx.q
    let where = {}
    if (name) where.name = {
      $like: `%${name}%`
    }
    if (!_.isEmpty(created_range)) where.created_at = {
      $between: [
        moment(created_range[0]).toISOString(),
        moment(created_range[1]).add(1, 'day').toISOString()
      ]
    }
    const res = await this.marketingActGroupsService.findAndCountAll(where, {
      raw: true,
      limit: pageSize,
      offset: (page - 1) * pageSize, 
      order: [['created_at', 'DESC']],
      attributes: {
        include: [
          [
            db.client.literal(
              `(select count(*) from sugo_marketing_activitys where ${quoteIdentifiers('MarketingActivityGroups.id')}=sugo_marketing_activitys.group_id)`
            ),
            'actives_count'
          ]
        ]
      }
    })
    ctx.body = Response.ok(res)
  }

  async listAll(ctx) {
    const res = await this.marketingActGroupsService.findAll({}, {
      raw: true,
      attributes: ['id', 'name']
    })
    ctx.body = Response.ok(res)
  }

  async create(ctx) {
    const { name, remark } = ctx.q
    const existed = await this.marketingActGroupsService.findOne({
      name
    })
    if (existed) return ctx.body = Response.fail('分组名已存在')

    let {user} = ctx.session
    let {username} = user
    let params = { name, remark, created_by: username}
    let res = await this.marketingActGroupsService.create(params)
    if (res) ctx.body = Response.ok()
  }

  async update(ctx) {
    const { name, remark, id } = ctx.q
    const existed = await this.marketingActGroupsService.findOne({
      name, id: {
        $ne: id
      }
    })
    if (existed) return ctx.body = Response.fail('分组名已存在')
    
    const res = await this.marketingActGroupsService.update({
      name, remark
    }, { id })
    if (res) return ctx.body = Response.ok()
  }

  async delete(ctx) {
    const id = ctx.params.id
    if (!id) return ctx.body = Response.fail('没有id')
    const existed_active = await this.marketingActivitysService.findOne({
      group_id: id
    })
    if (existed_active) return ctx.body = Response.fail('存在未删除活动')
    const res = await this.marketingActGroupsService.remove({
      id
    })
    if (res) ctx.body = Response.ok()
  }
}
