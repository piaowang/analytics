import db, { Op } from '../models'
import { Response } from '../utils/Response'
import ScreenLiveControlService from '../services/screen-live-control.service'
import _ from 'lodash'

/**
 * @description 大屏投影控制controller
 * @export
 * @class LiveScreenProjectionController
 */
export default class LiveScreenProjectionController {

  constructor() {
    this.screenLiveControlService = new ScreenLiveControlService()
  }

  /**
   * @description 获取大屏投影配置信息
   * @param {any} ctx
   * @returns
   * @memberOf ScreenLiveControlController
   */
  async getControl(ctx) {
    const res = await db.SugoLiveScreenControl.findOne({
      raw: true
    })
    return ctx.body = Response.ok(res)
  }

  /**
   * @description 保存大屏投影配置
   * @param {any} ctx
   * @memberOf ScreenLiveControlController
   */
  async saveControl(ctx) {
    const control = ctx.q
    if (_.isEmpty(control)) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数！')
    }
    let res = {}
    //有没有记录id
    if (control.id) {
      const data = _.omit(control, ['id', 'logger'])
      res = await this.screenLiveControlService.update(control.id, data)
      return ctx.body = Response.ok(res)
    } else {
      //真的没有吗?
      const hasRecord = await db.SugoLiveScreenControl.findOne({
        raw: true
      })
      if (!hasRecord) {
        //真没有
        const data = _.omit(control, ['id', 'logger'])
        res = await this.screenLiveControlService.create(data)
      } else {
        //还是有的
        const data = {
          ...hasRecord,
          ..._.omit(control, ['id', 'logger'])
        }
        res = await this.screenLiveControlService.update(control.id, data)
      }
    }

    // TODO 通知大屏投影逻辑
    ctx.body = Response.ok(res)
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
      attributes: ['id', ['created_at', 'time'], 'operate', 'content', ['opera_user', 'operaUser']],
      raw: true
    }
    const res = await db.SugoLiveScreenControlLogger.findAndCountAll(q)
    return ctx.body = Response.ok(res)
  }

  async createLogger(logger, transaction) {
    const res = await db.SugoLiveScreenControlLogger.create(logger, { transaction })
  }

  /**
   * @description
   * 预览大屏主题
   * @param {any} ctx 
   * @memberOf LiveScreenProjectionController
   */
  async viewTheme(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '查询失败，缺少参数！')
    }
    const res = await db.SugoLiveScreenControlTheme.findOne({ where: { id }, raw: true })
    const { contains = [] } = res || {}
    if (contains.length) {
      // 合并一维数组
      const allIds = contains.reduce((res, val) => res.concat(val), [])
      // 非空，去重操作
      const notEmptyIds = _.uniq(allIds.filter(_.identity))
      // 查询所有的大屏记录
      const ret = await db.SugoLiveScreen.findAll({
        where: {
          id: { [Op.in]: notEmptyIds }
        },
        raw: true
      })
      // 生成大屏，图片ID字典对象
      const idsDict = ret.reduce((prev, item) => {
        prev[item.id] = item.cover_image_id
        return prev
      }, {})
      // 替换大屏ID为对应的略缩图片ID
      const imgWithContains = contains.map(items => items.map(val => idsDict[val] ? idsDict[val] : ''))
      return ctx.body = Response.ok({
        ...res,
        contains: imgWithContains
      })
    }
    ctx.body = Response.ok(res)
  }

  /**
   * @description 新增、修改大屏投影主题
   * @param {any} ctx
   * @returns 
   * @memberOf LiveScreenProjectionController
   */
  async saveTheme(ctx) {
    const theme = ctx.q
    const { id } = theme
    const { company_id, id: userId, username } = ctx.session.user
    const existed = await db.SugoLiveScreenControlTheme.findOne({
      where: {
        title: theme.title
      },
      raw: true
    })
    if (!id) { // 新增操作
      if (existed) {
        return ctx.body = Response.error(ctx, '主题名称重复，请重新输入')
      }
      const res = await db.SugoLiveScreenControlTheme.create({
        ...theme,
        company_id,
        created_by: userId
      })
      // TODO 事务处理
      await this.screenLiveControlService.createLogger({
        content: `创建主题${theme.title}`,
        opera_user: username,
        operate: '新建主题'
      })
      return ctx.body = Response.ok(res)
    }
    /**---------------------更新操作-------------------------------- */
    if (existed && existed.id !== id) {
      return ctx.body = Response.error(ctx, '主题名称重复，请重新输入')
    }

    const res = await db.SugoLiveScreenControlTheme.update({
      ...theme,
      company_id,
      updated_by: userId
    }, { where: { id } })

    await this.screenLiveControlService.createLogger({
      content: `修改主题${theme.title}`,
      opera_user: username,
      operate: '修改主题'
    })
    ctx.body = Response.ok(res)
  }

  //删除主题 支持多选
  async deleteTheme(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数！')
    }
    // 检查当前主题是否被使用，如果被使用则不允许删除
    const currScreenCtrl = await db.SugoLiveScreenControl.findOne({}, { raw: true })
    const { currentThemes = [] } = currScreenCtrl || {}
    if (_.includes(currentThemes, id)) {
      return ctx.body = Response.error(ctx, '操作失败，当前主题被投影使用中，请先删除引用！')
    }
    const res = await db.SugoLiveScreenControlTheme.destroy({ where: { id } })
    const { logger } = ctx.q
    if (!_.isEmpty(logger)) {
      await this.screenLiveControlService.createLogger(logger)
    }
    ctx.body = Response.ok(res)
  }

  async findOneTheme(ctx) {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '查询失败，缺少参数！')
    }
    const res = await db.SugoLiveScreenControlTheme.findOne({ where: { id }, raw: true })
    ctx.body = Response.ok(res)
  }

  /**
   * @description 获取大屏投影主题列表
   * @param {any} ctx
   * @memberOf LiveScreenProjectionController
   */
  async getThemes(ctx) {
    const { search, page = 1, pageSize = 10 } = ctx.q
    const where = {}
    if (search) {
      where.title = {
        $like: `%${search}%`
      }
    }
    const params = {
      where,
      offset: pageSize * (page * 1 - 1),
      limit: _.toNumber(pageSize),
      order: [
        ['updated_at', 'DESC']
      ],
      attributes: ['id', 'title', 'desc', 'timer', 'contains'],
      raw: true
    }
    const res = await db.SugoLiveScreenControlTheme.findAndCountAll(params)
    ctx.body = Response.ok(res)
  }
}
