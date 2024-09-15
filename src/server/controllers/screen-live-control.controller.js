import db from '../models'
import {Response} from '../utils/Response'
import ScreenLiveControlService from '../services/screen-live-control.service'
import _ from 'lodash'
import {immutateUpdates} from '../../common/sugo-utils'

export default class ScreenLiveControlController {

  constructor() {
    this.screenLiveControlService = new ScreenLiveControlService()
  }

  async getScreenControllerState(ctx) {
    const res = await db.SugoLiveScreenControl.findAll({
      raw:true
    })
    return ctx.body = Response.ok(res)
  }

  async updateScreenLiveControl(ctx) {
    const { id, logger } = ctx.q
    const contain = _.omit(ctx.q, ['id', 'logger'])
    await this.screenLiveControlService.update({ id, contain })
    ctx.body = Response.ok()
  }

  async listLogger(ctx) {
    const {
      page,
      pageSize
    } = ctx.q
    const limit = pageSize || 10 
    const offset = pageSize * (page - 1) || 0
    const q = {
      offset: offset,
      limit: limit,
      order: [
        ['updated_at', 'DESC']
      ],
      attributes: ['id',['created_at', 'time'], 'operate', 'content', ['opera_user', 'operaUser']],
      raw: true
    }
    const res = await db.SugoLiveScreenControlLogger.findAndCountAll(q)
    return ctx.body = Response.ok(res)
  }

  async createLogger(logger, transaction) {
    const res = await db.SugoLiveScreenControlLogger.create(logger, { transaction })
  }

  async createTheme(ctx) {
    const { user } = ctx.session
    const { username } = user
    
    const { title } = ctx.q
    const existed = await db.SugoLiveScreenControlTheme.findOne({
      where: {
        title
      }
    })
    if (existed) return ctx.body = Response.fail('主题名称已存在')
    const res = await db.SugoLiveScreenControlTheme.create(ctx.q)
    const orderby = await db.SugoLiveScreenControl.findAll({attributes: ['id','current_theme_order'],raw: true})
    const order = _.get(orderby,'[0].current_theme_order', [])
    const screenControlId = _.get(orderby,'[0].id', [])
    const newId = _.get(res, 'dataValues.id')
    order.push(newId)
    await this.screenLiveControlService.update({id: screenControlId, contain:{current_theme_order: order}})
    await this.screenLiveControlService.createLogger({
      content: `创建主题${title}`,
      opera_user: username,
      operate: '新建主题'
    })
    return ctx.body = Response.ok()
  }

  async updateTheme(ctx) {
    const { id, logger } = ctx.q
    const contain = _.omit(ctx.q, ['id', 'logger'])
    const existed = await db.SugoLiveScreenControlTheme.findOne({
      where: {
        title: contain.title
      }
    })
    if (existed) return ctx.body = Response.fail('重复名称')
    const res = await db.SugoLiveScreenControlTheme.update({...contain},{
      where: {
        id
      }
    })
    await this.screenLiveControlService.createLogger(logger)
    if (res) return ctx.body = Response.ok()
  }

  async listTheme(ctx) {
    const res0 = await db.SugoLiveScreenControlTheme.findAll({raw:true})
    const defaultScreenCtrl = await db.SugoLiveScreenControl.findOne({attributes: ['current_theme_order'], raw: true})
    const order = _.get(defaultScreenCtrl,'current_theme_order', [])
    let res = _.orderBy(res0, t => _.findIndex(order, oid => oid === t.id))
    ctx.body = Response.ok(res)
  }

  async deleteTheme(ctx) {
    const { id, screenId, logger } = ctx.q
    await db.client.transaction(async transaction => {
      const currScreenCtrl = await db.SugoLiveScreenControl.findOne({
        where: {
          id: screenId
        },
        raw: true,
        transaction
      })
      let nextScreenCtrl = immutateUpdates(currScreenCtrl,
        'current_theme_order', order => _.filter(order, i => i !== id),
        'current_theme_id', currentThemeId => currentThemeId === id ? null : currentThemeId)
      await this.screenLiveControlService.update({id: screenId, contain: nextScreenCtrl, transaction })
      
      await db.SugoLiveScreenControlTheme.destroy({ where: { id }, transaction })
      
      await this.screenLiveControlService.createLogger(logger, transaction)
    })
    ctx.body = Response.ok()
  }

}

