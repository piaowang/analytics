import SugoTaskProjectService from '../services/sugo-task-project.service'
import SugoTaskService from '../services/sugo-task.service'
import SugoTaskGroupService from '../services/sugo-task-group.service'
import SugoTaskCategoryService from '../services/sugo-task-category.service'
import FetchKit from '../utils/fetch-kit'
import _ from 'lodash'
import { forAwaitAll } from 'common/sugo-utils'
import { Response } from '../utils/Response'
import config from '../config'
import SugoProjectService from '../services/sugo-project.service'
import DatasourceService from '../services/sugo-datasource.service'
import SugoTaskGroupCategoryService from '../services/sugo-task-group-category.service'
import {
  ProjectStatus,
  ProjectState,
  AccessDataType
} from '../../common/constants'
import { getTaskScheduleHostAsync } from './sugo-task-v3.contorller'
import db from '../models'

const CREATE_TASK_TYPE = {
  task: 1,
  taskGroup: 2
}

export default class indicesPublish {
  constructor() {
    this.sugoTaskProjectService = SugoTaskProjectService.getInstance()
    this.sugoTaskService = SugoTaskService.getInstance()
    this.sugoTaskCategoryService = SugoTaskCategoryService.getInstance()
    this.sugoTaskGroupService = SugoTaskGroupService.getInstance()
    this.sugoTaskGroupCategoryService = SugoTaskGroupCategoryService.getInstance()
    this.recvJSON = {}
    this.taskScheduleHost = ''
  }

  /*
   传入参数示例
   {
     "taskProjectName": "", // 工作流所属项目名称
     "taskCategoryName": "", // 工作流所属分类
     "taskGroupCategoryName": "", // 工作流组所属分类
      "tindexTableName" : "", // tindex表名
      "tindexTableTile" : "", // tindex别名
      "callbackUrl" : ""
     "taskGroupConfigs": [
       {
         "name": "", // 工作流组唯一编号
         "showName": "", // 工作流组显示名称
         "taskConfigs": [
           {
             "name": "", //  工作流唯一编号
             "showName": "", // 工作流显示名称
             "params": {
               "hive.script": "", // 脚本存储位置
               "jobType": "", // 脚本节点类型
               "showName": "", // 节点显示名称
               "proxy.obj.user": ""
               // ...
             },
             "content": {
               "primaryField": "", // 主键列
               "dataSource": "", // Tindex数据源
               "timeField": "", // 主事件列
               "dimensions": [
                 {
                   "name": "id_t", // 维度名称
                   "type": "string" // 维度类型
                 }
                 // ...
               ], // 维度信息
               "columns": [ // 维度映射
                 {
                   "sourceCol": "id", // 源名称
                   "finalCol": "id_t" // 目标名称
                 }
                 // ...
               ],
               "sql": "", // 脚本内容
               "dbConntectionUrl": "", // 数据库连接url
               "dbUser": "", // 数据库用户
               "dbPwd": "" // 数据库密码sm4
             }
           }
         ]
       }
     ]
   }
   */

