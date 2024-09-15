import SugoAlarmInterfaceService from '../services/sugo-alarm-interface.service'
import {returnResult, returnError} from '../utils/helper'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'

/**
 * 告警接口控制层
 */
class SugoAlarmInterfaceController {

  constructor() {
    this.alarmInterfaceService =  new SugoAlarmInterfaceService()
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoAlarmInterfaceController()
    }
    return this._instance
  }

  query = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let whereCond = ctx.q || {}
    if (id) {
      let model = await this.alarmInterfaceService.findOne({...whereCond, id, company_id})
      returnResult(ctx, model)
      return
    }
    const models = await this.alarmInterfaceService.findAll({...whereCond, company_id})
    returnResult(ctx, models)
  }

  create = async ctx => {
    const { company_id } = ctx.session.user
    let obj = ctx.q
    if (!obj.name || !obj.url) {
      return returnError(ctx, '操作失败，缺少参数')
    }
    let existed = await this.alarmInterfaceService.findOne({ name: obj.name, company_id })
    if (existed) {
      return returnError(ctx, '你已经添加过这个告警接口了')
    }
    obj.company_id = company_id
    let res = await this.alarmInterfaceService.create(obj)
    returnResult(ctx, res)
  }

  update = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    const res = await this.alarmInterfaceService.update(obj, { id, company_id })
    returnResult(ctx, res)
  }

  remove = async ctx => {
    const { company_id } = ctx.session.user
    const {id} = ctx.params
    const res = await this.alarmInterfaceService.remove({ id, company_id })
    returnResult(ctx, res)
  }
}

export default SugoAlarmInterfaceController.getInstance()

//通过扩展module扩展之
moduleExtend(__filename)
