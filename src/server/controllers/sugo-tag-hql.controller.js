import _ from 'lodash'
import {Response} from '../utils/Response'
import SugoHqlService from '../services/sugo-tag-hql.service'
import UindexDatasourceService from '../services/uindex-datasource.service'
import SugoProjectService from '../services/sugo-project.service'
import { convertContainsByDBType } from './convert-contains-where'

/*** @description 标签计算管理
 * @class SugoTagHqlController
 */
export default class SugoTagHqlController {

  constructor() {
    this.tagHqlService = new SugoHqlService()
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTagHqlController()
    }
    return this._instance
  }

  query = async ctx => {
    const { id, projectId } = ctx.params
    const { page = 1, pageSize = 5, search, tags, status = -1 } = ctx.q
    let whereCond = {}
    if (id) {
      const model = await this.tagHqlService.findOne({...whereCond, id})
      return ctx.body = Response.ok(model)
    }
    // 查询列表时必须带上此参数
    whereCond.project_id = projectId
    if (search) {
      whereCond.$or = [{
        title: {$like: `%${search}%`}
      }]
      if (tags.length) {
        whereCond.$or = whereCond.$or.concat(
          tags.map(tag => convertContainsByDBType('tags', tag))
        )
      }
    }
    if (status !== -1) {
      whereCond.status = status
    }
    // 分页
    const limit = pageSize
    const offset = pageSize * (page - 1)
    const other = {
      order: [
        ['weight', 'DESC'],
        ['updated_at', 'DESC']
      ],
      limit,
      offset
    }
    const models = await this.tagHqlService.findAndCountAll({...whereCond}, other)
    return ctx.body = Response.ok(models)
  }

  create = async ctx => {
    const {user: { id: userId }} = ctx.session
    let obj = ctx.q
    if (!obj.title) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    let existed = await this.tagHqlService.findOne({ title: obj.title, project_id: obj.project_id })
    if (existed) {
      return ctx.body = Response.error(ctx, '你已经添加过同名记录了')
    }
    obj.created_by = userId
    obj.updated_by = userId
    const res = await this.tagHqlService.create(obj)
    return ctx.body = Response.ok(res)
  }

  update = async ctx => {
    const { id } = ctx.params
    let obj = ctx.q
    obj.id = id
    let existed = await this.tagHqlService.findOne({ title: obj.title })
    if (existed && existed.id !== id) {
      return ctx.body = Response.error(ctx, '标签计算任务标题重复，请重新输入')
    }
    const res = await this.tagHqlService.update(obj, { id })
    // TODO 写入修改记录
    // 更新之后重置任务
    // if (obj.status === 1 && _.isEqual(existed.rules.cronExpression, obj.rules.cronExpression)) { // 启动的任务
    //   // 更新之前取消任务
    //   await this.tagHqlService.cancelHqlTask(obj)
    //   await this.tagHqlService.addHqlTask(obj)
    // }
    return ctx.body = Response.ok(res)
  }

  /**
   * @description 删除
   * @memberOf SugoTagHqlController
   */
  remove = async ctx => {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    // 1. 清除定时任务
    await this.tagHqlService.cancelHqlTask(id)
    // 2. 删除tag-hql记录
    const res = await this.tagHqlService.remove({ id })
    ctx.body = Response.ok(res)
  }

  /**
   * @description 启动任务
   * @memberOf SugoTagHqlController
   */
  run = async ctx => {
    const { id: userId } = ctx.session.user
    const { id } = ctx.params
    const { optType } = ctx.q // optType => stop=停止操作, start=启动操作
    if (!id || !optType) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    let tagHQL = await this.tagHqlService.findOne({ id })
    if (!tagHQL) {
      return ctx.body = Response.error(ctx, '操作失败，无效参数id')
    }
    tagHQL = tagHQL.get({plain: true})
    if (optType === 'stop') {
      await this.tagHqlService.update({ updated_by: userId, status: 0 }, { id })
      tagHQL.status = 0
      // 停止操作同时取消调度任务
      await this.tagHqlService.cancelHqlTask(id)
    } else if (optType === 'start') {
      await this.tagHqlService.update({ updated_by: userId, status: 1 }, { id })
      // 启动操作同时启动定时调度任务
      tagHQL.status = 1
      await this.tagHqlService.addHqlTask(tagHQL)
    }
    ctx.body = Response.ok(tagHQL)
  }

  // 手动执行
  manualRun = async ctx => {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    let tagHQL = await this.tagHqlService.findOne({ id })
    if (!tagHQL) {
      return ctx.body = Response.error(ctx, '操作失败，无效参数id')
    }
    tagHQL = tagHQL.get({plain: true})
    try {
      const res = await this.tagHqlService.manualRun(tagHQL)
      ctx.body = Response.ok(res)
    } catch (e) {
      console.log(e.stack)
      ctx.body = Response.error(ctx, e.message)
    }
  }

  /**
   * @description 标签数据导入
   * @memberOf SugoTagHqlController
   */
  dataImport = async ctx => {
    const { id } = ctx.params
    if (!id) {
      return Response.error(ctx, '操作失败，缺少参数')
    }
    const { data, fileInfo } = ctx.q
    const { id: userId, company_id } = ctx.session.user
    const { result: project } = await SugoProjectService.info(id)
    const { tag_datasource_name, id: project_id } = project
    if (!tag_datasource_name) {
      return Response.error(ctx, '操作失败，此项目还未配置标签数据表')
    }
    try {
      const res = await UindexDatasourceService.getInstance().dataImport(tag_datasource_name, data, { ...fileInfo, company_id, created_by: userId })
      ctx.body = Response.ok(res)
    } catch (e) {
      ctx.status = 500
      const res = e.payload
      const body = Response.fail(`导入标签数据失败, 成功[${_.get(res, 'success', 0)}]条, 失败[${_.get(res, 'failed', 0)}]条`)
      body.result = res
      ctx.body = body
    }
  }

  /**
   * @description 取消手动执行的计算任务
   * @memberOf SugoTagHqlController
   */
  cancelManualRun = async ctx => {
    const { id } = ctx.params
    if (!id) {
      return Response.error(ctx, '操作失败，缺少参数')
    }
    try {
      const res = await this.tagHqlService.cancelRunQuery([id])
      ctx.body = Response.ok(res)
    } catch (e) {
      console.log(e.stack)
      ctx.body = Response.error(ctx, e.message)
    }
  }
}
