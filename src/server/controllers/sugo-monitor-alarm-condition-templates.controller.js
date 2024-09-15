import {returnResult, returnError} from '../utils/helper'
import SugoMonitorAlarmConditionTemplatesService from '../services/sugo-monitor-alarm-condition-templates.service'
import _ from 'lodash'

/**
 * 告警条件模版控制层
 */
class MonitorAlarmConditionTemplatesController {

  constructor() {
    this._tempSrv = new SugoMonitorAlarmConditionTemplatesService()
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new MonitorAlarmConditionTemplatesController()
    }
    return this._instance
  }

  query = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let whereCond = ctx.q || {}
    if (id) {
      let model = await this._tempSrv.findOne({...whereCond, id, company_id})
      returnResult(ctx, model)
      return
    }
    const models = await this._tempSrv.findAll({...whereCond, company_id})
    returnResult(ctx, models)
  }

  create = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    let obj = ctx.q
    if (!obj.name || !obj.project_id || _.isEmpty(obj.time_rules) || _.isEmpty(obj.metric_rules) || _.isEmpty(obj.query_params)) {
      return returnError(ctx, '操作失败，缺少参数')
    }
    let existed = await this._tempSrv.findOne({ name: obj.name, company_id, project_id: obj.project_id })
    if (existed) {
      return returnError(ctx, '条件模版名称重复了，请使用另外的名称')
    }
    obj.company_id = company_id
    obj.created_by = userId
    obj.updated_by = userId
    let res = await this._tempSrv.create(obj)
    returnResult(ctx, res)
  }

  update = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    obj.updated_by = userId
    const res = await this._tempSrv.update(obj, { id, company_id })
    returnResult(ctx, res)
  }

  remove = async ctx => {
    const { company_id } = ctx.session.user
    const {id} = ctx.params
    const res = await this._tempSrv.remove({ id, company_id })
    returnResult(ctx, res)
  }
}

export default MonitorAlarmConditionTemplatesController.getInstance()