  async publish(ctx) {
    debugger
    let { company_id: companyId, id: userId } = ctx?.session?.user || { company_id: 'SJLnjowGe', id: 'BJZ83jiwGg' }
    this.recvJSON = {
      headers: {
        Accept: 'application/json',
        cookie: ctx.headers['cookie'] || 'iUA3s4RbT'
      }
    }
    const {
      taskProjectName = '', // 工作流 工作流组所属项目名称
      taskCategoryName = '', // 工作流所属分类
      taskGroupCategoryName = '',// 工作流组所属分类
      taskGroupConfigs = [], // { showName, jobType, scriptContent, params }
      tindexTableName = '', // tindex表名
      tindexTableTile = '', // tindex别名
      callbackUrl = ''
    } = ctx.request.body
    // 获取az的地址
    this.taskScheduleHost = await getTaskScheduleHostAsync()

    const handel = async () => {
      // 检测tindex项目是否注册
      await this.createTindexProject(tindexTableName, tindexTableTile, userId, companyId)

      // 检测工作流项目是否存在 
      const taskProjectId = await this.createOrFindTaskProjectByName(taskProjectName, '', userId, companyId)

      // 检测工作流组分类是否存在
      const taskGroupCategoryId = await this.createOrFindTaskCategoryByName(taskGroupCategoryName, taskProjectId, userId, companyId, CREATE_TASK_TYPE.taskGroup)

      // 检测工作流分类是否存在
      const taskCategoryId = await this.createOrFindTaskCategoryByName(taskCategoryName, taskProjectId, userId, companyId, CREATE_TASK_TYPE.task)

      // 批量创建工作流组任务
      await forAwaitAll(taskGroupConfigs, async taskGroupConfig => {
        // 创建单个工作流组任务
        await this.batchSaveTaskGroupGraph(taskGroupConfig, taskProjectId, taskGroupCategoryId, taskCategoryId, userId, companyId)
      })

      await this.publishCallback(callbackUrl, taskGroupConfigs)

    }
    handel()
    ctx.body = Response.ok('')
  }

  /**
   * 回调子应用更新状态
   * @param {*} callbackUrl 回调地址
   * @param {*} taskGroupConfigs 配置信息
   */
  publishCallback = async (callbackUrl, taskGroupConfigs) => {
    const indicesIds = _.flatMap(taskGroupConfigs, p => {
      return _.map(p.taskConfigs, t => t.name)
    })
    await FetchKit.post(callbackUrl, null, {
      body: JSON.stringify({ ids: indicesIds })
    })
  }

  /**
   * 创建项目
   * @param {*} tindexTableName 表名
   * @param {*} tindexTableTile 别名
   * @param {*} userId 登录用户编号
   * @param {*} companyId 企业编号
   */
  createTindexProject = async (tindexTableName, tindexTableTile, userId, companyId) => {

    // 检测数据源是否存在
    const datasource = await SugoProjectService.findOneByDatasourcename(tindexTableName, companyId)

    if (datasource.success) {
      return
    }

    const ctx = {
      session: { user: { company_id: companyId, id: userId, company: { id: companyId, type: 'payed' } } }
    }

    // 注册前端数据源和项目
    await db.client.transaction(async transaction => {
      // 1. 插入数据源记录，并在数据源中记录接入类型，留待后用
      let res = await DatasourceService.createDataSource(
        ctx,
        tindexTableName,
        tindexTableTile,
        {},
        transaction
      )

      if (!res.success) {
        return res
      }

      const { result: DataSource } = res
      // 2. 插入项目记录
      return await SugoProjectService.create(
        companyId,
        tindexTableTile,
        DataSource.id,
        DataSource.name,
        {
          company_id: companyId,
          status: ProjectStatus.Show,
          state: ProjectState.Disable,
          access_type: AccessDataType.OfflineCalc,
          created_by: userId,
          updated_by: userId,
          tag_datasource_name: undefined
        },
        transaction
      )
    })
  }

  /**
   * 根据名称创建或查询现有的工作流项目
   * @param {*} taskProjectName 项目名称
   * @param {*} taskProjectDescription 项目描述
   * @param {*} userId 登录用户编号
   * @param {*} companyId 企业编号
   * 返回项目id
   */
  createOrFindTaskProjectByName = async (taskProjectName, taskProjectDescription, userId, companyId) => {
    const res = await this.sugoTaskProjectService.findOrCreate({
      name: taskProjectName
    },
      {
        name: taskProjectName,
        description: taskProjectDescription,
        company_id: companyId,
        created_by: userId,
        updated_by: userId
      }
    )
    return _.get(res, '0.id')
  }

