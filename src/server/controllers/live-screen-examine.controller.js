/* 
  大屏审核, 授权访问
*/
import LiveScreenExamineService from '../services/live-screen-examine.servece'
import {Response} from '../utils/Response'
import db from '../models'

export default class controller {

  constructor() {
    this.examineService = new LiveScreenExamineService()
  }

  async create(ctx) {
    const {live_screen_id, examine_user, status=1, examine_describe=''} = ctx.q
    if (!live_screen_id || !examine_user) {
      ctx.status = 510
      ctx.body = Response.ok({msg: 'error, need live_screen_id && examine_user'})
      return
    }

    const data = {
      live_screen_id,
      status,
      examine_describe,
      examine_user
    }

    let result ={}
    // 一个大屏只能存在一种发布审核状态，live_screen_id 也是主键
    const has = await db.SugoLiveScreenExamine.findOne({where: {live_screen_id}, raw: true})
    if (has) {
      const upDateLength = await db.SugoLiveScreenExamine.update(data, {where: {live_screen_id}})
      if (upDateLength, upDateLength.length) {
        result = {...has, ...data}
      }
    } else {
      result = await db.SugoLiveScreenExamine.create(data, {where: {live_screen_id}})
    }
    
    ctx.body = Response.ok(result)
  }

  async getList(ctx) {
    let res = await await this.examineService.findAll()
    ctx.body = Response.ok(res)
  }

  async getOne(ctx) {
    const {live_screen_id} = ctx.q
    if (!live_screen_id) {
      ctx.body = Response.error({msg: 'error, need live_screen_id'})
      return
    }
    let res = await this.examineService.findOne(
      {live_screen_id},
      {raw: true}
    )
    ctx.body = Response.ok(res)
  }

  async update(ctx) {
    const {live_screen_id, status=0, fail_describe=''} = ctx.q
    if (live_screen_id === undefined || status === undefined) {
      ctx.body = Response.error({msg: 'error, need live_screen_id && status'})
      return
    }
    const data = {
      status, fail_describe
    }
    let res = await this.examineService.update(
      data,
      {live_screen_id}
    )
    ctx.body = Response.ok(res)
  }

  async authorize(ctx) {
    const {live_screen_id, user_ids=[]} = ctx.q
    if (!live_screen_id || !user_ids.length) {
      ctx.body = Response.error({msg: 'error, need user_ids'})
      return
    }
    const res = await db.SugoLiveScreen.update({authorize_to: user_ids}, {
      where: {id: live_screen_id},
      fields: ['authorize_to']
    })
    if (res && res.length) {
      ctx.body = Response.ok(user_ids)
      return
    } else {
      ctx.body = Response.error({msg: '授权失败'})
    }
    
  }
}
