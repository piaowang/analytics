import { Response } from '../../utils/Response'
import marketingTaskService from '../../services/marketing/task.service'
import MarketingPushLandPageService from '../../services/marketing/push-land-page.service'
import { MARKETING_SEND_CHANNEL } from 'common/constants'
import _ from 'lodash'
import moment from 'moment'

export default class SugoMarketingTaskController {

  constructor() {
    this.marketingTaskService =  new marketingTaskService()
    this.marketingPushLandPageService = new MarketingPushLandPageService()
    this.db = this.marketingTaskService.db
  }

  async getList(ctx) {
    let { page, pageSize, where } = ctx.q
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
    const res = await this.marketingTaskService.findAndCountAll(where, {
      raw: true,
      limit: pageSize,
      offset: (page - 1) * pageSize, 
      order: [['created_at', 'DESC']]
    })
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
    let res = await this.db.MarketingTaskDetails.findAll({
      where, raw: true
    })

    const send_type = _.get(res,'[0].send_type', null)
    if (send_type === MARKETING_SEND_CHANNEL.PUSH) {
      const code = _.get(res,'[0].page_code', null)
      let page_name = await this.marketingPushLandPageService.findOne({code}, {raw: true, attributes: ['name']})
      page_name = page_name.name
      res = res.map( i => ({...i, page_name }))
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
    const res = await this.db.MarketingTaskExecutions.findAll({
      where: { task_id },
      limit,
      offset
    })
    ctx.body = Response.ok(res)
  }
}