  /**
   * 创建或者获取项目分类编号
   * @param {*} taskCategoryName 分类名称
   * @param {*} taskProjectId 项目id
   * @param {*} userId 用户id
   * @param {*} companyId 企业id
   * @param {*} createType 创建类型 工作流或工作流组 -- CREATE_TASK_TYPE
   */
  createOrFindTaskCategoryByName = async (taskCategoryName, taskProjectId, userId, companyId, createType) => {
    if (!taskCategoryName) {
      return ''
    }
    const dbIns = createType === CREATE_TASK_TYPE.task ? this.sugoTaskCategoryService : this.sugoTaskGroupCategoryService
    const key = createType === CREATE_TASK_TYPE.task ? 'category_project_id' : 'group_category_project_id'
    const res = await dbIns.findOrCreate({
      title: taskCategoryName,
      [key]: taskProjectId
    }, {
      title: taskCategoryName,
      [key]: taskProjectId,
      company_id: companyId,
      parent_id: createType === CREATE_TASK_TYPE.task ? '0' : '1',
      created_by: userId,
      updated_by: userId
    })
    return _.get(res, '0.id')
  }

  /**
   * 创建azkaban任务
   * @param {*} taskName 工作流随机生成的编号 关联外部指标的唯一id
   * @param {*} showName 项目显示的名称
   * @param {*} userId 登录用户id
   * @param {*} taskProjectId 所属工作流项目id
   * @param {*} taskCategoryId 所属分类id
   * @param {*} companyId 企业id
   * @param {*} createType 创建类型 工作流或工作流组 -- CREATE_TASK_TYPE
   * 返回 taskId 项目自增编号 
   */
  createAzTask = async (taskName, showName, taskProjectId, taskCategoryId, userId, companyId, createType) => {
    const dbIns = createType === CREATE_TASK_TYPE.task ? this.sugoTaskService : this.sugoTaskGroupService

    // 判断任务是否创建 
    const dbTask = await dbIns.findOne({ name: taskName }, { raw: true })

    if (!_.isEmpty(dbTask) && createType === CREATE_TASK_TYPE.task) {
      return { taskId: dbTask.id }
    }

    // 已创建直接返回工作流ID
    if (!_.isEmpty(dbTask)) {
      let res = await FetchKit.get(`${this.taskScheduleHost}/api3/manager?action=graph&projectId=${dbTask.id}`, null, {
        ...this.recvJSON,
        body: JSON.stringify({ name: taskName, showName, description: '' })
      })
      return { taskId: dbTask.id, taskGraph: _.pick(res, ['gnode', 'gline']) }
    }

    // 创建az任务
    let res = await FetchKit.post(`${this.taskScheduleHost}/api3/manager?action=${createType === CREATE_TASK_TYPE.task ? 'create' : 'createProjectGroup'}`, null, {
      ...this.recvJSON,
      body: JSON.stringify({ name: taskName, showName, description: '' })
    })
    if (!res.projectId && !res.data) {
      return ''
    }

    // 创建任务更新前端工作流表
    const taskId = (res.projectId || res.data).toString()
    await dbIns.create({
      task_project_id: taskProjectId,
      id: taskId,
      name: taskName,
      status: 0,
      company_id: companyId,
      category_id: taskCategoryId ? taskCategoryId : null,
      created_by: userId,
      updated_by: userId
    })

    return { taskId }
  }

