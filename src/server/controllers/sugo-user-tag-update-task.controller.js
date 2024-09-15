import UserTagUpdateTaskServ from '../services/sugo-user-tag-update-task.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import {UserTagUpdateTaskUpdateStrategyEnum} from '../../common/constants'
import {Response} from '../utils/Response'

/**
 * 查询多个任务
 * q: { project_id, type, ... }，必须指定 project_id
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let where = ctx.q

  if (!_.get(where, 'project_id')) {
    returnError(ctx, '必须指定 project_id')
    return
  }

  let res = await UserTagUpdateTaskServ.getInstance().findAll(where)
  returnResult(ctx, res)
}

/**
 * 创建标签更新任务
 * body: { project_id, title, type, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = ctx.q

  // 避免 project_id 为空字符串，数据库只是限制不能为 null
  if (!_.get(data, 'project_id')) {
    returnError(ctx, '必须指定 project_id')
    return
  }
  const serv = UserTagUpdateTaskServ.getInstance()
  let existed = await serv.findOne({ title: data.title })
  if (existed) {
    return ctx.body = Response.error(ctx, '用户群定义标签标题重复！')
  }
  let res = await serv.create(data)
  if (_.get(data, 'params.updateStrategy') === UserTagUpdateTaskUpdateStrategyEnum.Interval) {
    await serv.initSingleUserTagUpdateTask(res)
  }
  returnResult(ctx, res)
}

/**
 * 修改标签更新任务
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = ctx.q

  // 避免 project_id 为空字符串，数据库只是限制不能为 null
  if ('project_id' in patch && !_.get(patch, 'project_id')) {
    returnError(ctx, 'project_id 不能为空')
    return
  }

  const serv = UserTagUpdateTaskServ.getInstance()
  let preModTask = await serv.__model.findByPk(modId)
  if (!preModTask) {
    returnError(ctx, '该任务不存在')
    return
  }

  if (_.get(preModTask, 'params.updateStrategy') === UserTagUpdateTaskUpdateStrategyEnum.Interval) {
    await serv.removeSingleUserTagUpdateTask(preModTask)
  }

  let existed = await serv.findOne({ title: patch.title })
  if (existed) {
    return ctx.body = Response.error(ctx, '用户群定义标签标题重复！')
  }

  let res = await UserTagUpdateTaskServ.getInstance().update(patch, { id: modId })

  let nextTask = {...preModTask.get({plain: true}), ...patch}
  if (_.get(nextTask, 'params.updateStrategy') === UserTagUpdateTaskUpdateStrategyEnum.Interval) {
    await serv.initSingleUserTagUpdateTask(nextTask)
  }
  returnResult(ctx, res)
}

/**
 * 删除标签更新任务
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id

  const serv = UserTagUpdateTaskServ.getInstance()
  let preDelTask = await serv.__model.findByPk(delId)
  if (!preDelTask) {
    returnError(ctx, '该任务不存在')
    return
  }

  if (_.get(preDelTask, 'params.updateStrategy') === UserTagUpdateTaskUpdateStrategyEnum.Interval) {
    await serv.removeSingleUserTagUpdateTask(preDelTask)
  }

  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

/**
 * 执行标签更新任务
 * @param ctx
 * @returns {Promise<void>}
 */
async function runTask(ctx) {
  let taskId = ctx.params.id
  let res = await UserTagUpdateTaskServ.getInstance().runTask(taskId)
  returnResult(ctx, res)
}

export default {
  query,
  create,
  update,
  remove,
  runTask
}
