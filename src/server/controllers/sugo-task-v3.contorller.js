import { Response } from '../utils/Response'
import SugoTaskProjectService from '../services/sugo-task-project.service'
import SugoTaskService from '../services/sugo-task.service'
import SugoTaskGroupService from '../services/sugo-task-group.service'
import SugoTaskCategoryService from '../services/sugo-task-category.service'
import SugoTaskProjectUserService from '../services/sugo-task-project-user.service'
import SugoTaskProjectDatasourceService from '../services/sugo-task-project-datasource.service'
import sugoCustomerOrder from '../services/sugo-custom-orders.service'
import SugoTaskPropsService from '../services/sugo-task-props.service'
import SugoClonePackage from '../services/sugo-clone-package.service'
import FetchKit from '../utils/fetch-kit'
import db from '../models'
import c2k from 'koa2-connect'
import proxy from 'http-proxy-middleware'
import CONFIG from '../config'
import _ from 'lodash'
import moment from 'moment'
import { redisGet, redisSetExpire } from '../utils/redis'
import C2Q from 'cron-to-quartz'
import shortid from 'shortid'
import { tryJsonParse, mapAwaitAll, forAwaitAll } from '../../common/sugo-utils'
import fs from 'fs'
import path from 'path'
import request from 'request'
import admzip from 'adm-zip'
import multipart from 'koa2-multiparty'
import FormData from 'form-data'
import { convertAlertConfig } from '../../common/convert-alarm-info'
import { DISPLAY_TASK_MODEL, CREATE_TASK_TYPE } from '../constants/task-constant'
import { TASK_SCHEDULE_STATUS } from '../../common/constants'

const recvJSON = ctx => {
  return {
    headers: {
      Accept: 'application/json',
      cookie: ctx.headers['cookie']
    }
  }
}
const { taskScheduleHost: configTaskScheduleHost, taskYarnLogsUrls } = CONFIG
export const getTaskScheduleHostAsync = async () => {
  let host = ''
  // 如果未配置多个节点
  if (configTaskScheduleHost.indexOf(',') === -1) {
    return configTaskScheduleHost
  }
  await forAwaitAll(configTaskScheduleHost.split(','), async p => {
    if (p && !host) {
      const res = await FetchKit.get(`${p}/api3/leader`, null, {
        handleErr: () => console.log(`-------------- ${p}获取az leader错误`)
      })
      if (res && res.status === 'success') {
        const protocol = configTaskScheduleHost.split(':')[0] || 'http'
        host = `${protocol}://${res.leader}`
      }
    }
  })
  if (host) {
    return host
  }
  throw new Error('数据开发中心服务配置错误')
}

let proxyMiddleware = async ctx => {
  const target = await getTaskScheduleHostAsync()
  return c2k(
    proxy({
      target: `${target}`,
      changeOrigin: true,
      pathRewrite: {
        '^/app/task-schedule-v3': '/api3' // rewrite path
      }
    })
  )(ctx)
}

export default class BusinessDimensionController {
  constructor() {
    this.sugoTaskProjectService = SugoTaskProjectService.getInstance()
    this.sugoTaskService = SugoTaskService.getInstance()
    this.sugoTaskProjectUserService = SugoTaskProjectUserService.getInstance()
    this.sugoTaskProjectDatasourceService = SugoTaskProjectDatasourceService.getInstance()
    this.sugoTaskCategoryService = SugoTaskCategoryService.getInstance()
    this.db = this.sugoTaskProjectDatasourceService.db
    this.sugoTaskGroupService = SugoTaskGroupService.getInstance()
    this.sugoTaskPropsService = SugoTaskPropsService.getInstance()
    this.sugoClonePackage = SugoClonePackage.getInstance()
  }

  // 1.保存项目
  // 2.添加用户
  // 3.删除用户
  // 4.授权数据源
  // 5.添加数据源
  // 6.添加私有数据源
  // 7.删除数据源（公共数据源删除引用. 私有数据源删除记录） 删除前判断是否引用
  // 8.数据源列表过滤私有数据源
  async saveTaskProject(ctx) {
    ctx.body = Response.ok()
  }

  async getProject(ctx) {
    let { user } = ctx.session
    let { id, SugoRoles } = user
    let isAdmin = SugoRoles.filter(r => r.type === 'built-in').length

    if (isAdmin) {
      const taskProject = await this.sugoTaskProjectService.dbInstance.findAll({
        where: {},
        order: [['updated_at', 'DESC']],
        raw: true
      })
      const res = taskProject.map(p => ({ ...p, role_type: 2 }))
      ctx.body = Response.ok(res)
      return
    }

    const projectUser = await this.sugoTaskProjectUserService.dbInstance.findAll({
      where: { user_id: id },
      raw: true
    })

    const projectMap = _.keyBy(projectUser, p => p.task_project_id)

    const taskProject = await this.sugoTaskProjectService.dbInstance.findAll({
      where: { id: { $in: _.keys(projectMap) } },
      order: [['updated_at', 'DESC']],
      raw: true
    })
    const res = taskProject.map(p => ({ ...p, role_type: _.get(projectMap, `${p.id}.role_type`) }))
    ctx.body = Response.ok(res)
  }

  async createProject(ctx) {
    let { user } = ctx.session
    let { company_id, id } = user
    let { name, description } = ctx.q

    if (!name) {
      ctx.body = Response.error(ctx, '项目名不能为空')
      return
    }
    const newProject = {
      name,
      description,
      company_id,
      created_by: id
    }
    const result = await this.sugoTaskProjectService.dbInstance.create(newProject, { raw: true })
    if (result && result.id) {
      ctx.body = Response.ok(result)
    } else {
      ctx.body = Response.error(result)
    }
  }

  async editorProject(ctx) {
    let { user } = ctx.session
    let { company_id } = user
    let { id, name, description } = ctx.q

    if (!name && !id) {
      ctx.body = Response.error(ctx, '参数错误')
      return
    }

    const editorProject = {
      name,
      description,
      company_id
    }
    const result = await this.sugoTaskProjectService.dbInstance.update(editorProject, { where: { id } })

    if (result && result.length > 0) {
      ctx.body = Response.ok(result)
    } else {
      ctx.body = Response.error(result)
    }
  }

  async deleteProject(ctx) {
    let { id } = ctx.q

    const taskScheduleHost = await getTaskScheduleHostAsync()
    if (!id) {
      ctx.body = Response.error(ctx, '参数错误')
      return
    }

    const taskList = await this.sugoTaskService.dbInstance.findAll({ where: { task_project_id: id }, raw: true })
    if (taskList && taskList.length) {
      ctx.body = Response.fail('该项目下存在任务节点，请删除后重试')
      return
    }

    const TaskProjectDatasourceList = await this.sugoTaskProjectDatasourceService.dbInstance.findAll({ where: { task_project_id: id }, raw: true })
    if (TaskProjectDatasourceList && TaskProjectDatasourceList.length) {
      //  检测azkaban数据源
      const { dataBaseInfo } = await FetchKit.get(`${taskScheduleHost}/api3/dataBase?action=dataBaseInfo`)
      if (
        _.intersection(
          _.map(dataBaseInfo, p => p.id),
          _.map(TaskProjectDatasourceList, p => p.db_id)
        ).length
      ) {
        ctx.body = Response.fail('该项目下存在关联数据源，请删除后重试')
        return
      } else {
        await this.sugoTaskProjectDatasourceService.remove({ task_project_id: id })
      }
    }

    await this.sugoTaskProjectUserService.dbInstance.destroy({ where: { task_project_id: id } })
    const result = await this.sugoTaskProjectService.dbInstance.destroy({ where: { id } })
    ctx.body = Response.ok(result)
  }

