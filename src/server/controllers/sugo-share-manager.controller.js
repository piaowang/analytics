import _ from 'lodash'
import {Response} from '../utils/Response'
import SugoShareManagerService from '../services/sugo-share-manager.service'
import db from '../models'
import shortid from 'shortid'

export default class SugoExamineController {

  constructor() {
    this.sugoShareManager_service = new SugoShareManagerService()
  }

  getShareList = async ctx => {
    const {pSize, page, type, status, search } = ctx.q
    const params = ['type', 'status', 'search']
    const where = _.pickBy(ctx.q, (v, k) => params.includes(k) && v ) 
    if(params.search) where.screen_name = { $like: `%${params.search}%`}
    const res = await this.sugoShareManager_service.findAndCountAll(where, {
      order: [['created_at', 'DESC']],
      include: [{
        model: db.SugoLiveScreen,
        attributes: ['title']
      }],
      offset: (page - 1)*pSize , limit: pSize
    })
    return ctx.body = Response.ok(res)
  }

  getShareById = async ctx => {
    const {id } = ctx.q
    const res = await this.sugoShareManager_service.findOne({id }, {
      include: [{
        model: db.SugoLiveScreen,
        attributes: ['title']
      }]
    })
    return ctx.body = Response.ok(res)
  }

  saveShareInfo = async ctx => {
    const {id, status, deadline, share_time} = ctx.q
    await this.sugoShareManager_service.update({
      status, deadline, share_time
    }, {id })
    return ctx.body = Response.ok()
  }

  cancelShare = async ctx => {
    const {id } = ctx.q
    await this.sugoShareManager_service.update({
      status: 0, type:  2
    }, {id })
    return ctx.body = Response.ok()
  }

  deleteShare = async ctx => {
    const {id } = ctx.q
    await this.sugoShareManager_service.remove({id })
    return ctx.body = Response.ok()
  }

}
