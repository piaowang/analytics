import { Response } from '../../utils/Response'
import marketBrainTaskService from '../../services/market-brain/task.service'
import { MARKET_BRAIN_TOUCH_UP_WAY } from 'common/constants'
import _ from 'lodash'
import moment from 'moment'
import db, { quoteIdentifiers } from '../../models'
import conf from '../../config'
import FetchKit from '../../utils/fetch-kit'

export default class SugoMarketBrainTasksController {

  constructor() {
    this.marketBrainTaskService =  new marketBrainTaskService()
    this.db = this.marketBrainTaskService.db
  }

  async getList(ctx) {
    let { page, pageSize, where } = ctx.q
    const { jwt_company_name, jwt_store_name, touch_up_way } = _.get(ctx.q, 'where', {})
    const { jwt_company_id, jwt_store_id } = _.get(ctx, 'state.jwtData.others', {})
    where = _.omitBy(where, o => {
      if (o === 0) return false
      return !o
    })
    if (where.name) {
      where.name = {
        $like: `%${where.name}%`
      }
    }
    if (where.execute_time) {
      const [ since, until ] = where.execute_time
      where.execute_time = {
        $between: [
          moment(since).toISOString(),
          moment(until).add(1, 'day').toISOString()
        ]
      }
    }
    let options = {
      raw: true,
      limit: pageSize,
      offset: (page - 1) * pageSize, 
      order: [['created_at', 'DESC']],
      include: [{
        model: db.MarketBrainEvents,
        attributes: ['id', 'jwt_company_name', 'jwt_store_name', 'touch_up_way']
      }]
    }
    let jwtWhere = {
      ..._.pick(where, ['jwt_company_name', 'jwt_store_name', 'touch_up_way'])
    }
    where = _.omit(where, ['jwt_company_name', 'jwt_store_name', 'touch_up_way'])
    if (jwt_company_id || jwt_store_id) {
      if (jwt_company_id) jwtWhere.jwt_company_id = jwt_company_id
      if (jwt_store_id) jwtWhere.jwt_store_id = jwt_store_id
    }
    if (!_.isEmpty(jwtWhere)) {
      options.include[0].where = jwtWhere
    }
    const res = await this.marketBrainTaskService.findAndCountAll(where, options)
    if (res) return ctx.body = Response.ok(res)
  }

  async getOneDetails(ctx) {
    const { id: task_id } = ctx.params
    const { execute_id } = ctx.q
    let where = {
      task_id
    }

    if (execute_id) {
      where = {
        ...where,
        execute_id
      }
    }

    let res = await this.db.MarketBrainTaskDetails.findAll({
      where, raw: true
    })

    const { site: { marketBrainMobileNeedDesensitize = false }, port }= conf

    if (marketBrainMobileNeedDesensitize) {
      let result = await FetchKit.post(`http://localhost:${port}/market-brain-fetch-desensitize-mobile`, { qs: { ug: res } })
      if (result.code === 'SUCCESS') res = _.get(result, 'result', [])
    }

    return ctx.body = Response.ok(res)
  }

  /** 获取事件任务执行记录列表 */
  async getExecutions(ctx) {
    const { task_id } = ctx.params
    const { limit = 10, offset = 0 } = ctx.q
    if (!task_id) {
      return ctx.body = Response.ok([])
    }
    const res = await this.db.MarketBrainTaskExecutions.findAll({
      where: { task_id },
      order: [['created_at', 'DESC']],
      limit,
      offset
    })
    ctx.body = Response.ok(res)
  }

  async getExecutionsByMaxDate(ctx) {
    const { limit = 10, offset = 0, staff_id } = ctx.q

    const { jwt_company_id = '', jwt_store_id = '' } = _.get(ctx, 'state.jwtData.others', {})

    let where = {
      touch_up_way: MARKET_BRAIN_TOUCH_UP_WAY.BYHAND
    }
    //平台用户和单点登录管理员可以看到所有人的活动执行记录 因为这两个角色没有下面两个信息
    if (jwt_company_id) where = {
      ...where,
      jwt_company_id: {
        $or: [{$eq: jwt_company_id},{$eq: null}]
      }
    }
    if (jwt_store_id) where= {
      ...where,
      jwt_store_id: {
        $or: [{$eq: jwt_store_id},{$eq: null}]
      }
    }

    const executeRes = await this.db.MarketBrainTaskExecutions.findAll({
      where,
      order: [['execute_time', 'desc']],
      attributes: {
        include: [[
          db.client.literal(
            `(select count(*) from sugo_market_brain_task_details where ${quoteIdentifiers('MarketBrainTaskExecutions.id')}=sugo_market_brain_task_details.execute_id and who_claim != '')`
          ),
          'userCount'
        ]]
      },
      raw: true
    })
    ctx.body = Response.ok(executeRes)
  }
}