  /**
   * 保存节点脚本信息
   * @param {*} taskId 任务id
   * @param {*} scriptContent 节点脚本内容
   * @param {*} jobName 节点id
   * @param {*} params 参数 [hive.script,showName, jobType, name, proxy.obj.user]
   */
  createAzTaskNode = async (taskId, scriptContent, params) => {
    const jobType = _.get(params, 'jobType', {})
    const jobName = new Date().getTime() + 0
    // const scriptKey = _.keys(params).find(p => p.indexOf('.script') > 0)
    let jobNodeInfo = {
      'jobName': jobName.toString(),
      'scriptContent': JSON.stringify(scriptContent),
      projectId: taskId,
      'jobOverride[showName]': jobType,
      'jobOverride[name]': jobType,
      'jobOverride[task.manager.url]': _.get(config, 'druid.supervisorHost', ''),
      'paramJson': {},
      ..._.mapKeys(params, (v, k) => {
        return `jobOverride[${k}]`
      }),
      // [scriptKey]: ''
    }
    const createHiveNodeRes = await FetchKit.post(`${this.taskScheduleHost}/api3/manager?action=setJobOverrideProperty2`, null, {
      ...this.recvJSON,
      body: JSON.stringify(jobNodeInfo)
    })
    if (!createHiveNodeRes) {
      return ''
    }
    return jobName
  }

  /**
   * 保存工作流信息
   * @param {*} taskId 任务自增编号
   * @param {*} taskName 任务随机编号
   * @param {*} jobName 节点id
   * @param {*} jobType 节点类型
   * @param {*} jobShowName 节点显示名称
   */
  saveTaskGraph = async (taskId, taskName, taskShowName, jobName, jobType, jobShowName) => {
    const endJobName = new Date().getTime() + 100

    // 流程图信息
    const graph = {
      title: taskName,
      nodes: {
        [`${taskName}_node_${endJobName}`]: {
          top: 200,
          left: 110,
          name: '结束',
          width: 26,
          type: 'end',
          height: 26
        },
        [`${taskName}_node_${jobName}`]: {
          top: 100,
          left: 110,
          name: jobShowName,
          width: 104,
          type: jobType,
          height: 26
        }
      },
      lines: {
        [`${taskName}_line_${endJobName}_${jobName}`]: {
          type: 'sl',
          from: `${taskName}_node_${jobName}`,
          to: `${taskName}_node_${endJobName}`
        }
      },
      areas: {},
      initNum: 1
    }
    // 保存工作流图形信息
    const resProject = await FetchKit.post(`${this.taskScheduleHost}/api3/manager?action=saveProject`, null, {
      ...this.recvJSON,
      body: JSON.stringify({
        projectId: taskId,
        data: graph,
        showName: taskShowName,
        projectType: undefined
      })
    })

    if (resProject && resProject.expired) {
      return false
    }

    if (!resProject || resProject.status !== 'success') {
      return false
    }
    return true
  }

  /**
   * 批量创建工作流任务
   * @param {*} taskConfigs 任务配置信息
   * @param {*} taskProjectId 任务所属项目
   * @param {*} taskCategoryId 任务所属分类
   * @param {*} userId 用户编号
   * @param {*} companyId 企业id
   */
  batchSaveTaskGraph = async (taskConfigs, taskProjectId, taskCategoryId, userId, companyId) => {
    const res = {
      success: [], // 创建成功记录
      fail: [] // 创建失败记录
    }

    await forAwaitAll(taskConfigs, async (item) => {
      const { name: taskName, showName, params, content } = item

      // 创建工作流
      const { taskId } = await this.createAzTask(taskName, showName, taskProjectId, taskCategoryId, userId, companyId, CREATE_TASK_TYPE.task)
      if (!taskId) {
        // 创建任务失败
        res.fail.push({ showName, taskName })
        return
      }

      const {
        primaryField, // 主键列
        dataSource,  // 数据源
        timeField, // 主事件列
        dimensions,
        sql,
        dbConntectionUrl,
        dbUser,
        dbPwd
      } = content

      // 生成节点json配置
      const scriptContent = this.generateGreenplumConfig(primaryField, dataSource, timeField, dimensions, sql, dbConntectionUrl, dbUser, dbPwd)

      // 保存节点脚本
      const jobName = await this.createAzTaskNode(taskId, scriptContent, params)
      if (!jobName) {
        // 创建节点失败
        res.fail.push({ taskId, taskName, showName })
        return
      }

      const jobType = _.get(params, 'jobType', '')
      // 创建任务
      const resJob = await this.saveTaskGraph(taskId, taskName, showName, jobName, jobType, _.get(params, 'showName', jobType))
      if (!resJob) {
        // 保存流程图失败
        res.fail.push({ taskId, taskName, showName })
        return
      }
      // 创建流程图成功
      res.success.push({ taskId, taskName, showName })
    })
    return res
  }


