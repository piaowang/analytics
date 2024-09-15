import { Response } from '../utils/Response'
import SugoTaskProjectService from '../services/sugo-task-project.service'
import SugoTaskService from '../services/sugo-task.service'
import SugoTaskGroupService from '../services/sugo-task-group.service'
import SugoTaskProjectUserService from '../services/sugo-task-project-user.service'
import SugoTaskGroupCategoryService from '../services/sugo-task-group-category.service'
import FetchKit from '../utils/fetch-kit'
import db from '../models'
import _ from 'lodash'
import moment from 'moment'
import C2Q from 'cron-to-quartz'
import sugoCustomerOrder from '../services/sugo-custom-orders.service'
import shortid from 'shortid'
import { tryJsonParse, mapAwaitAll } from '../../common/sugo-utils'
import SugoTaskPropsService from '../services/sugo-task-props.service'
import { convertAlertConfig } from '../../common/convert-alarm-info'
import { getTaskScheduleHostAsync } from './sugo-task-v3.contorller'
import { TASK_SCHEDULE_STATUS } from '../../common/constants'
const recvJSON = ctx => {
  return {
    headers: {
      Accept: 'application/json',
      cookie: ctx.headers['cookie']
    }
  }
}

export default class TaskGroupV3Controller {
  constructor() {
    this.sugoTaskProjectService = SugoTaskProjectService.getInstance()
    this.sugoTaskProjectUserService = SugoTaskProjectUserService.getInstance()
    this.sugoTaskGroupService = SugoTaskGroupService.getInstance()
    this.sugoTaskService = SugoTaskService.getInstance()
    this.sugoTaskPropsService = SugoTaskPropsService.getInstance()
    this.sugoTaskGroupCategoryService = SugoTaskGroupCategoryService.getInstance()
    this.db = this.sugoTaskProjectService.db
  }