  async getAllTaskId(ctx) {
    const taskList = await this.sugoTaskService.dbInstance.findAll({
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

  async getTaskMapping(ctx) {
    let { id, singleUser } = ctx.q
    let { user } = ctx.session
    let { id: userId } = user

    if (!id) {
      ctx.body = Response.error(ctx, '参数错误')
      return
    }
    let where = { task_project_id: id }
    if (singleUser) {
      where.user_id = userId
    }
    const result = await this.sugoTaskProjectUserService.dbInstance.findAll({ where, raw: true })

    ctx.body = Response.ok(result)
  }

  async editProjectUser(ctx) {
    let { id, ...opt } = ctx.q
    await this.sugoTaskProjectUserService.update(opt, { id })
    ctx.body = Response.ok()
  }

  async projectAddUser(ctx) {
    let { user } = ctx.session
    let { company_id, id } = user
    let { project_id, user_id } = ctx.q

    if (!project_id || !user_id) {
      ctx.body = Response.error(ctx, '项目名不能为空')
      return
    }

    const newMapping = user_id.map(p => ({
      task_project_id: project_id,
      user_id: p,
      company_id
    }))

    const result = await db.client.transaction(async transaction => {
      await this.sugoTaskProjectUserService.__bulkCreate(newMapping, transaction)
      return true
    })

    if (result) {
      ctx.body = Response.ok()
    } else {
      ctx.body = Response.error(ctx, '操作失败')
    }
  }

  async projectDeleteUser(ctx) {
    let { id } = ctx.q

    if (!id) {
      ctx.body = Response.error(ctx, '参数错误')
      return
    }
    const result = await this.sugoTaskProjectUserService.dbInstance.destroy({ where: { id } })
    ctx.body = Response.ok(result)
  }

  // 根据项目id获取所有的工作流id还有工作流组id,不传则默认查询全部
  async getAllTasksByProjectId(ctx) {
    const { project_id = '' } = ctx.q
    try {
      // 去获取后台数据库中所有的任务流
      const taskScheduleHost = await getTaskScheduleHostAsync()
      let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=getProjects`)
      // 创建筛选条件
      let queryData = {}
      project_id ? (queryData = { task_project_id: project_id }) : null

      let tasks = await this.sugoTaskService.findAll(queryData, { raw: true })
      tasks = _.keyBy(tasks, p => p.id)
      const taskIds = _.keys(tasks)

      let taskGroups = await this.sugoTaskGroupService.findAll(queryData, { raw: true })
      taskGroups = _.keyBy(taskGroups, p => p.id)
      const taskGroupIds = _.keys(taskGroups)

      // 如果是实时的数据，在后台数据库返回的metadata-projectType的值是realTimeTask
      const result = {
        // 离线的工作流
        tasks: res.projects
          .filter(p => {
            return p?.metadata?.projectType !== DISPLAY_TASK_MODEL.realTimeTask && _.includes(taskIds, p.id.toString())
          })
          .map(p => {
            return {
              ...p,
              task_project_id: _.get(tasks, [p.id.toString(), 'task_project_id'], '')
            }
          }),
        //离线的工作流组
        taskGroups: res.projects
          .filter(p => {
            return p?.metadata?.projectType !== DISPLAY_TASK_MODEL.realTimeTask && _.includes(taskGroupIds, p.id.toString())
          })
          .map(p => ({
            ...p,
            task_project_id: _.get(taskGroups, [p.id.toString(), 'task_project_id'], '')
          }))
      }
      return (ctx.body = Response.ok(result))
    } catch (error) {
      return (ctx.body = Response.fail('获取指定项目下所有工作流组/工作流失败!' + error.message))
    }
  }
  // 根据项目id获取已经链接的数据库
  async getCheckDB(ctx) {
    const { projectId } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    console.log('BusinessDimensionController -> getCheckDB -> taskScheduleHost', taskScheduleHost)
    try {
      // const {dataBaseInfo } = await FetchKit.get(`http://172.16.12.73:12320/api3/dataBase?action=dataBaseInfo`)
      const { dataBaseInfo } = await FetchKit.get(`${taskScheduleHost}/api3/dataBase?action=dataBaseInfo`)
      const permitDB = await this.sugoTaskProjectDatasourceService.findAll(
        {
          task_project_id: projectId
        },
        {
          attributes: ['db_id']
        }
      )
      const temList = (permitDB || []).map(item => item.db_id)
      const dbList = dataBaseInfo.filter(item => {
        return temList.includes(item.id.toString())
      })
      const useDbIds = await this.sugoTaskProjectDatasourceService.findAll({
        db_id: { $in: temList },
        task_project_id: projectId,
        is_use: true
      })
      const useDbIdsStr = useDbIds.map(item => item.db_id)
      const useDbList = dbList.filter(item => useDbIdsStr.includes(typeof item.id === 'number' ? item.id.toString() : item.id))
      return (ctx.body = Response.ok({ dbList, useDbList }))
      // return ctx.body = Response.ok(useDbIds)
    } catch (error) {
      return (ctx.body = Response.fail(`获取流程列表失败!:${error}`))
    }
  }

  // 更新连接的数据库
  async updateCheckDB(ctx) {
    const { projectId = '', dbIds = '' } = ctx.q
    if (projectId === '') return (ctx.body = Response.error(ctx, '未传入项目Id'))
    const dbList = dbIds.toString().split(',')
    await db.client.transaction(async transaction => {
      await this.sugoTaskProjectDatasourceService.update(
        {
          is_use: false
        },
        {
          task_project_id: projectId.toString()
        },
        transaction
      )

      for (let index = 0; index < dbList.length; index++) {
        await this.sugoTaskProjectDatasourceService.update(
          {
            is_use: true
          },
          {
            db_id: dbList[index].toString(),
            task_project_id: projectId.toString()
          },
          transaction
        )
      }
    })
    return (ctx.body = Response.ok({ projectId, dbIds }))
  }

  // 创建并连接数据库
  async createAndUseDB(ctx) {
    const { projectId, dbId } = ctx.q
    await this.sugoTaskProjectDatasourceService.create({
      db_id: dbId.toString(),
      task_project_id: projectId,
      is_use: true
    })
    return (ctx.body = Response.ok({ projectId, dbId }))
  }

  // 删除连接的数据库
  async delCheckDB(ctx) {
    const { projectId = '', dbIds = '' } = ctx.q
    if (projectId === '') return (ctx.body = Response.error(ctx, '未传入项目Id'))
    const dbList = dbIds.toString().split(',')
    await this.sugoTaskProjectDatasourceService.update(
      {
        is_use: false
      },
      { task_project_id: projectId, db_id: { $in: dbList } }
    )
    return (ctx.body = Response.ok(null))
  }

  // 获取授权的项目列表
  async getAuthorize(ctx) {
    const { dbId = '' } = ctx.query
    const projectList = await this.sugoTaskProjectService.findAll(
      {},
      {
        attributes: [
          ['id', 'projectId'],
          ['name', 'projectName']
        ]
      }
    )
    const cList = await this.sugoTaskProjectDatasourceService.findAll(
      { db_id: dbId },
      {
        attributes: [['task_project_id', 'id']]
      }
    )
    const checkList = cList.map(item => item.id)
    const res = {
      projectList,
      checkList
    }
    ctx.body = Response.ok(res)
  }

  // 更新授权项目列表
  async updateAuthorize(ctx) {
    const { db_id = '', porjects = '' } = ctx.q
    if (db_id === '') return (ctx.body = Response.error(ctx, '未传入数据库Id'))
    const projectsList = porjects.toString().split(',')
    await db.client.transaction(async transaction => {
      await this.sugoTaskProjectDatasourceService.remove(
        {
          db_id: db_id.toString()
        },
        transaction
      )
      await projectsList.forEach(item => {
        this.sugoTaskProjectDatasourceService.create({
          is_use: true,
          db_id: db_id.toString(),
          task_project_id: item
        })
      }, transaction)
    })
    return (ctx.body = Response.ok(null))
  }

  /*
  获取项目下所有任务
  task_project_id：项目id，
  projectType：工作流类型，task：离线，realTime：实时
  */

  async getTaskByProjectId(ctx) {
    const { task_project_id = '', projectType = '' } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=getProjects`)
      let tasks = await this.sugoTaskService.findAll({ task_project_id }, { raw: true, order: [['created_at', 'DESC']] })
      tasks = _.keyBy(tasks, p => p.id)
      const taskIds = _.keys(tasks)
      let result = res.projects.filter(p => _.includes(taskIds, p.id.toString()))
      result = _.orderBy(result, ['id'], ['desc']).map(p => ({
        ...p,
        id: p.id.toString(),
        status: _.get(tasks, [p.id, 'status'], ''),
        created_by: _.get(tasks, [p.id, 'created_by'], ''),
        category_id: _.get(tasks, [p.id, 'category_id'], ''),
        task_group_id: _.get(tasks, [p.id, 'task_group_id'], '')
      }))
      if (projectType === DISPLAY_TASK_MODEL.realTimeTask) {
        return (ctx.body = Response.ok(result.filter(e => e.metadata.projectType === projectType)))
      }
      if (projectType === DISPLAY_TASK_MODEL.realtimeCollect) {
        return (ctx.body = Response.ok(result.filter(e => e.projectTag === CREATE_TASK_TYPE.realtimeCollect)))
      }
      if (projectType === DISPLAY_TASK_MODEL.realTimeCalc) {
        return (ctx.body = Response.ok(result.filter(e => e.projectTag === CREATE_TASK_TYPE.realTimeCalc)))
      }
      // 非实时的旧数据为空白
      return (ctx.body = Response.ok(
        result.filter(e => {
          return e.metadata.projectType !== DISPLAY_TASK_MODEL.realTimeTask && e.projectTag !== CREATE_TASK_TYPE.realtimeCollect && e.projectTag !== CREATE_TASK_TYPE.realTimeCalc
        })
      ))
    } catch (error) {
      return (ctx.body = Response.fail('获取流程列表失败!' + error.message))
    }
  }

  // 新增或者修改任务
  async saveTask(ctx) {
    const { task_project_id, name, category_id, showName, projectType, id: taskId } = ctx.q
    const { id: userId, company_id } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    let task_id = taskId
    try {
      // 如果存在taskid。则是去更新，否则是去创建一个新的
      if (!taskId) {
        let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=create`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({
            name,
            showName,
            description: '',
            projectType,
            projectTag: _.get(CREATE_TASK_TYPE, projectType, 0),
            creator: userId
          })
        })
        if (!res.projectId) {
          throw new Error('创建流程失败' + JSON.stringify(res))
        }
        res = res ? res : {}
        task_id = res.projectId.toString()
        let status = 0 //这个字段暂时没啥用，不太明白之前的逻辑，先保留这，具体可以看saveTaskParams
        await this.sugoTaskService.create({
          task_project_id,
          id: task_id,
          name,
          status,
          company_id,
          category_id: category_id ? category_id : null,
          created_by: userId
        })
      } else {
        const resProject = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProjectBaseInfo`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ projectId: task_id, showName })
        })
        if (resProject && resProject.expired) {
          throw new Error('页面已过期,请刷新重试')
        }
        if (!resProject || resProject.status !== 'success') {
          throw new Error(_.get(resProject, 'message', ''))
        }
        await this.sugoTaskService.update(
          {
            category_id: category_id ? category_id : null
          },
          { id: task_id }
        )
      }
      return (ctx.body = Response.ok(task_id))
    } catch (error) {
      return (ctx.body = Response.fail('添加任务失败!'))
    }
  }

  // 删除任务
  async deleteTask(ctx) {
    const { taskProjectId, taskId } = ctx.q
    const obj = await this.sugoTaskService.findOne({ task_project_id: taskProjectId, id: taskId }, { raw: true })
    if (obj.task_group_id) {
      return (ctx.body = Response.fail(`已被工作流组[${obj.task_group_id}]引用,请删除引用后重试!`))
    }
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=deleteProject`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({ projectId: taskId })
      })
      if (res.status === 'success') {
        await this.sugoTaskService.remove({ task_project_id: taskProjectId, id: taskId })
        return (ctx.body = Response.ok('删除成功'))
      } else {
        return (ctx.body = Response.fail('删除失败!'))
      }
    } catch (error) {
      return (ctx.body = Response.fail('删除失败!', error.message))
    }
  }

  // 提交审核
  async submitAudit(ctx) {
    const { taskProjectId, taskId } = ctx.q
    await this.sugoTaskService.update({ status: 1 }, { task_project_id: taskProjectId, id: taskId })
    return (ctx.body = Response.ok(taskId))
  }

  async cancelAudit(ctx) {
    const { taskProjectId, taskId, status = '0' } = ctx.q
    const res = await this.sugoTaskService.findOne({ task_project_id: taskProjectId, id: taskId }, { raw: true })
    const taskScheduleHost = await getTaskScheduleHostAsync()
    // 取消调度
    if (res.status === '2') {
      let resSchedules = await FetchKit.get(`${taskScheduleHost}/api3/schedule?action=fetchSchedulesByProject&projectId=${taskId}&flowId=${encodeURI(res.name)}`)
      const id = _.get(resSchedules, 'data.0.scheduleId', '')
      if (id) {
        const cancelRes = await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=removeSched`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ scheduleId: id })
        })
        if (!cancelRes || cancelRes.status !== 'success') {
          return (ctx.body = Response.fail('取消调度失败!' + cancelRes.message))
        }
      }
    }
    await this.sugoTaskService.update({ status }, { task_project_id: taskProjectId, id: taskId })
    return (ctx.body = Response.ok(taskId))
  }

  // 保存工作流
  async saveTaskParams(ctx) {
    let { task_id, name, showName, task_project_id, graphInfo, params, jobName, category_id, jobParams, projectType = '' } = ctx.q
    const { company_id, id: userId } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      if (!task_id) {
        // 创建工作流
        let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=create`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ name, showName, description: '', creator: userId })
        })
        if (!res.projectId) {
          throw new Error('创建流程失败' + JSON.stringify(res))
        }
        task_id = res.projectId.toString()
      }
      task_id = task_id + ''
      const taskProps = { ...jobParams, nodeType: JSON.stringify(_.get(graphInfo, 'nodeType', {})) }
      if (!_.isEmpty(_.get(graphInfo, 'graph.nodes', {}))) {
        if (!_.isEmpty(taskProps)) {
          // 保存工作流公共属性
          const resSaveProps = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=setProjectProps`, null, {
            ...recvJSON(ctx),
            body: JSON.stringify({ projectId: task_id, param: taskProps, jobName })
          })
          if (resSaveProps && resSaveProps.expired) {
            throw new Error('页面已过期,请刷新重试')
          }
          if (!resSaveProps || resSaveProps.status !== 'success') {
            throw new Error('保存任务属性失败' + _.get(resSaveProps, 'message', ''))
          }
        }
        // 保存工作流图形信息
        const resProject = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProject`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({
            projectId: task_id,
            jobName,
            data: { ...graphInfo.graph, title: name, areas: {}, initNum: 1 },
            showName,
            projectType: projectType ? projectType : undefined
          })
        })
        if (resProject && resProject.expired) {
          throw new Error('页面已过期,请刷新重试')
        }
        if (!resProject || resProject.status !== 'success') {
          throw new Error(_.get(resProject, 'message', ''))
        }
      }
      let status = 0

      let existed = await this.sugoTaskService.findOne({ id: task_id, task_project_id, company_id }, { raw: true })

      if (!existed) {
        await this.sugoTaskService.create({
          task_project_id,
          id: task_id,
          name,
          params,
          status,
          company_id,
          created_by: userId,
          category_id
        })
      } else {
        await this.sugoTaskService.update(
          {
            params,
            status,
            name,
            company_id,
            updated_by: userId
          },
          { task_project_id, id: task_id }
        )
      }
      return (ctx.body = Response.ok(task_id))
    } catch (error) {
      console.log(error)
      return (ctx.body = Response.fail('保存任务失败!' + error.message))
    }
  }

  // // 保存工作流
  // async saveImmediateTaskParams(ctx) {
  //   let { flowId, taskId, jobName, showName, emails, projectType, graphInfo, ...res } = ctx.q
  //   const taskScheduleHost = await getTaskScheduleHostAsync()
  //   try {
  //     if (!_.isEmpty(_.get(graphInfo, 'graph.nodes', {}))) {
  //       const resProject = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProject`, null, {
  //         ...recvJSON(ctx),
  //         body: JSON.stringify({
  //           ...res,
  //           projectId: taskId,
  //           jobName,
  //           showName,
  //           projectType: projectType ? projectType : undefined
  //         })
  //       })
  //       if (resProject && resProject.expired) {
  //         throw new Error('页面已过期,请刷新重试')
  //       }
  //       if (!resProject || resProject.status !== 'success') {
  //         throw new Error(_.get(resProject, 'message', ''))
  //       }
  //     }
  //     const params = {
  //       flowId,
  //       projectId: taskId,
  //       failureEmails: emails,
  //       failureEmailsOverride: !!emails,
  //       successEmails: emails,
  //       successEmailsOverride: !!emails,
  //       'flowOverride[flowPriority]': '5',
  //       'flowOverride[useExecutorList]': '[]'
  //     }
  //     try {
  //       await FetchKit.post(`${taskScheduleHost}/api3/executor?action=executeFlow`, null, {
  //         ...recvJSON(ctx),
  //         body: JSON.stringify(params)
  //       })
  //     }
  //     catch (err) {
  //       return ctx.body = Response.error(err)
  //     }
  //     return ctx.body = Response.ok(taskId)
  //   } catch (error) {
  //     console.log(error)
  //     return ctx.body = Response.fail('保存任务失败!' + error.message)
  //   }
  // }
  async getPermitDB(ctx) {
    const { projectId } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      const { dataBaseInfo } = await FetchKit.get(`${taskScheduleHost}/api3/dataBase?action=dataBaseInfo`)

      const useDbIds = await this.sugoTaskProjectDatasourceService.findAll(
        {
          is_use: true,
          task_project_id: projectId
        },
        {
          attributes: ['db_id']
        }
      )
      const temList = useDbIds.map(item => item.db_id.toString())
      const dbList = dataBaseInfo.filter(item => temList.includes(item.id.toString()))
      return (ctx.body = Response.ok(dbList))
    } catch (error) {
      return (ctx.body = Response.fail('获取流程列表失败!'))
    }
  }

  async getTaskPublishList(ctx) {
    const { status = '1' } = ctx.q
    let { user } = ctx.session
    let { company_id, id } = user
    let realTaskListIds = []
    let realTaskListRes = { projects: [] }
    let taskMap = {}
    let shouldDiffAzkabanAndPgTasks = await redisGet('shouldDiffAzkabanAndPgTasks')
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      realTaskListRes = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=getProjects`)
      taskMap = _.reduce(
        realTaskListRes.projects,
        (r, v) => {
          r[v.id] = _.get(v, 'flows.0.id', '')
          return r
        },
        {}
      )
      if (realTaskListRes.status === 'success' && !shouldDiffAzkabanAndPgTasks) {
        realTaskListRes.projects.map(i => {
          realTaskListIds.push(i.id)
        })
        let shouldDelPgTasksIds = []
        let allTasksIds = await this.sugoTaskService.findAll({}, { raw: true, attributes: ['id'] })
        allTasksIds = allTasksIds.map(i => i.id)
        //默认taskid 一定是以数字形式存在阿兹卡班
        shouldDelPgTasksIds = allTasksIds.filter(i => !realTaskListIds.includes(Number(i)))
        if (!_.isEmpty(shouldDelPgTasksIds)) {
          await this.sugoTaskService.remove({
            id: {
              $or: shouldDelPgTasksIds
            }
          })
        }
        //diff锁 每小时最多一次
        await redisSetExpire('shouldDiffAzkabanAndPgTasks', 60 * 60, true)
      }
    } catch (e) {
      console.log(e)
    }
    let where = {
      status: status + ''
    }
    let includeWhere = {
      created_by: id
    }
    if (status + '' === '3') {
      where = {
        created_by: id,
        company_id,
        status: {
          $ne: '0'
        }
      }
      includeWhere = {}
    }

    let res = await this.sugoTaskService.findAll(where, {
      raw: true,
      include: [
        {
          model: db.SugoTaskProject,
          attributes: ['id', 'name'],
          where: includeWhere
        }
      ]
    })

    let realTaskNameShowNameDict = {}
    realTaskListRes.projects.map(i => {
      realTaskNameShowNameDict[i.name] = i.showName
    })
    res = res.map(i => {
      i.name = realTaskNameShowNameDict[i.name] || i.name
      i.flowId = taskMap[i.id]
      return i
    })
    return (ctx.body = Response.ok(res))
  }

  async examineTask(ctx) {
    const { id, status } = ctx.q
    await this.sugoTaskService.update(
      {
        status
      },
      { id }
    )
    return (ctx.body = Response.ok('审批成功'))
  }

  async fetchTaskById(ctx) {
    const { id } = ctx.q
    let res = await this.sugoTaskService.findByPk(id)
    return (ctx.body = Response.ok(res))
  }

  async fetchTaskProjectById(ctx) {
    const { id } = ctx.q
    let res = await this.sugoTaskProjectService.findByPk(id)
    return (ctx.body = Response.ok(res))
  }

  // 手动执行
  async handleExecutor(ctx) {
    const { projectId, flowId, isTaskGroup, alertConfig } = ctx.q
    let { user } = ctx.session
    let { id: userId } = user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    const taskModel = isTaskGroup ? this.sugoTaskGroupService : this.sugoTaskService
    let task = await taskModel.findOne({ id: projectId }, { raw: true })
    const executeIds = _.get(task, 'params.executeParamsObj.idealExecutorIds')
    const concurrentOption = _.get(task, 'params.cronInfo.concurrentOption', false)
      ? { concurrentOption: 'ignore', ...(isTaskGroup ? { 'flowOverride[flow.execution.concurrentOption]': 'ignore' } : {}) }
      : {}
    const params = {
      'flowOverride[useExecutorList]': JSON.stringify(executeIds ? [executeIds] : []),
      'flowOverride[flowPriority]': _.get(task, 'params.executeParamsObj.flowPriority', '5').toString()
    }
    let globalProps = await this.sugoTaskPropsService.findAll({}, { raw: true })
    globalProps = _.reduce(
      globalProps,
      (r, v) => {
        r[`flowOverride[${isTaskGroup ? 'group.' : ''}${v.name}]`] = v.value
        return r
      },
      {}
    )
    try {
      const res = await FetchKit.post(`${taskScheduleHost}/api3/executor?action=executeFlow`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({ projectId, flowId, alertConfig, executeUser: userId, ...params, ...globalProps, failureAction: 'finishPossible', ...concurrentOption })
      })
      return (ctx.body = Response.ok(res))
    } catch (err) {
      return (ctx.body = Response.error(ctx, err.message))
    }
  }

  async copyTask(ctx) {
    const { taskProjectId, taskId, newTaskName, newTaskShowName } = ctx.q
    let { user } = ctx.session
    let { company_id, id: userId } = user
    const taskScheduleHost = await getTaskScheduleHostAsync()

    try {
      const res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=copyProject`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({ projectId: taskId, newProjectName: newTaskName, newProjectShowName: newTaskShowName })
      })
      if (!res.projectId) {
        throw new Error('创建流程失败')
      }
      await this.sugoTaskService.create({
        task_project_id: taskProjectId,
        id: res.projectId.toString(),
        name: newTaskName,
        params: {},
        status: 0,
        company_id,
        created_by: userId
      })
      return (ctx.body = Response.ok(res))
    } catch (err) {
      return (ctx.body = Response.error(ctx, err.message))
    }
  }
  // 编辑工作流分类
  async handleCategory(ctx) {
    let { title, id, projectId, parent_id, projectType, type } = ctx.q
    try {
      // 没有parentid的时候，设置实时的父级为0，离线的父级为1
      if (projectType === DISPLAY_TASK_MODEL.realTimeTask && !parent_id) {
        parent_id = 1
      } else if (projectType === DISPLAY_TASK_MODEL.offLineTask && !parent_id) {
        parent_id = 0
      }
      if (id === '') {
        await this.sugoTaskCategoryService.create({
          id: shortid(),
          project_type: projectType,
          title,
          category_project_id: projectId,
          parent_id,
          type
        })
        return (ctx.body = Response.ok())
      }
      await this.sugoTaskCategoryService.update({ title, parent_id }, { id })
      return (ctx.body = Response.ok())
    } catch (error) {
      return (ctx.body = Response.error(ctx, error.message))
    }
  }
  // 获取分类
  async getCategory(ctx) {
    const { projectId, projectType } = ctx.q
    const { company_id } = ctx.session.user
    try {
      const resCategory = await this.sugoTaskCategoryService.findAll({
        category_project_id: projectId
      })
      const order = await sugoCustomerOrder.getCustomModuleOrder({ module_id: `TaskCategory-${projectId}-${projectType}`, company_id })
      return (ctx.body = Response.ok({ types: resCategory, order: _.get(order, 'module_orders', {}) }))
    } catch (error) {
      return (ctx.body = Response.error(ctx, error.message))
    }
  }

  // 保存分类
  async orderCategory(ctx) {
    const {
      order: { order, tree, type },
      projectId,
      projectType
    } = ctx.q
    const { company_id } = ctx.session.user

    try {
      const treeList = _.map(tree, (v, k) => ({
        parent_id: k,
        children: v
      }))
      const typeList = _.map(type, (v, k) => ({
        category_id: k === '0' || !k ? null : k, // 排序后顶层category默认为“0”，需要设置为null。解决保存排序外键报错
        taskList: v
      }))
      await db.client.transaction(async transaction => {
        for (let o of treeList) {
          await this.sugoTaskCategoryService.update(
            {
              parent_id: o.parent_id
            },
            { id: { $in: o.children } },
            transaction
          )
        }
        for (let o of typeList) {
          await this.sugoTaskService.update(
            {
              category_id: o.category_id
            },
            { id: { $in: o.taskList } },
            transaction
          )
        }
        await sugoCustomerOrder.updateCustomModuleOrder({
          module_id: `TaskCategory-${projectId}-${projectType}`,
          company_id,
          module_orders: order
        })
      })
      return (ctx.body = Response.ok(order))
    } catch (error) {
      return (ctx.body = Response.error(ctx, error.message))
    }
  }

  async deleteCategory(ctx) {
    const { categoryId } = ctx.q
    try {
      await this.sugoTaskCategoryService.remove({ id: categoryId })
      return (ctx.body = Response.ok())
    } catch (error) {
      return (ctx.body = Response.error(ctx, error.message))
    }
  }

  /**
   * 获取任务组信息
   * @param {*} ctx
   */
  async getTaskGroupList(ctx) {
    const { task_project_id = '' } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=fetchGroupProjects`)
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
          created_user: _.get(userMap, [p.id, 'first_name'], '') || _.get(userMap, [p.id, 'username'], '')
        }))
      return (ctx.body = Response.ok(result))
    } catch (error) {
      return (ctx.body = Response.fail('获取流程列表失败!' + error.message))
    }
  }

  /**
   * 保存工作流组
   * @param {*} ctx
   */
  async saveTaskGroup(ctx) {
    let { taskId, name, showName, taskProjectId, graphInfo, params } = ctx.q
    const { company_id, id: userId } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      if (!taskId) {
        // 创建工作流
        let res = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=createFlowGroup`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ name, showName, description: '' })
        })
        if (!res.projectId) {
          throw new Error('创建工作流组失败')
        }
        taskId = res.projectId.toString()
      }
      taskId = taskId + ''
      if (!_.isEmpty(_.get(graphInfo, 'graph.nodes', {}))) {
        // 保存工作流组图形信息
        const resSave = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProject`, null, {
          ...recvJSON(ctx),
          body: JSON.stringify({ projectId: taskId, data: { ...graphInfo.graph, title: name, areas: {}, initNum: 1 }, showName })
        })
        if (resSave && resSave.status !== 'success') {
          throw new Error('创建工作流组失败' + resSave.msg)
        }
      }
      let existed = await this.sugoTaskGroupService.findOne({ id: taskId, taskProjectId, company_id }, { raw: true })

      if (!existed) {
        await this.sugoTaskGroupService.create({
          taskProjectId,
          id: taskId,
          name,
          params,
          status: 0,
          company_id,
          created_by: userId
        })
      } else {
        await this.sugoTaskGroupService.update(
          {
            params,
            status: 0,
            name,
            company_id,
            updated_by: userId
          },
          { taskProjectId, id: taskId }
        )
      }
      return (ctx.body = Response.ok(taskId))
    } catch (error) {
      return (ctx.body = Response.fail('添加任务失败!' + error.message))
    }
  }

  //todo
  // async cancelAudit(ctx) {
  //   const { task_project_id, projectId } = ctx.q
  //   await this.sugoTaskService.update({ task_project_id, id: projectId }, { status: 2 })
  // }

  async setSchedule(ctx) {
    const { id, flowId } = ctx.q
    let { user } = ctx.session
    let { id: userId } = user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    let task = await this.sugoTaskService.findOne(
      {
        id
      },
      { raw: true }
    )

    if (task.task_group_id) {
      const taskGroup = await this.sugoTaskGroupService.findOne({ id: task.task_group_id }, { raw: true })
      if (taskGroup.status !== '0') {
        return (ctx.body = Response.fail('设置调度失败，所属任务组已启用调度'))
      }
    }
    const { params: pgTaskInfoParams } = task
    if (_.isEmpty(pgTaskInfoParams)) {
      return (ctx.body = Response.fail('请先保存工作流'))
    }
    const { cronInfo, executeParamsObj, notifyWarnObj, apiAlertInfos = [] } = pgTaskInfoParams
    const { flowPriority, idealExecutorIds } = executeParamsObj
    const { emailAlertType, successEmails } = notifyWarnObj
    const executeIds = idealExecutorIds ? [idealExecutorIds] : []

    // if (moment(cronInfo.taskStartTime).diff(moment()) < 0) {
    //   return ctx.body = Response.fail('开始时间应晚于当前时间')
    // }
    let globalProps = await this.sugoTaskPropsService.findAll({}, { raw: true })
    globalProps = _.reduce(
      globalProps,
      (r, v) => {
        r[`flowOverride[${v.name}]`] = v.value
        return r
      },
      {}
    )
    if (cronInfo.taskEndTime && moment(cronInfo.taskEndTime).diff(moment(cronInfo.taskStartTime)) < 0) {
      return (ctx.body = Response.fail('结束时间应晚于开始时间'))
    }
    const concurrentOption = _.get(cronInfo, 'concurrentOption', false) ? { concurrentOption: 'ignore' } : {}
    const alertConfig = convertAlertConfig(apiAlertInfos)
    let params = {
      projectId: Number(id),
      flowId: flowId,
      cronExpression: C2Q.getQuartz(cronInfo.cronExpression)[0].join(' '),
      scheduleTime: moment(cronInfo.taskStartTime).locale('en').format('hh,mm,A,Z').replace('+', ' '),
      scheduleDate: moment(cronInfo.taskStartTime).format('MM/DD/YYYY'),
      info: {
        ...cronInfo,
        selectedPeriod: cronInfo.period
      },
      'flowOverride[useExecutorList]': JSON.stringify(executeIds),
      'flowOverride[flowPriority]': (flowPriority || 5) + '',
      endSchedTime: cronInfo.taskEndTime ? +moment(cronInfo.taskEndTime) : +moment().add(10, 'y'),
      startSchedTime: +moment(cronInfo.taskStartTime),
      executeUser: userId,
      alertConfig,
      ...globalProps,
      ...concurrentOption
    }

    if (successEmails.length) {
      if (emailAlertType === 'on_all') {
        params.successEmails = successEmails
        params.failureEmails = successEmails
      }
      if (emailAlertType === 'on_success') {
        params.successEmails = successEmails
      }
      if (emailAlertType === 'on_failed') {
        params.failureEmails = successEmails
      }
    }

    let res = await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=scheduleCronFlow`, null, {
      ...recvJSON(ctx),
      body: JSON.stringify(params)
    })
    if (typeof res === 'string') res = JSON.parse(res)
    if (!res || !res.status || res.status !== 'success') {
      return (ctx.body = Response.fail())
    }

    await this.sugoTaskService.update(
      {
        status: 2
      },
      { id }
    )

    return (ctx.body = Response.ok())
  }

  /**
   * 获取调度管理信息
   * @param {*} ctx
   */
  async getScheduleTask(ctx) {
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
      tasks = await this.sugoTaskService.findAll(where, {
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
        return p?.metadata?.projectType !== DISPLAY_TASK_MODEL.realTimeTask && _.includes(taskIds, p.id.toString()) && hasKey
      })
      .map(p => {
        const createdId = _.get(tasks, [p.id, 'created_by'], '')
        const updatedId = _.get(tasks, [p.id, 'updated_by'], '')
        return {
          ...p,
          scheduleInfo: _.get(res, `scheduleInfo.${p.id}.0`, null),
          id: p?.id?.toString(),
          status: _.get(tasks, [p.id, 'status'], ''),
          created_by: _.get(userMap, [createdId, 'first_name'], ''),
          updated_by: _.get(userMap, [updatedId, 'first_name'], ''),
          project_name: _.get(tasks, [p.id, 'SugoTaskProject.name'], ''),
          taskProjectId: _.get(tasks, [p.id, 'SugoTaskProject.id'], ''),
          setting: _.get(tasks, [p.id, 'params'], {}),
          category_id: _.get(tasks, [p.id, 'category_id'], '')
        }
      })

    return (ctx.body = Response.ok(result))
  }

  async bulkCancelProjectTask(ctx) {
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
      await this.sugoTaskService.update({ status: '0' }, { task_project_id, id })
    })

    return (ctx.body = Response.ok())
  }

  async bulkPauseProjectTask(ctx) {
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
      await this.sugoTaskService.update({ status: '3' }, { task_project_id, id })
    })

    return (ctx.body = Response.ok())
  }

  async bulkSetSchedule(ctx) {
    const { params, cronInfo, ids } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()

    // if (moment(cronInfo.taskStartTime).diff(moment()) < 0) {
    //   return ctx.body = Response.fail('开始时间应晚于当前时间')
    // }
    if (cronInfo.taskEndTime && moment(cronInfo.taskEndTime).diff(moment(cronInfo.taskStartTime)) < 0) {
      return (ctx.body = Response.fail('结束时间应晚于开始时间'))
    }
    try {
      await FetchKit.post(`${taskScheduleHost}/api3/schedule?action=batchScheduleCronFlow`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify(params)
      })
    } catch (e) {
      return (ctx.body = Response.fail('设置失败，请联系管理员'))
    }
    await mapAwaitAll(ids, async i => {
      const { id, others } = i
      await this.sugoTaskService.update({ status: '2', params: { ...others, cronInfo } }, { id })
    })

    return (ctx.body = Response.ok())
  }

  async saveTaskGlobalProps(ctx) {
    const { propsList } = ctx.q
    let { user } = ctx.session
    let { company_id, id } = user
    const list = propsList.map(p => ({ ...p, created_by: id, company_id }))
    await db.client.transaction(async t => {
      await this.sugoTaskPropsService.remove({}, { transaction: t })
      await this.sugoTaskPropsService.__bulkCreate(list, t)
    })
    return (ctx.body = Response.ok())
  }

  async getTaskGlobalProps(ctx) {
    const res = await this.sugoTaskPropsService.findAll({}, { raw: true })
    return (ctx.body = Response.ok(res))
  }

  // 获取yran日志
  async getTaskYarnLogsPath(ctx) {
    const { execId, jobId, attempt } = ctx.q
    const taskScheduleHost = await getTaskScheduleHostAsync()
    // 获取applicationid
    let res = await FetchKit.get(`${taskScheduleHost}/api3/executor?action=fetchExternalApplicationIds&execid=${execId}&jobId=${jobId}&attempt=${attempt}`)
    if (!res || res.status !== 'success') {
      ctx.body = Response.fail('获取applicationId失败')
      return
    }
    if (!res.applicationIds.length) {
      ctx.body = Response.fail('获取applicationId为空')
      return
    }
    let applications = []
    for (let i = 0; i < res.applicationIds.length; i++) {
      const resState = await FetchKit.get(`${taskYarnLogsUrls.stateUrl}/ws/v1/cluster/apps/application_${res.applicationIds[i]}/state`)
      applications.push({ id: res.applicationIds[i], isFinish: _.get(resState, 'state') === 'FINISHED' })
    }
    let logPath = []
    for (let i = 0; i < applications.length; i++) {
      if (applications[i].isFinish) {
        // 检查已跑完作业日志需要先校验spark版本
        const checkApiUrl = `${taskYarnLogsUrls.finishExecutorsUrl}/api/v1/applications/application_${applications[i].id}`
        const checkRet = await FetchKit.get(checkApiUrl)
        // sparmk2.4.4 和spark2.4.7日志路径不同，需要特殊判断，暂根据attemptId是否存在判断高版本有attemptId返回
        const url = _.get(checkRet, 'attempts[0].attemptId') ? `${checkApiUrl}/1/allexecutors` : `${checkApiUrl}/allexecutors`
        const result = await FetchKit.get(url)
        logPath = _.concat(
          logPath,
          result.map(p => {
            const path = _.get(p, 'executorLogs.stderr', '')
            if (!path || !path.indexOf('start=')) {
              return path
            }
            return path.substr(0, path.lastIndexOf('start=') + 6) + '0'
          })
        )
      } else {
        const result = await FetchKit.get(
          `${taskYarnLogsUrls.runningExecutorsUrl}/proxy/application_${applications[i].id}/api/v1/applications/application_${applications[i].id}/allexecutors`
        )
        logPath = _.concat(
          logPath,
          result.map(p => {
            const path = _.get(p, 'executorLogs.stderr', '')
            if (!path || !path.indexOf('start=')) {
              return path
            }
            return path.substr(0, path.lastIndexOf('start=') + 6) + '0'
          })
        )
      }
    }
    ctx.body = Response.ok(logPath)
    return
  }

  async getTaskYarnLogsPathInfo(ctx) {
    const { url } = ctx.q
    let res = await FetchKit.get(url)
    let html = res.substr(res.indexOf('<meta http-equiv="refresh"'))
    const logUrl = html.substring(html.indexOf('url=') + 4, html.indexOf('">'))
    if (!_.trim(logUrl)) {
      ctx.body = res
      return
    }
    res = await FetchKit.get(logUrl + '/stderr/?start=0')
    ctx.body = res
    return
  }

  async createClonePackage(ctx) {
    const { name, desc, task_ids } = ctx.q
    const {
      user: { id }
    } = ctx.session
    const res = await this.sugoClonePackage.create({
      name,
      desc,
      task_ids,
      type: 1,
      created_by: id,
      updated_by: id
    })
    return (ctx.body = Response.ok(res))
  }

  async getClonePackages(ctx) {
    const { type } = ctx.q
    const res = await this.sugoClonePackage.findAll(
      { type },
      {
        include: [
          {
            model: db.SugoTaskProject,
            attributes: ['id', 'name']
          }
        ],
        order: [['created_at', 'DESC']]
      }
    )
    return (ctx.body = Response.ok(res))
  }

  async deleteClonePackage(ctx) {
    const { packageIds } = ctx.q
    const ids = packageIds.split(',')
    await this.sugoClonePackage.remove({
      id: { $in: ids }
    })
    return (ctx.body = Response.ok())
  }

  async getAllTasks(ctx) {
    const taskScheduleHost = await getTaskScheduleHostAsync()
    try {
      let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=getProjects`)
      let tasks = await this.sugoTaskService.findAll(
        {},
        {
          raw: true,
          include: [
            {
              model: db.SugoTaskProject,
              attributes: ['id', 'name']
            },
            {
              model: db.SugoTaskCategory,
              attributes: ['title']
            }
          ]
        }
      )
      tasks = _.keyBy(tasks, p => p.id)
      const taskIds = _.keys(tasks)
      let result = res.projects
        .filter(p => {
          return p?.metadata?.projectType !== DISPLAY_TASK_MODEL.realTimeTask && _.includes(taskIds, p.id.toString())
        })
        .map(p => ({
          ...p,
          id: p.id.toString(),
          status: _.get(tasks, [p.id, 'status'], ''),
          created_by: _.get(tasks, [p.id, 'created_by'], ''),
          category_id: _.get(tasks, [p.id, 'category_id'], ''),
          task_group_id: _.get(tasks, [p.id, 'task_group_id'], ''),
          task_project_id: _.get(tasks, [p.id, 'SugoTaskProject.id'], ''),
          task_project_name: _.get(tasks, [p.id, 'SugoTaskProject.name'], ''),
          task_category_title: _.get(tasks, [p.id, 'SugoTaskCategory.title'], '')
        }))
      result.sort((a, b) => b.createTimestamp - a.createTimestamp)
      return (ctx.body = Response.ok(result))
    } catch (err) {
      return (ctx.body = Response.fail(err))
    }
  }

  async importClonePackage(ctx) {
    const { projectId, desc, name, isCover, filename } = ctx.q
    let {
      user: { id, company_id, type }
    } = ctx.session
    const filePath = path.resolve('/tmp', filename)
    var zip = new admzip(filePath)
    if (!zip) {
      return (ctx.body = Response.fail('压缩数据格式错误'))
    }
    const taskScheduleHost = await getTaskScheduleHostAsync()
    // 找配置文件
    let configEntry = zip.getEntries().find(entry => entry.entryName.indexOf('batch.meta') > 0)
    //读取文件
    let configData = zip.readAsText(configEntry, 'utf8')
    // 获取分类信息
    let categoryData = zip.readAsText('taskCategory.json', 'utf8')

    try {
      configData = JSON.parse(configData)
      categoryData = JSON.parse(decodeURI(categoryData))
    } catch (error) {
      return (ctx.body = Response.fail('压缩数据格式错误'))
    }

    const oldTaskNames = configData.map(p => p.showName)
    // 获取所有任务
    let res = await FetchKit.get(`${taskScheduleHost}/api3/manager?action=getProjects`)
    let azTasks = res.projects.filter(p => _.includes(oldTaskNames, p.showName)).map(p => ({ id: p.id, showName: p.showName }))

    // 判断前端数据是否存在同一个项目
    let dbTasks = await this.sugoTaskService.findAll({ id: { $in: azTasks.map(p => p.id.toString()) }, task_project_id: projectId }, { raw: true })
    dbTasks = _.reduce(
      dbTasks,
      (r, v) => {
        r[(_.find(azTasks, p => p.id.toString() === v.id) || {}).showName] = v.id
        return r
      },
      {}
    )

    // 生成新的后端映射关系 及覆盖的category_Id关系
    let updateCategoryData = []
    let newConfigData = configData.map(p => {
      let showName = p.showName
      let projectId = ''
      const dbTaskId = _.get(dbTasks, showName, '')
      if (isCover && dbTaskId) {
        projectId = dbTaskId
        // 分类和工作流的关系
        const obj = categoryData.tasksCategory.find(c => c.id === p.projectId.toString())
        updateCategoryData.push({ ...obj, id: dbTaskId })
      } else if (!isCover && dbTaskId) {
        showName = `${showName}_copy`
      }
      return {
        ...p,
        projectId,
        showName: showName
      }
    })

    // 修改压缩包
    zip.updateFile(configEntry, JSON.stringify(newConfigData))

    // 保存压缩包
    zip.writeZip('/' + filePath)

    // 上传文件
    const formData = new FormData()
    formData.append('file', fs.createReadStream(filePath))
    const headers = formData.getHeaders()
    let uploadRes = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=batchUpload`, null, {
      body: formData,
      headers //: { ...headers, 'Content-Type':'application/zip,application/x-zip,application/x-zip-compressed'}
    })
    const createdProjects = _.get(uploadRes, 'createdProjects')
    if (!uploadRes || !createdProjects) {
      return (ctx.body = Response.fail('上传到服务器错误'))
    }

    // 生成新数据
    const addTask = _.reduce(
      createdProjects,
      (r, v, k) => {
        let obj = configData.find(p => (!isCover ? p.showName === v.showName.replace('_copy', '') : p.showName === v.showName)) || {}
        obj = categoryData.tasksCategory.find(p => p.id.toString() === obj.projectId.toString())
        r.push({ id: v.id, category_id: _.get(obj, 'category_id') })
        return r
      },
      []
    )

    await db.client.transaction(async transaction => {
      // 写入克隆信息
      await this.sugoClonePackage.create(
        {
          type: 2,
          desc,
          task_ids: _.concat(addTask, updateCategoryData)
            .map(p => p.id)
            .join(','),
          project_id: projectId,
          name,
          created_by: id,
          updated_by: id
        },
        { transaction }
      )

      // 写入分类信息
      if (categoryData.categorys && categoryData.categorys.length) {
        let categorys = await this.sugoTaskCategoryService.findAll({ id: { $in: categoryData.categorys.map(p => p.id) } }, { raw: true })
        categorys = categorys.map(p => p.id)
        const objs = categoryData.categorys
          .filter(p => !_.includes(categorys, p.id))
          .map(p => ({
            ...p,
            created_by: id,
            updated_by: id,
            category_project_id: projectId,
            company_id
          }))
        objs.length && (await this.sugoTaskCategoryService.__bulkCreate(objs, transaction))
      }

      //写入新加的任务
      if (addTask.length) {
        const newList = addTask.map(o => ({
          id: o.id.toString(),
          task_project_id: projectId,
          category_id: o.category_id ? o.category_id : null,
          created_by: id,
          updated_by: id,
          company_id,
          status: 0
        }))
        await this.sugoTaskService.__bulkCreate(newList, transaction)
      }

      //修改覆盖的task 的category
      if (updateCategoryData.length) {
        await forAwaitAll(updateCategoryData, async p => {
          // 修改关联分类
          await this.sugoTaskService.update({ category_id: p.category_id }, { id: p.id }, { transaction })
        })
      }
    })
    return (ctx.body = Response.ok(newConfigData.map(p => p.showName)))
  }

  async downloadClone(ctx) {
    debugger
    const { ids, name } = ctx.query
    const idsList = ids.split(',')
    const tasks = await this.sugoTaskService.findAll(
      {
        id: { $in: idsList }
      },
      { raw: true }
    )
    const taskScheduleHost = await getTaskScheduleHostAsync()

    let categorys = await this.sugoTaskCategoryService.findAll({}, { raw: true })
    let categoryIds = []
    const getCategoryInfos = (ids = []) => {
      if (ids.filter(_.identity).length) {
        const objs = categorys.filter(p => _.includes(ids, p.id)).map(p => p.parent_id)
        categoryIds = _.concat(categoryIds, ids)
        getCategoryInfos(objs)
      }
    }
    getCategoryInfos(tasks.map(p => p.category_id))
    let categoryIdMap = {}
    // 获取工作流包含的分类信息
    categorys = categorys
      .filter(p => _.includes(categoryIds, p.id))
      .map(p => {
        const newId = shortid()
        _.set(categoryIdMap, p.id, newId)
        return {
          ..._.pick(p, ['title', 'parent_id']),
          id: newId
        }
      })

    categorys = categorys.map(p => ({ ...p, parent_id: _.get(categoryIdMap, p.parent_id, '') }))

    const content = JSON.stringify({
      categorys,
      tasksCategory: tasks
        .filter(p => p.category_id)
        .map(p => {
          return {
            category_id: _.get(categoryIdMap, p.category_id, ''),
            id: p.id
          }
        })
    })

    const filePath = path.resolve('/tmp', name)
    // 下载文件
    let url = `${taskScheduleHost}/api3/manager?action=batchDownload&projectIds=${ids}&idealFileName=${name}.zip`
    await this.downFile(encodeURI(url), filePath)

    var zip = new admzip(filePath)
    // 为zip添加文件，文件名为entry.js，内容为content，备注为comment
    zip.addFile('taskCategory.json', Buffer.alloc(Buffer.byteLength(content, 'utf8'), content), 'comment', null)

    // 生成zip文件
    zip.writeZip('/' + filePath)

    const filename = name + '.zip'

    ctx.attachment(filename) // 设置下载文件名
    return (ctx.body = fs.createReadStream(filePath))
  }

  async uploadClonePackage(ctx) {
    await multipart()(ctx)
    const file = ctx.req.files.file
    // 创建可读流
    const reader = fs.createReadStream(file.path)
    let filePath = path.resolve('/tmp', file.name)
    // 创建可写流
    const upStream = fs.createWriteStream(filePath)
    // 可读流通过管道写入可写流
    reader.pipe(upStream)
    ctx.status = 200
    ctx.body = Response.ok('上传成功')
  }

  async saveRealTimeCollectTask(ctx) {
    let { task_id, name, showName, task_project_id, params, inputConfig, outputConfig, isBreakPoint, collectId = 0 } = ctx.q
    const { company_id, id: userId } = ctx.session.user
    const taskScheduleHost = await getTaskScheduleHostAsync()
    task_id = task_id.toString()
    const jobName = _.toNumber(collectId) || moment().format('x')
    const endJobName = jobName + 100
    try {
      const nodeInfo = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=setJobOverrideProperty2`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({
          projectId: task_id,
          jobName,
          'jobOverride[realtimeCollect.script]': `sh scripts/${jobName}.sh`,
          'jobOverride[name]': '采集节点',
          'jobOverride[showName]': '采集节点',
          'jobOverride[type]': 'realtimeCollect',
          scriptContent: {
            readerParamDTO: inputConfig,
            writerParamDTOList: outputConfig,
            isBreakPoint
          }
        })
      })
      if (!nodeInfo) {
        throw new Error('保存采集节点失败')
      }

      // 保存工作流图形信息
      const resProject = await FetchKit.post(`${taskScheduleHost}/api3/manager?action=saveProject`, null, {
        ...recvJSON(ctx),
        body: JSON.stringify({
          projectId: task_id,
          data: {
            title: name,
            nodes: {
              [`${name}_node_${endJobName}`]: {
                top: 403,
                left: 110,
                name: '结束',
                width: 26,
                type: 'end',
                height: 26
              },
              [`${name}_node_${jobName}`]: {
                top: 149,
                left: 136,
                name: '实时采集节点',
                width: 104,
                type: 'realtimeCollect',
                height: 26
              }
            },
            lines: {
              [`${name}_line_${jobName}_${endJobName}`]: {
                type: 'sl',
                from: `${name}_node_${jobName}`,
                to: `${name}_node_${endJobName}`
              }
            },
            areas: {},
            initNum: 1
          },
          showName
        })
      })
      if (resProject && resProject.expired) {
        throw new Error('页面已过期,请刷新重试')
      }
      if (!resProject || resProject.status !== 'success') {
        throw new Error(_.get(resProject, 'message', ''))
      }
      await this.sugoTaskService.update(
        {
          params,
          name,
          company_id,
          updated_by: userId
        },
        { task_project_id, id: task_id }
      )
      return (ctx.body = Response.ok(task_id))
    } catch (error) {
      console.log(error)
      return (ctx.body = Response.fail('保存任务失败!' + error.message))
    }
  }

  downFile(url, filePath) {
    return new Promise(function (resolve, reject) {
      request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          let stream = fs.createWriteStream(filePath)
          request(url)
            .pipe(stream)
            .on('close', function (err) {
              resolve('下载成功')
            })
        } else {
          if (error) {
            reject(error)
          } else {
            reject(new Error('下载失败，返回状态码不是200，状态码：' + response.statusCode))
          }
        }
      })
    })
  }

  proxyMiddleware = proxyMiddleware
  executor = proxyMiddleware
  executors = proxyMiddleware
  execLog = proxyMiddleware
  executorLog = proxyMiddleware
  getSchedules = proxyMiddleware
  delSchedules = proxyMiddleware
  getHistory = proxyMiddleware
  copyProject = proxyMiddleware
}
