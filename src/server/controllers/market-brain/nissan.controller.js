import { Response } from '../../utils/Response'
import MarketBrainCustomService from '../../services/market-brain/external-user.service'
import MarketBrainTaskDetails from '../../services/market-brain/task-details.service'
import MarketBrainStaffService from '../../services/market-brain/staff.service'
import _ from 'lodash'
import moment from 'moment'
import db from '../../models'
import { redisSetExpire, redisGet } from '../../utils/redis'
import conf from '../../config'
import { jwtSign } from '../../init/jwt-login-middleware'

export default class SugoNissanMarketExecutionsController {

  constructor() {
    this.marketBrainTaskDetails = new MarketBrainTaskDetails()
    this.MarketBrainCustom = new MarketBrainCustomService()
    this.MarketBrainStaff = new MarketBrainStaffService()
  }

  // 用户列表
  async getUserList(ctx) {
    const { executeId } = ctx.params
    let where = {
      execute_id: executeId,
      // who_claim: {
      //   $eq: null
      // }
    }
    const userList = await db.MarketBrainTaskDetails.findAll({
      where,
      raw: true
    })
    return ctx.body = Response.ok(userList)
  }

  // 全部外部联系人
  async getCustomerList(ctx) {
    const { userid } = ctx.params
    const customerList = await db.MarketBrainCustom.findAll({
      where: {
        sa_id: userid
      },
      raw: true
    })
    return ctx.body = Response.ok(customerList)
  }

  // 通过ID查找员工信息
  async getStaffById(ctx) {
    const { userid } = ctx.params
    const staff = await db.MarketBrainStaff.findOne({
      where: {
        userid: userid || ''
      },
      raw: true
    })
    return ctx.body = Response.ok(staff)
  }

}
