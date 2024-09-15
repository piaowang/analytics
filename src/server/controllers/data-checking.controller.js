import _ from 'lodash'
import db from '../models'

import CheckingService from '../services/data-checking.service'
import { Response } from '../utils/Response'

export default class DataCheckingController {

  constructor() {
    this.checkService = new CheckingService()
  }

  //获取审核列表
  async getList(ctx) {
    let { pageSize, page, status, type, keyWord } = ctx.q || {}

    let query = {
      status,
      type,
      keyWord
    }
    if(ctx.session.user.type !=='built-in'){
      query.unAdmin = true
      query.userId = ctx.session.user.id
    } 
    const res = await this.checkService.getList(
      query,
      pageSize,
      page
    )
    return ctx.body = Response.ok(res)
  }

  //审核或拒绝
  async checkStatus(ctx) {
    let {ctrStatus,text,id} = ctx.q || {}
    let detail = await this.checkService.findCheckData({
      id
    })
    detail = detail.get({plain:true})
    let { company_id } = ctx.session.user
    detail.company_id = company_id

    detail.comment  = text
    detail.checkUserId = ctx.session.user.id
    
    const res = await this.checkService.checkFun(detail,ctrStatus)
    ctx.body = Response.ok(res)
  }

  async getDetail(ctx) {
    let { id } = ctx.q
    const res = await this.checkService.getDetail({id})
    if(res.userDraftId){
      const dep = await db.SugoDepartments.findAll({
        where:{
          id:['id',res.SugoUser.departments]
        },
        attributes: ['id','name'],
        row:true
      })
      res.SugoUser.departments = dep
    }
    ctx.body = Response.ok(res)
  }
}