  /**
   * 批量创建工作流组
   * @param {*} taskGroupConfig 工作流组的配置信息
   * @param {*} taskProjectId 所属项目
   * @param {*} taskGroupCategoryId 工作流组分类id
   * @param {*} taskCategoryId 工作流分类id
   * @param {*} userId 用户编号
   * @param {*} companyId 企业id
   */
  batchSaveTaskGroupGraph = async (taskGroupConfig, taskProjectId, taskGroupCategoryId, taskCategoryId, userId, companyId) => {

    const {
      name: taskGroupName, // 工作流组唯一id
      showName: taskGroupShowName, // 工作流组显示名称
      taskConfigs // 工作流配置集合
    } = taskGroupConfig

    // 创建工作流组下的任务
    const taskResult = await this.batchSaveTaskGraph(taskConfigs, taskProjectId, taskCategoryId, userId, companyId)

    // 任务创建失败的提示信息
    let createFailMsg = ''
    if (taskResult.fail.length) {
      createFailMsg = `任务[${taskResult.map(p => p.showName).join(',')}]发布失败`
    }

    // 没有成功创建的任务 直接返回创建失败 
    if (!taskResult.success.length) {
      return createFailMsg
    }

    // 创建工作流组任务
    const { taskId: taskGroupId, taskGraph } = await this.createAzTask(taskGroupName, taskGroupShowName, taskProjectId, taskGroupCategoryId, userId, companyId, CREATE_TASK_TYPE.taskGroup)
    if (!taskGroupId) {
      return createFailMsg
    }

    // 创建工作流组流程图信息
    const resTaskGroup = await this.saveTaskGroupGraph(taskGroupId, taskGroupName, taskGroupShowName, taskResult.success, taskGraph || {})

    if (!resTaskGroup) {
      return createFailMsg
    }
    return createFailMsg
  }

  /**
   * 创建工作流任务组图形信息
   * @param {*} taskGroupId 工作流组编号
   * @param {*} taskGroupName 工作流编号
   * @param {*} taskGroupShowName 工作流组显示名称
   * @param {*} createTasks 创建的工作流信息
   * @param {*} taskGraph 工作流组历史布局信息
   */
  saveTaskGroupGraph = async (taskGroupId, taskGroupName, taskGroupShowName, createTasks, taskGraph) => {
    let endJobName = 0
    let endJob = {}
    let lines = {}
    let nodes = {}
    if (!_.isEmpty(taskGraph)) {
      try {
        const oldNodes = JSON.parse(taskGraph.gnode)
        const endKey = _.findKey(oldNodes, p => p.type === 'end')
        endJobName = endKey.substr(endKey.lastIndexOf('_') + 1)
        endJob = _.pick(oldNodes, [endKey])
        nodes = _.omit(oldNodes, [endKey])
      } catch (error) {
        console.log('解析工作流组历史布局信息报错误')
      }
    }

    if (!endJobName) {
      endJobName = new Date().getTime() + 1000
      endJob = {
        [`${taskGroupName}_node_${endJobName}`]: {
          top: 180,
          left: 50,
          name: '结束',
          width: 26,
          type: 'end',
          height: 26
        }
      }
    }

    // 遍历生成任务节点
    _.forEach(createTasks, (item, idx) => {
      nodes[`${taskGroupName}_node_${item?.taskId}`] = {
        top: 100,
        left: 0,
        name: item?.showName,
        width: 26,
        ports: "{}",
        type: "project",
        height: 26,
        'proxy.job': item?.taskName,
        'proxy.job.id': item.taskId.toString()
      }
    })

    const keys = _.keys(nodes)
    _.forEach(keys, (key, idx) => {
      const item = nodes[key]
      const taskId = item?.['proxy.job.id']
      const nextId = idx + 1 < keys.length ? _.get(nodes, [keys[idx + 1], 'proxy.job.id']) : endJobName
      _.set(nodes, [`${taskGroupName}_node_${taskId}`, 'left'], 50 + (idx * 200))
      lines[`${taskGroupName}_line_${nextId}_${taskId}`] = {
        type: 'sl',
        from: `${taskGroupName}_node_${taskId}`,
        to: `${taskGroupName}_node_${nextId}`
      }
    })

    // 流程图配置
    const graph = {
      title: taskGroupName,
      nodes: {
        ...nodes,
        ...endJob
      },
      lines,
      areas: {},
      initNum: 1
    }

    // 保存工作流图形信息
    const resProject = await FetchKit.post(`${this.taskScheduleHost}/api3/manager?action=saveProjectGroup`, null, {
      ...this.recvJSON,
      body: JSON.stringify({
        projectId: taskGroupId,
        data: graph,
        showName: taskGroupShowName,
        projectType: undefined
      })
    })

    if (resProject && resProject.expired) {
      return false
    }

    if (!resProject || resProject.status !== 'success') {
      return false
    }
    return true
  }