  async getTaskGroupByProjectId(ctx) {
    const { task_project_id = '' } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=fetchProjectGroup`)
      let tasks = await this.sugoTaskGroupService.findAll({ task_project_id }, { raw: true })
      let userMap = await db.SugoUser.findAll({ where: { id: { $in: tasks.map(p => p.created_by) } } })
      userMap = _.keyBy(userMap, p => p.id)
      tasks = _.keyBy(tasks, p => p.id)
      const taskIds = _.keys(tasks)
      let result = res.projects
        .filter(p => _.includes(taskIds, p.id.toString()))
        .map(p => ({
          ...p,
          id: p.id.toString(),
          status: _.get(tasks, [p.id, 'status'], ''),
          created_by: _.get(tasks, [p.id, 'created_by'], ''),
          category_id: _.get(tasks, [p.id, 'category_id'], ''),
          created_user: _.get(userMap, [p.id, 'first_name'], '') || _.get(userMap, [p.id, 'username'], '')
        }))
      return (ctx.body = Response.ok(result))
    } catch (error) {
      return (ctx.body = Response.fail('获取流程列表失败!' + error.message))
    }
  }

  // 添加任务流组
  async addTaskGroup(ctx) {
    let { task_id: taskId, name, showName, task_project_id, category_id, description = '' } = ctx.q
    const { company_id, id: userId } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      // 创建工作流
      if (!taskId) {
        let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=createProjectGroup`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ name, showName, description: '', creator: userId })
        })
        if (!res.data) {
          throw new Error('创建工作流组失败' + JSON.stringify(res))
        }
        taskId = res.data.toString()
      } else {
        const resProject = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProjectBaseInfo`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({
            projectId: taskId,
            showName
          })
        })
        if (resProject && resProject.expired) {
          throw new Error('页面已过期,请刷新重试')
        }
        if (!resProject || resProject.status !== 'success') {
          throw new Error(_.get(resProject, 'message', ''))
        }
      }
      let existed = await this.sugoTaskGroupService.findOne({ id: taskId, task_project_id, company_id }, { raw: true })
      await db.client.transaction(async transaction => {
        if (!existed) {
          await this.sugoTaskGroupService.create(
            {
              task_project_id,
              id: taskId,
              name,
              status: 0,
              company_id,
              created_by: userId,
              category_id: category_id === '' ? null : category_id
            },
            { transaction }
          )
        } else {
          await this.sugoTaskGroupService.update(
            {
              status: 0,
              name,
              company_id,
              category_id: category_id === '' ? null : category_id,
              updated_by: userId
            },
            { task_project_id, id: taskId },
            { transaction }
          )
        }
      })
      return (ctx.body = Response.ok(taskId))
    } catch (error) {
      return (ctx.body = Response.fail('添加任务失败!' + error.message))
    }
  }

  /**
   * 保存工作流组
   * @param {*} ctx
   */
  async saveTaskGroup(ctx) {
    let { task_id: taskId, name, showName, task_project_id, graphInfo, params, category_id } = ctx.q
    const { company_id, id: userId } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      if (!taskId) {
        // 创建工作流
        let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=createProjectGroup`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ name, showName, description: '', creator: userId })
        })
        if (!res.data) {
          throw new Error('创建工作流组失败' + JSON.stringify(res))
        }
        taskId = res.data.toString()
      }

      taskId = taskId + ''
      let childrenIds = []
      if (!_.isEmpty(_.get(graphInfo, 'graph.nodes', {}))) {
        // 保存工作流组图形信息
        const resSave = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProjectGroup`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ projectId: taskId, data: { ...graphInfo.graph, title: name, areas: {}, initNum: 1 }, showName })
        })
        if (resSave && resSave.expired) {
          throw new Error('页面已过期,请刷新重试')
        }
        childrenIds = _.keys(graphInfo.graph.nodes).map(p => _.last(p.split('_')))
        if (resSave && resSave.status !== 'success') {
          throw new Error(_.get(resSave, 'message', ''))
        }
      } else {
        throw new Error('工作流组不能为空')
      }

      let existed = await this.sugoTaskGroupService.findOne({ id: taskId, task_project_id, company_id }, { raw: true })
      let removeIds = await this.sugoTaskService.findAll({ task_group_id: taskId, id: { $notIn: childrenIds } }, { raw: true })
      await db.client.transaction(async transaction => {
        // 更新任务表的所属任务组
        if (childrenIds.length) {
          await this.sugoTaskService.update({ task_group_id: taskId }, { id: { $in: childrenIds } }, { transaction })
        }
        if (removeIds.length) {
          await this.sugoTaskService.update({ task_group_id: '' }, { id: { $in: removeIds.map(p => p.id) } }, { transaction })
        }
        if (!existed) {
          await this.sugoTaskGroupService.create(
            {
              task_project_id,
              id: taskId,
              name,
              params,
              status: 0,
              company_id,
              created_by: userId,
              category_id
            },
            { transaction }
          )
        } else {
          await this.sugoTaskGroupService.update(
            {
              params,
              status: 0,
              name,
              company_id,
              updated_by: userId
            },
            { task_project_id, id: taskId },
            { transaction }
          )
        }
      })
      return (ctx.body = Response.ok(taskId))
    } catch (error) {
      return (ctx.body = Response.fail('添加任务失败!' + error.message))
    }
  }

  // 删除任务组
  async deleteTaskGroup(ctx) {
    const { taskProjectId, taskId } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=deleteProject`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({ projectId: taskId })
      })
      if (res.status === 'success') {
        await db.client.transaction(async transaction => {
          await this.sugoTaskService.update({ task_group_id: '' }, { task_group_id: taskId }, { transaction })
          await this.sugoTaskGroupService.remove({ task_project_id: taskProjectId, id: taskId }, { transaction })
        })
        return (ctx.body = Response.ok('删除成功'))
      } else {
        return (ctx.body = Response.fail('删除失败!' + JSON.stringify(res)))
      }
    } catch (error) {
      return (ctx.body = Response.fail('删除失败!' + error.message))
    }
  }

  async setTaskGroupSchedule(ctx) {
    const { id: userId } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    const { id } = ctx.q
    let task = await this.sugoTaskGroupService.findOne(
      {
        id
      },
      { raw: true }
    )

    const { params: pgTaskInfoParams } = task
    const { cronInfo, notifyWarnObj, apiAlertInfos = [] } = pgTaskInfoParams

    // if (moment(cronInfo.taskStartTime).diff(moment()) < 0) {
    //   return ctx.body = Response.fail('开始时间应小于当前时间')
    // }
    if (cronInfo.taskEndTime && moment(cronInfo.taskEndTime).diff(moment(cronInfo.taskStartTime)) < 0) {
      return (ctx.body = Response.fail('结束时间应小于开始时间'))
    }

    const taskChlidren = await this.sugoTaskService.findAll({ task_group_id: id }, { raw: true })
    const scheduleTask = taskChlidren.filter(p => p.status !== '0')
    if (scheduleTask.length > 0) {
      return (ctx.body = Response.fail(`设置调度失败，[${scheduleTask.map(p => p.id).join(',')}]已设置调度`))
    }
    let globalProps = await this.sugoTaskPropsService.findAll({}, { raw: true })
    globalProps = _.reduce(
      globalProps,
      (r, v) => {
        r[`flowOverride[group.${v.name}]`] = v.value
        return r
      },
      {}
    )
    const data = taskChlidren.map(p => {
      const { flowPriority, idealExecutorIds } = _.get(p, 'params.executeParamsObj', {})
      const childrenApiInfos = _.get(p, 'params.apiAlertInfos', [])
      const executeIds = idealExecutorIds ? [idealExecutorIds] : []
      const alertConfig = convertAlertConfig(childrenApiInfos)
      const chlidrenParams = {
        projectId: p.id,
        flowId: p.name,
        executeUser: userId,
        'flowOverride[useExecutorList]': JSON.stringify(executeIds),
        'flowOverride[flowPriority]': (flowPriority || 5) + '',
        alertConfig
      }
      return chlidrenParams
    })
    const concurrentOption = _.get(cronInfo, 'concurrentOption', false) ? { concurrentOption: 'ignore', 'flowOverride[flow.execution.concurrentOption]': 'ignore' } : {}
    const alertConfig = convertAlertConfig(apiAlertInfos)
    let params = {
      groupId: Number(id),
      flowId: task.name,
      cronExpression: C2Q.getQuartz(cronInfo.cronExpression)[0].join(' '),
      scheduleTime: moment(cronInfo.taskStartTime).locale('en').format('hh,mm,A,Z').replace('+', ' '),
      scheduleDate: moment(cronInfo.taskStartTime).format('MM/DD/YYYY'),
      info: {
        ...cronInfo,
        selectedPeriod: cronInfo.period
      },
      data,
      executeUser: userId,
      endSchedTime: cronInfo.taskEndTime ? +moment(cronInfo.taskEndTime) : +moment().add(10, 'y'),
      startSchedTime: +moment(cronInfo.taskStartTime),
      failureAction: 'finishPossible',
      ...globalProps,
      ...concurrentOption,
      alertConfig
    }

    let res = await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=scheduleCronFlowGroup`, null, {
      ...recvJSON(ctx),
      body: JSON.stringify(params)
    })
    if (!res || !res.code || res.code !== 200) {
      return (ctx.body = Response.fail(res.msg))
    }

    await this.sugoTaskGroupService.update(
      {
        status: 2
      },
      { id }
    )

    return (ctx.body = Response.ok())
  }

  async cancelAudit(ctx) {
    const { taskProjectId, taskId, status = '0' } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    const res = await this.sugoTaskGroupService.findOne({ task_project_id: taskProjectId, id: taskId }, { raw: true })
    // 取消调度
    if (res.status === '2') {
      let resSchedules = await FetchKit.get(`${taskScheduleHost}/api3/schedule?action=fetchSchedulesByProject&projectId=${taskId}&flowId=${res.name}`)
      const id = _.get(resSchedules, 'data.0.scheduleId', '')
      if (id) {
        await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=removeSched`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ scheduleId: id })
        })
      }
    }
    await this.sugoTaskGroupService.update({ status }, { task_project_id: taskProjectId, id: taskId })
    return (ctx.body = Response.ok(taskId))
  }

  async getGroupCategory(ctx) {
    const { projectId } = ctx.q
    const { company_id } = ctx.session.user

    try {
      const resCategory = await this.sugoTaskGroupCategoryService.findAll({
        group_category_project_id: projectId
      })
      const order = await sugoCustomerOrder.getCustomModuleOrder({ module_id: `TaskGroupCategory-${projectId}`, company_id })
      return (ctx.body = Response.ok({ types: resCategory, order: _.get(order, 'module_orders', {}) }))
    } catch (error) {
      return (ctx.body = Response.error(error))
    }
  }

  async handleGroupCategory(ctx) {
    const { title, id, projectId, parent_id } = ctx.q
    try {
      if (id === '') {
        await this.sugoTaskGroupCategoryService.create({
          id: shortid(),
          title,
          group_category_project_id: projectId,
          parent_id
        })
        return (ctx.body = Response.ok())
      }
      await this.sugoTaskGroupCategoryService.update({ title, parent_id }, { id })
      return (ctx.body = Response.ok())
    } catch (error) {
      return (ctx.body = Response.error())
    }
  }

  async orderGroupCategory(ctx) {
    const {
      order: { order, tree, type },
      projectId
    } = ctx.q
    const { company_id } = ctx.session.user
    console.log('order----', order, tree, type)
    try {
      const treeList = _.map(tree, (v, k) => ({
        parent_id: k,
        children: v
      }))
      const typeList = _.map(type, (v, k) => ({
        category_id: k,
        taskList: v
      }))
      await db.client.transaction(async transaction => {
        for (let o of treeList) {
          await this.sugoTaskGroupCategoryService.update(
            {
              parent_id: o.parent_id
            },
            { id: { $in: o.children } },
            transaction
          )
        }
        for (let o of typeList) {
          await this.sugoTaskGroupService.update(
            {
              category_id: !o.category_id || o.category_id === '0' || o.category_id === 0 ? null : o.category_id
            },
            { id: { $in: o.taskList } },
            transaction
          )
        }
        await sugoCustomerOrder.updateCustomModuleOrder({
          module_id: `TaskGroupCategory-${projectId}`,
          company_id,
          module_orders: order
        })
      })
      return (ctx.body = Response.ok({ order, tree, type }))
    } catch (error) {
      return (ctx.body = Response.error(error))
    }
  }

  async fetchTaskGroupById(ctx) {
    const { id } = ctx.q
    let res = await this.sugoTaskGroupService.findByPk(id)
    return (ctx.body = Response.ok(res))
  }

  /**
   * 获取调度管理信息
   * @param {*} ctx
   */
  async getScheduleTaskGroup(ctx) {
    let { user } = ctx.session
    let { id, SugoRoles } = user
    const { status, taskProjectId = '', taskName = '' } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    // 获取所有的项目
    let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=getProjectsAndSchedules`)
    // 过滤项目id
    let tasks = []
    let userMap = {}
    let taskIds = undefined
    let taskProjectIds = [taskProjectId]
    // 获取所有有权限的项目
    if (!taskProjectId) {
      // 判断用户组 admin用户组获取所有项目
      let isAdmin = SugoRoles.filter(r => r.type === 'built-in').length
      if (isAdmin) {
        const taskProject = await this.sugoTaskProjectService.dbInstance.findAll({
          where: {},
          raw: true
        })
        taskProjectIds = taskProject.map(p => p.id)
      } else {
        const projectUser = await this.sugoTaskProjectUserService.dbInstance.findAll({
          where: { user_id: id },
          raw: true
        })
        taskProjectIds = projectUser.map(p => p.task_project_id)
      }
    }
    if (!taskProjectIds.length) {
      return (ctx.body = Response.ok([]))
    }
    // 获取项目下所有的工作流id
    if (taskProjectIds.length) {
      let where = { task_project_id: { $in: taskProjectIds } }
      if (status === TASK_SCHEDULE_STATUS.running) {
        where.status = '2'
      } else if (status === TASK_SCHEDULE_STATUS.pause) {
        where.status = '3'
      } else if (status === TASK_SCHEDULE_STATUS.stop) {
        where.status = '0'
      }
      tasks = await this.sugoTaskGroupService.findAll(where, {
        raw: true,
        include: [
          {
            model: db.SugoTaskProject,
            attributes: ['id', 'name']
          }
        ]
      })
      taskIds = tasks.map(p => p.id)
      userMap = await db.SugoUser.findAll({ where: {} })
      userMap = _.keyBy(userMap, p => p.id)
      tasks = _.keyBy(tasks, p => p.id)
    }

    // 过滤实时开发数据
    let result = res.projects
      .filter(p => {
        let hasKey = true
        if (taskName) {
          hasKey = _.includes(p.showName, taskName)
        }
        return _.includes(taskIds, p.id.toString()) && hasKey
      })
      .map(p => {
        const createdId = _.get(tasks, [p.id, 'created_by'], '')
        const updatedId = _.get(tasks, [p.id, 'updated_by'], '')
        return {
          ...p,
          scheduleInfo: _.get(res, `scheduleInfo.${p.id}.0`, null),
          id: p?.id?.toString(),
          status: _.get(tasks, [p?.id, 'status'], ''),
          created_by: _.get(userMap, [createdId, 'first_name'], ''),
          updated_by: _.get(userMap, [updatedId, 'first_name'], ''),
          project_name: _.get(tasks, [p?.id, 'SugoTaskProject.name'], ''),
          taskProjectId: _.get(tasks, [p?.id, 'SugoTaskProject.id'], ''),
          setting: _.get(tasks, [p?.id, 'params'], {}),
          category_id: _.get(tasks, [p?.id, 'category_id'], '')
        }
      })

    return (ctx.body = Response.ok(result))
  }

  async getAllGroupTaskId(ctx) {
    const taskList = await this.sugoTaskGroupService.dbInstance.findAll({
      include: [
        {
          model: db.SugoTaskProject,
          attributes: ['id', 'name'],
          required: true
        }
      ],
      attributes: ['id', 'name'],
      raw: true
    })
    ctx.body = Response.ok(taskList)
  }

  async bulkCancelProjectTaskGroup(ctx) {
    const { scheduleIds, idAndProjectId } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=batchRemoveSchedGroup`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({ scheduleIds })
      })
    } catch (e) {
      return (ctx.body = Response.fail('批量取消失败，请联系管理员'))
    }
    await mapAwaitAll(idAndProjectId, async i => {
      const { id, task_project_id } = i
      await this.sugoTaskGroupService.update({ status: '0' }, { task_project_id, id })
    })
    return (ctx.body = Response.ok())
  }

  async bulkPauseProjectTaskGroup(ctx) {
    const { scheduleIds = [], idAndProjectId = [] } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=batchStopSchedGroup`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({ scheduleIds })
      })
    } catch (e) {
      return (ctx.body = Response.fail('批量暂停失败，请联系管理员'))
    }
    await mapAwaitAll(idAndProjectId, async i => {
      const { id, task_project_id } = i
      await this.sugoTaskGroupService.update({ status: '3' }, { task_project_id, id })
    })
    return (ctx.body = Response.ok())
  }

  async bulkSetGroupSchedule(ctx) {
    const { params, cronInfo, ids } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    // if (moment(cronInfo.taskStartTime).diff(moment()) < 0) {
    //   return ctx.body = Response.fail('开始时间应晚于当前时间')
    // }
    if (cronInfo.taskEndTime && moment(cronInfo.taskEndTime).diff(moment(cronInfo.taskStartTime)) < 0) {
      return (ctx.body = Response.fail('结束时间应晚于开始时间'))
    }
    try {
      const res = await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=batchScheduleCronFlow`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify(params)
      })
    } catch (e) {
      return (ctx.body = Response.fail('设置失败，请联系管理员'))
    }
    await mapAwaitAll(ids, async i => {
      const { id, others } = i
      await this.sugoTaskGroupService.update({ status: '2', params: { ...others, cronInfo } }, { id })
    })
    return (ctx.body = Response.ok())
  }

  async deleteGroupCategory(ctx) {
    const { categoryId } = ctx.q
    try {
      await this.sugoTaskGroupCategoryService.remove({ id: categoryId })
      return (ctx.body = Response.ok())
    } catch (error) {
      return (ctx.body = Response.error(error))
    }
  }
}
