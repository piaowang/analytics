import { Response } from '../../utils/Response'
import marketBrainTaskExecutionsService from '../../services/market-brain/task-execution.service'
import MarketBrainTaskDetails from '../../services/market-brain/task-details.service'
import _ from 'lodash'
import moment from 'moment'
import db from '../../models'
import { redisSetExpire, redisGet } from '../../utils/redis'
import conf from '../../config'
import { jwtSign } from '../../init/jwt-login-middleware'

export default class SugoMarketBrainExecutionsController {

  constructor() {
    this.marketBrainTaskExecutionsService =  new marketBrainTaskExecutionsService()
    this.marketBrainTaskDetails = new MarketBrainTaskDetails()
  }

  async getCustomerList(ctx) {
    //认领页面的用户列表
    const { executeId } = ctx.params

    let where = {
      execute_id: executeId,
      who_claim: {
        $eq: null
      }
    }
    const userList = await db.MarketBrainTaskDetails.findAll({
      where,
      raw: true
    })
    return ctx.body = Response.ok(userList)
  }

  async claimExecution(ctx) {
    const { id } = ctx.params
    const { staff_id, isGenAct } = ctx.q
    const { jwt_company_id = '', jwt_store_id = '' } = _.get(ctx, 'state.jwtData.others', {})

    let target = await this.marketBrainTaskExecutionsService.findOne({ id }, { raw: true })

    let obj = {}
    if (target.who_claim) {
      //活动已有人认领过
      let who_claim = target.who_claim.split(',')
      if (who_claim.includes(jwt_company_id + jwt_store_id + staff_id)) {
        //且被该用户认领过
        return ctx.body = Response.ok()
      }

      who_claim.push(jwt_company_id + jwt_store_id + staff_id)
      who_claim = who_claim.join(',')
      obj = {
        who_claim
      }
    } else {
      //活动第一次被认领
      obj = {
        who_claim: jwt_company_id + jwt_store_id + staff_id
      }
    }
    await this.marketBrainTaskExecutionsService.update(obj, {
      id
    })

    if (isGenAct) {
      let execution = await this.marketBrainTaskExecutionsService.findOne({
        id
      }, {
        raw: true,
        include: [{
          model: db.MarketBrainTasks,
          attributes: ['module_id']
        }]
      })
      await this.marketBrainTaskDetails.create({
        execute_id: id,
        task_id: execution.task_id,
        send_state: 0,
        module_id: execution['MarketBrainTask.module_id'],
        who_claim: jwt_company_id + jwt_store_id + staff_id
      })
    }

    return ctx.body = Response.ok()
  }

  async claimCustomer(ctx) {
    const { id } = ctx.params
    const { staff_id } = ctx.q
    const { jwt_company_id = '', jwt_store_id = '' } = _.get(ctx, 'state.jwtData.others', {})

    let result = await this.marketBrainTaskDetails.update({
      who_claim: jwt_company_id + jwt_store_id + staff_id
    }, {
      id
    })
    return ctx.body = {
      result,
      cose: 0
    }
  }

  async detailList(ctx) {
    const { id } = ctx.params
    const { jwt_company_id = '', jwt_store_id = '' } = _.get(ctx, 'state.jwtData.others', {})
    const { staff_id } = ctx.q
    //场景1. 按活动id区分，场景2.没带活动id 要把登录用户认领过的人都找出来
    let where = {
      who_claim: { $eq: jwt_company_id + jwt_store_id + staff_id },
      $or: [{send_state: 0},{send_state : 1, send_time: { $gt: moment().add(-7, 'd').startOf('d').toISOString()}}]
    }
    if (id) where = {
      ...where,
      execute_id: id
    }
    let executionWhere = {
      who_claim: { $like: '%' + jwt_company_id + jwt_store_id + staff_id + '%' }
    }
    if (jwt_company_id) executionWhere = {
      ...executionWhere,
      jwt_company_id: {
        $or: [{$eq: jwt_company_id},{$eq: null}]
      }
    }
    if (jwt_store_id) executionWhere= {
      ...executionWhere,
      jwt_store_id: {
        $or: [{$eq: jwt_store_id},{$eq: null}]
      }
    }
    const userList = await db.MarketBrainTaskDetails.findAll({
      where,
      include: [{
        model: db.MarketBrainTaskExecutions,
        where: executionWhere,
        attributes: ['name','execute_time','usergroup_id', 'jwt_store_name', 'url'],
        order: [['name', 'asc']]
      }],
      order: [['send_time', 'desc'], ['send_state', 'desc']],
      raw: true
    })
    return ctx.body = Response.ok(userList)
  }

  async confirmContactUser(ctx) {
    const { id } = ctx.params
    let result = await this.marketBrainTaskDetails.update({
      send_state: 1, //已发送
      send_result: 1, //成功
      send_time: new Date()
    }, {
      id
    })

    let target = await this.marketBrainTaskDetails.findOne({
      id
    }, {
      include: [{
        model: db.MarketBrainTaskExecutions,
        attributes: ['actual_total']
      }],
      attributes: ['execute_id'],
      raw: true
    })
      
    let res = await this.marketBrainTaskExecutionsService.update({
      actual_total: target['MarketBrainTaskExecution.actual_total'] + 1
    }, { id: target.execute_id })
    return ctx.body = {
      result,
      cose: 0
    }
  }
  
  async handleShortLink(ctx) {
    const { short } = ctx.params
    //short一定有 params的内容有两种形式 第二次回来时 会进行重定向 第一次过来处理参数 缓存结果24小时
    if (!short) return ctx.body = {
      success: false,
      message: '短链接失效'
    }
    const { openJwtTokenConf = {} } = conf
    let params = await redisGet('marketBrainH5-' + short + '-fullPropelling')
    if (!params) return ctx.body = {
      success: false,
      message: '短链接失效'
    }

    if (params.includes('actualUrl-')) {
      return ctx.redirect(params.replace('actualUrl-',''))
    }

    const [jwt_company_id, jwt_store_id, staff_id, execution_id] = params.split('/')

    const {
      expiresIn = '24h',
      apiScopes = '',
      pathScopes = ''
    } = openJwtTokenConf

    let user = await db.SugoUser.findOne({
      where: {
        username: 'admin'
      },
      raw: true
    })

    const token = jwtSign(user, {apiScopes: apiScopes.split(','), pathScopes: pathScopes.split(','), expiresIn, setCookie: true}, { jwt_company_id, jwt_store_id, staff_id })

    let actualUrl = `actualUrl-/market-brain/active-detail/${execution_id}?jwtSign=${token}&isWechat=true`
    await redisSetExpire('marketBrainH5-' + short + '-fullPropelling', 24 * 60 * 60, actualUrl)

    return ctx.redirect(actualUrl)
  }

  async getJssdkTicket(ctx) {
    const { forceGet = false } = ctx.q
    const { jwt_company_id = '', jwt_store_id = '' } = _.get(ctx, 'state.jwtData.others', {})

    let res = await this.marketBrainTaskExecutionsService.getJssdkTicket({ 
      company_id: jwt_company_id, 
      store_id: jwt_store_id, 
      forceGet
    })
    return ctx.body = Response.ok(res)
  }

  async getCorpid(ctx) {
    const { jwt_company_id = '', jwt_store_id = '' } = _.get(ctx, 'state.jwtData.others', {})
    let res = await this.marketBrainTaskExecutionsService.getCorpid({ 
      company_id: jwt_company_id, 
      store_id: jwt_store_id, 
    })
    return ctx.body = Response.ok(res)
  }
}
