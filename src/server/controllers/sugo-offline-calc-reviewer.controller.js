import SugoOfflineCalcReviewerService from '../services/sugo-offline-calc-reviewer.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'

export default class SugoOfflineCalcSetReviewerController { 

  constructor() {
    this.sugoOfflineCalcReviewerService = new SugoOfflineCalcReviewerService()
  }
  
  async query(ctx) {
    let where = ctx.q
    
    let res = await this.sugoOfflineCalcReviewerService.findAll(where)
    returnResult(ctx, res)
  }
  
  /**
   * 创建指标模型数据源
   * @param ctx
   * @returns {Promise<void>}
   */
  async create(ctx) {
    let data = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user
    
    const serv = this.sugoOfflineCalcReviewerService
    let res = await serv.create({...data, company_id, created_by: id})
    returnResult(ctx, res)
  }
  
  async update(ctx) {
    let modId = ctx.params.id
    let patch = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user
    
    const serv = this.sugoOfflineCalcReviewerService
    let preMod = await serv.__model.findByPk(modId)
    if (!preMod) {
      returnError(ctx, '该审核主体不存在')
      return
    }
    
    let res = await serv.update({...patch, updated_by: id}, { id: modId, company_id })
    returnResult(ctx, res)
  }
}