  /**
   * 生成greenplum配置
   * @param {*} primaryField 主键列 
   * @param {*} dataSource tindex数据源
   * @param {*} timeField 主事件列
   * @param {*} dimensions 维度
   * @param {*} sql sql语句
   * @param {*} dbConntectionUrl 数据库连接配置 
   * @param {*} dbUser 用户名
   * @param {*} dbPwd 密码
   */
  generateGreenplumConfig = (primaryField, dataSource, timeField, dimensions, sql, dbConntectionUrl, dbUser, dbPwd) => {
    return {
      "type": "lucene_upsert",
      "filterColumns": primaryField,
      "actionColumn": "action",
      "dataSchema": {
        "dataSource": dataSource,
        "parser": {
          "type": "map",
          "parseSpec": {
            "format": "timeAndDims",
            "timestampSpec": {
              "column": timeField,
              "format": "yyyyy-MM-dd HH:mm:ss",
              "timezone": "Asia/Shanghai"
            },
            "dimensionsSpec": {
              "dimensionExclusions": [],
              "spatialDimensions": [],
              "dimensions": dimensions
            }
          }
        },
        "granularitySpec": {
          "type": "uniform",
          "segmentGranularity": "DAY",
          "intervals": ["1001-01-01T00:00:00.000Z/2999-01-01T00:00:00.000Z"]
        }
      },
      "ioConfig": {
        "type": "lucene_index",
        "firehose": {
          "type": "jdbc",
          "provider": {
            // "type":"greenplum",
            // "url":"jdbc:pivotal:greenplum://192.168.0.212:5432;DatabaseName=jtbg",
            // "user":"gpadmin",
            // "password":"j3R+GTvTZ5QIsJ7SEloZGA==",
            "type": "greenplum",
            "url": dbConntectionUrl,
            "userName": dbUser,
            "password": dbPwd,
            "encrypt": true
          },
          "sqls": [sql]
        }
      },
      "tuningConfig": {
        "type": "lucene_index",
        "maxRowsPerSegment": 500000,
        "numShards": -1,
        "basePersistDirectory": null,
        "overwrite": false,
        "reportParseExceptions": true
      },
      "writerConfig": {
        "type": "lucene",
        "maxBufferedDocs": -1,
        "ramBufferSizeMB": 16.0,
        "indexRefreshIntervalSeconds": 6
      },
      "context": {
        "debug": true,
        "throwAwayBadData": false
      }
    }
  }
}
