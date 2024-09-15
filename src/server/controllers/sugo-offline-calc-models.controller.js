import SugoOfflineCalcModelsService from '../services/sugo-offline-calc-models.service'
import SugoOfflineCalcVersionHistoriesService from '../services/sugo-offline-calc-version-histories.service'
import SugoOfflineCalcIndicesService from '../services/sugo-offline-calc-indices.service'
import BusinessDimensionService from '../services/business-dimension.service'
import SugoOfflineCalcTablesService from '../services/sugo-offline-calc-tables.service'
import SugoOfflineCalcDataSourceService from '../services/sugo-offline-calc-data-sources.service'
import { OfflineCalcVersionStatus, OfflineCalcTargetType } from '../../common/constants'
import { mapAwaitAll } from '../../common/sugo-utils'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import db from '../models'
import {generate} from 'shortid'
import { OfflineCalcModelParams, resolveAllDimDepsOfIndex } from '../../common/auto-generate-offline-calc-model'
import { UserService } from '../services/user.service'
import { syncDataSource, createProjectForModel, queryColInfoForTable, getDruidDimTypeByTableField, syncOdsTask, syncCalcTask } from  '../../common/model-publish-helper'
import FetchKit from '../utils/fetch-kit'
import conf from '../config'
import { forAwaitAll, toQueryParams } from '../../common/sugo-utils'
import { getAllTableFieldsByTable } from './hive.controller'
import projectService from '../services/sugo-project.service'
import projectController from './project.controller'
import hiveControll from './hive.controller'
import tindexController from './sugo-tindex.controller'
import { VisualModelCalcTypeEnum } from '../../common/constants'
import offlineCalcModelToSql from '../../common/offline-calc-model-helper'
import moment from 'moment'
import C2Q from 'cron-to-quartz'
import RedisSchedule from '../services/redis-schedule.service'
import FormData from 'formdata-node'
const { autoGenerateOfflineModelsTime, site: {dataDevHiveScriptProxyUser, visualModelHiveBaseDirPrefixForTindexSpec} } = conf
import { getTaskScheduleHostAsync } from './sugo-task-v3.contorller'

/**
 * 查询指标模型
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let {offset, limit, attributes, q, ...where} = _.isEmpty(ctx.q) ? ctx.query : ctx.q
  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  if (isGET && _.isString(attributes)) {
    attributes = attributes.split(',')
  }

  let others = {
    raw: true,
    order: [['updated_at', 'desc']],
    offset: _.isNil(offset) ? undefined : +offset,
    limit: _.isNil(limit) ? undefined : +limit,
    attributes: _.isNil(attributes) ? undefined : attributes
  }

  let res
  const serv = SugoOfflineCalcModelsService.getInstance()
  //查看历史版本
  if (where.isViewVersion) {
    let version = await SugoOfflineCalcVersionHistoriesService.getInstance().findOne({
      id: where.id,
      status: {
        $or: [OfflineCalcVersionStatus.pass, OfflineCalcVersionStatus.watingForDel]
      }
    }, { raw: true })
    return returnResult(ctx, [_.get(version, 'clone', {})])
  }
  
  where = serv.trimWhere(where)
  if (_.isEmpty(where)) {
    let {user} = ctx.session
    res = await serv.findAll({
      $or: [
        {created_by: user.id},
        {belongs_id: {$eq: db.Sequelize.col('id')}}]
    }, others)
  } else {
    res = await serv.findAll(where, others)
  }
  
  // 公有的查版本号 私有的查是否正在审核
  for (let i = 0; i < res.length; i ++) {
    let item = res[i]
    item.SugoVersionHistory = {
      version: '私有',
      isReviewing: false,
      status: OfflineCalcVersionStatus.pass
    }
    if (item.id === item.belongs_id) {
      //公有版本 查版本号
      let version = await SugoOfflineCalcVersionHistoriesService.getInstance().findAll({
        target_id: item.id,
        status: {
          $or: [OfflineCalcVersionStatus.pass, OfflineCalcVersionStatus.watingForDel]
        }
      }, { raw: true, attributes:['version', 'status'] })
      version = version.some( i => i.status === OfflineCalcVersionStatus.watingForDel) ? version.filter( i => i.status === OfflineCalcVersionStatus.watingForDel) : version
      version = _.maxBy(version, o => Number(o.version) )
      item.SugoVersionHistory.version = version.version
      item.SugoVersionHistory.status = version.status
      item.status = version.status
      
    } else {
      let isReviewing = await SugoOfflineCalcVersionHistoriesService.getInstance().findOne({
        target_id: item.id,
        status: OfflineCalcVersionStatus.watingForReview
      })
      if (isReviewing) item.SugoVersionHistory.isReviewing = true
    }
  }
  
  returnResult(ctx, res)

  
  // let res = await SugoOfflineCalcModelsService.getInstance()
  //   .findAll(where, {
  //     raw: true,
  //     order: [['updated_at', 'desc']]
  //   })
  // returnResult(ctx, res)
}

/**
 * 创建指标模型
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcModelsService.getInstance()
  let res = await serv.create({...data, company_id, created_by: id})
  returnResult(ctx, res)
}

/**
 * 修改指标模型
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcModelsService.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该指标模型不存在')
    return
  }
  
  if (preMod.belongs_id === modId) {
    // 修改公有版本 产生一个新的私有版本
    preMod = preMod.get()
    preMod = {
      ..._.omit(preMod, ['id','created_at','created_by', 'updated_by']),
      ..._.omit(patch, 'id'),
      created_by: id
    }
    let res = await serv.create({...preMod, company_id, created_by: id})
    return returnResult(ctx, res)
  }

  
  let res = await serv.update({...patch, updated_by: id}, { id: modId, company_id })
  returnResult(ctx, res)
}

/**
 * 删除指标模型
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoOfflineCalcModelsService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该指标模型不存在')
    return
  }
  
  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

/*let q = {
  filters: [{dim: {fieldName, tableName, host}, op, eq}],
  groupBy: [
    {fieldName, tableName, host}, // 维度
    {ast: {op: '+', left: {}, right: {}}}, // 复合维度
  ],
  indices: [
    {fieldName, aggregator, groupBy, tableName, host}, // 指标
    {ast: {op: '+', left: {}, right: {}}}, // 复合指标
  ],
  joins: [
    {
      left: {fieldName, tableName, host},
      right: {fieldName, tableName, host},
      type: 'innerJoin'
    }
  ]
}*/
async function queryByScheduler(ctx) {
  let id = ctx.params.id
  
  let serv = SugoOfflineCalcModelsService.getInstance()
  const tables = await serv.getAllTables()
  const dsList = await serv.getAllDs()
  let dsIdDict = _.keyBy(dsList, ds => ds.id)
  let tbIdDict = _.keyBy(tables, tb => tb.id)

  let others = {
    raw: true,
    order: [['updated_at', 'desc']]
  }

  if (!id) {
    let {id: created_by} = ctx.session.user
    let queryObj = ctx.query
    const { limit = 10, offset = 0 } = queryObj
  
    others = {
      ...others,
      offset,
      limit
    }
  
    let res = await serv.findAndCountAll({
      $or: [
        {created_by: created_by},
        {belongs_id: {$eq: db.Sequelize.col('id')}}
      ]
    }, others)

    if (_.isEmpty(res)){
      returnResult(ctx, { models: [], count: 0 })
      return
    }
  
    const { count, rows } = res
    let result = await mapAwaitAll(rows, async model => {
      return await serv.genOpenDataApiResult({ model, dsIdDict, tbIdDict })
    })
    return returnResult(ctx, { models: result, count })
  }

  let res = await serv.findOne({ id }, others)
  if (_.isEmpty(res)){
    returnError(ctx, `找不到指标模型，id: ${id}`, 404)
    return
  }
  let result = await serv.genOpenDataApiResult({ model: res, dsIdDict, tbIdDict })
  returnResult(ctx, result)
}

//智能模型生成
async function generateModel() {
  const serv = SugoOfflineCalcIndicesService.getInstance()
  const modelServ = SugoOfflineCalcModelsService.getInstance()
  const businessDimServ = BusinessDimensionService.getInstance()
  const tableServ = SugoOfflineCalcTablesService.getInstance()
  const userService = UserService.getInstance()
  const taskScheduleHost = await getTaskScheduleHostAsync()
  const userInfo = await userService.findOne({ username: 'admin' }, { raw: true })
  let userRole = await userRole.findAll({ user_id: userInfo.id }, { raw: true })
  userRole = userRole.map(p => p.role_id)
  let businessDimMap = await businessDimServ.findAll({}, { raw: true })
  businessDimMap = _.keyBy(businessDimMap, p => p.id)
  let tablesMap = await tableServ.findAll({}, { raw: true })
  tablesMap = _.keyBy(tablesMap, p => p.id)
  let offlineDataSources = await SugoOfflineCalcDataSourceService.getInstance().findAll({}, { raw: true })
  //获取所有指标模型
  let offlineIndices = await serv.findAll({}, { raw: true })
  let indicesMap = _.keyBy(offlineIndices, p => p.id)
  //排除未设置公共维度的指标
  let indices = _.filter(offlineIndices, p => _.get(p, 'params.publicDim.length', 0) > 0 && _.get(p, 'params.cycle', ''))
  if (!indices.length) {
    return
  }

  indices = indices.map(p => {
    const dims = _.get(p, 'params.publicDim', []).map(d => d.publicDimId)
    return { id: p.id, cycle: _.get(p, 'params.cycle'), params: _.get(p, 'params', {}), dims, dim: dims.join('_') }
  })

  // 获取tindexleader
  let tindexLeader = tindexController.queryLeaderHost({})
  tindexLeader = _.get(tindexLeader, 'result', '')
  // 按维度和计算周期分组模型
  indices = _.groupBy(indices, p => `${p.cycle}_${p.dim}`)

  try {
    // 生成指标模型
    const models = _.keys(indices).map((p, i) => {
      let params = OfflineCalcModelParams
      let tableDeps = []
      let outputCols = []
      let tables = []
      let joinLinks = []
      let idxDeps = []
      let relyIndices = indices[p].map(i => {
        outputCols.push({ idxId: i.id })
        idxDeps.push(i.id)
        return resolveAllDimDepsOfIndex(indicesMap[i.id], indicesMap)
      })

      relyIndices = _.uniq(_.flatten(relyIndices))
      const publicDims = _.flatten(indices[p].map(p => _.get(p, 'params.publicDim', [])))
      _.flatten(publicDims.map(p => p.args || [])).forEach(p => {
        const [, tableId, fieldName] = p.split('/')
        tableDeps.push(tableId)
        outputCols.push({ dimId: `${tableId}/${fieldName}` })
      })

      relyIndices.forEach(p => {
        const [dsId, tableName, fieldName] = p.split('|')
        const tableInfo = _.values(tablesMap).find(p => p.data_source_id === dsId && p.name === tableName) || {}
        outputCols.push({ dimId: `${tableInfo.id}/${fieldName}` })
      })

      _.forEach(publicDims, p => {
        for (let i = 0; i < p.args.length; i++) {
          if (i + 1 < p.args.length) {
            const [, ...resSource] = p.args[i].split('/')
            const [, ...resTarget] = p.args[i + 1].split('/')
            joinLinks.push({
              'type': 'innerJoin',
              'source': resSource.join('/'),
              'target': resTarget.join('/')
            })
          }
        }
      })

      const selfDims = _.flatten(indices[p].map(p => _.get(p, 'params.selfDim', [])))
      _.flatten(selfDims.map(p => p.args || [])).forEach(p => {
        const [, tableId, fieldName] = p.split('/')
        tableDeps.push(tableId)
        outputCols.push({ dimeId: `${tableId}/${fieldName}` })
      })

      tableDeps = _.uniq(tableDeps)

      tables = tableDeps.map((p, i) => {
        const tableInfo = _.get(tablesMap, p, {})
        return {
          id: p,
          name: tableInfo.name,
          title: tableInfo.title,
          fields: _.get(tableInfo, 'params.fieldInfos', []),
          position: {
            x: 10 + (i * 200),
            y: 100
          }
        }
      })
      const minute = ((i + 1) % 2) * 30
      const hour = Math.floor((i + 1) / 2)
      params = {
        ...params,
        idxDeps,
        tableDeps,
        outputCols: _.uniqBy(outputCols, p => p.dimId),
        diagramInfo: {
          tables,
          joinLinks: _.uniq(joinLinks)
        },
        scheduleCron: {
          'option': {
            'day': '1',
            'hour': '0',
            'month': '1',
            'minute': '0'
          },
          'period': 'hour',
          'unitType': '0',
          'hourValue': null,
          'taskStartTime': moment().format('YYYY-MM-DD HH:mm:ss'),
          'cronExpression': `${minute} ${hour} * * *`,
          'selectedPeriod': 'day',
          'selectedDayOption': {
            'hour': `${hour}`,
            'minute': `${minute}`
          },
          'selectedHourOption': {
            'minute': '0'
          },
          'selectedWeekOption': {
            'day': '1',
            'hour': '0',
            'minute': '0'
          },
          'selectedYearOption': {
            'day': '1',
            'hour': '0',
            'month': '1',
            'minute': '0'
          },
          'selectedMonthOption': {
            'day': '1',
            'hour': '0',
            'minute': '0'
          },
          'selectedIntervalOption': {
            'hour': '0',
            'minute': 0,
            'startHour': 0
          }
        }
      }

      return {
        // id: generate(),
        belongs_id: null,// '',
        name: p,
        title: _.get(indices, [p, '0', 'dims'], []).map(d => _.get(businessDimMap, [d, 'name'], '')).join('_') + '_' + _.get(indices, [p, '0', 'cycle'], ''),
        params,
        tags: ['auto_generate'],
        created_by: userInfo.id,
        company_id: userInfo.company_id,
        updated_by: userInfo.id
      }
    })
    const recvJSON = {
      headers: {
        Accept: 'application/json'
      }
    }
    //保存offlineCalcModles
    // await modelServ.__bulkCreate(models)

    const taskUrl = `${taskScheduleHost}/api2/`
    // 准备发布数据 
    let res = await FetchKit.get(`${taskUrl}dataBase?dataType=dataBaseInfo`)
    const scheDsArr = res.dataBaseInfo

    // 调度列表 
    res = await FetchKit.get(`${taskUrl}manager`)
    let odsTaskList = res.projects
    const odsType = res.projectTypes.find(p => p.actionType === 1 && p.parentId === 0)
    const calcType = res.projectTypes.find(p => p.actionType === 2 && p.parentId === 0)

    // 调度保存方法
    const saveDataSourceFunction = async function (params) {
      return await FetchKit.post(`${taskUrl}dataBase?action=createDataBase`, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
    }
    // 获取字段信息
    const getHiveTableFieldsFunction = getAllTableFieldsByTable
    const getScheduleTableFieldFunction = async (dsId, tableName) => {
      const res = await FetchKit.get(`${taskUrl}dataBase?dataType=columnInfo&tableName=${tableName}&dbId=${dsId}&update=true`)
      if (res && res.status && res.status === 'success') {
        return res.columnList.map(p => ({
          finalCol: p.name,
          finalType: 'string',
          finalComment: p.comment,
          sourceCol: p.name,
          sourceType: p.type,
          sourceComment: p.comment
        }))
      } else {
        throw new Error()
      }
    }
    // 创建调度信息方法
    const createOdsTaskFunction = async (opts) => {
      if (!opts.name) {
        opts.name = generate()
      }
      let params = toQueryParams(opts)
      let res = await FetchKit.post(`${taskUrl}manager?action=create&${params}`)
      res = JSON.parse(res)
      if (res.status === 'success') {
        return _.get(res, 'newProject', {})
      }
      return null
    }
    // 保存子节点方法
    const saveOdsTaskStepFunction = async (taskName, jobName, params) => {
      return await FetchKit.post(`${taskUrl}manager?ajax=ajaxSaveProject&actionType=1&project=${taskName}&jobName=${jobName}`, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
    }

    // 保存子节点方法
    const saveOdsTaskStepFunction2 = async (taskName, params) => {
      return await FetchKit.post(`${taskUrl}manager?project=${taskName}&ajax=setJobOverrideProperty2`, null, {
        ...recvJSON,
        body: JSON.stringify(params)
      })
    }


    // 保存流程图
    const saveOdsTaskFlowFun = async (opts) => {
      const {
        name: project = '',
        data,
        showName,
        description,
        actionType
      } = opts
      const params = toQueryParams({
        ajax: 'ajaxSaveProject',
        actionType,
        project,
        data: JSON.stringify(data),
        showName,
        description
      })
      return await FetchKit.post(`${taskUrl}manager?${params}`)
    }
    // 获取调度信息
    let scheduleInfos = await FetchKit.get(`${taskUrl}schedule`)
    scheduleInfos = _.get(scheduleInfos, 'schedules', []).map(s => s.schedule)
    scheduleInfos = _.keyBy(scheduleInfos, s => s.projectId)
    // 设置
    const setCronForTask = (scheduleCron) => async (task) => {
      let scheduleInfoForTask = scheduleInfos[task.id]
      if (!_.isEmpty(scheduleCron)) {
        const { id: projectId, name: projectName } = task
        let params = {
          projectName,
          projectId,
          flow: projectName,
          cronExpression: C2Q.getQuartz(scheduleCron.cronExpression)[0].join(' '),
          scheduleTime: moment(scheduleCron.taskStartTime).locale('en').format('hh,mm,A,Z'),
          scheduleDate: moment(scheduleCron.taskStartTime).format('MM/DD/YYYY'),
          info: JSON.stringify(scheduleCron),
          apiAlertInfos: '',
          'flowOverride[useExecutorList]': '',
          'flowOverride[flowPriority]': '',
          failureEmailsOverride: false,
          successEmailsOverride: false,
          failureEmails: [],
          successEmails: [],
          endSchedTime: moment().add(10, 'y') + 0,
          startSchedTime: moment() + 0,
          scheduleId: scheduleInfoForTask && scheduleInfoForTask.scheduleId || ''
        }
        params = _.pickBy(params, _.identity)
        let url = `${taskUrl}schedule?ajax=scheduleCronFlow`
        const formData = new FormData()
        for (let x in params) {
          formData.append(x, params[x])
        }
        let res = await FetchKit.post(url, null, { headers: formData.headers, body: formData.stream })
        if (!res || !res.status || res.status !== 'success') {
          console.log('保存调度设置失败')
        }
        return
      }
      
      // 移除调度设置
      if (scheduleInfoForTask) {
        let res = await FetchKit.post(`${taskUrl}schedule?action=removeSched&scheduleId=${scheduleInfoForTask.scheduleId}`)
        if (!(res && res.status && res.status === 'success')) {
          throw new Error('取消调度设置失败')
        }
      }
    }


    // hive配置信息
    let hiveHostInfo = hiveControll.getHostHandle()

    // 获取所有项目列表
    const projectList = await projectService.query({})

    let existModelIds = []
    await forAwaitAll(models, async m => {
      // 保存模型
      try {
        let model = await modelServ.findOne({ name: m.name })
        if (_.isEmpty(model)) {
          model = await modelServ.create(m)
        } else {
          await modelServ.update(m, { name: m.name })
          model = { ...m, id: model.id }
        }
        existModelIds.push(model.id)
        const { id: modelId, title: modelName, params: modelParams } = model
        const { tableDeps, outputCols, diagramInfo: { joinLinks = [] }, scheduleCron } = modelParams
        const targetProjectName = `指标模型_${modelName}`
        let targetProject = projectList.find(p => p.name === targetProjectName)
        // 获取当前项目信息及维度
        let dimensions = _.isEmpty(targetProject)
          ? []
          : await db.SugoDimensions.findAll({
            where: {
              parentId: targetProject.datasource_id
            }
          }, {
            raw: true
          })
        let measures = _.isEmpty(targetProject)
          ? []
          : await db.SugoMeasures.findAll({
            where: {
              parentId: targetProject.datasource_id
            }
          }, {
            raw: true
          })
        const depTables = _.values(tablesMap).filter(p => _.includes(tableDeps, p.id))
        const datasourceId = _.uniq(depTables.map(p => p.data_source_id))
        const depDataSources = offlineDataSources.filter(p => _.includes(datasourceId, p.id))
        // 获取模型引用的维度和指标
        let useDim = []
        let useIns = []
        _.forEach(outputCols, p => {
          if (p.dimId) {
            const [, dimName] = p.dimId.split('/')
            useDim.push(dimName)
          } else if (p.idxId) {
            useIns.push(p.idxId)
          }
        })

        let idxIdDict = useIns.length
          ? offlineIndices.filter(p => _.includes(useIns, p.id))
          : []
        idxIdDict = _.keyBy(idxIdDict, p => p.id)

        // 同步数据源到azkaban
        await syncDataSource(scheDsArr, depDataSources, modelId, saveDataSourceFunction)
        // 获取字段信息
        let colInfoIdFieldNameDict = await queryColInfoForTable(depDataSources, depTables, modelId, scheDsArr, getScheduleTableFieldFunction, getHiveTableFieldsFunction)

        // 创建项目 维度和指标
        const asyncProjectData = await createProjectForModel(
          getDruidDimTypeByTableField(colInfoIdFieldNameDict),
          depTables,
          outputCols,
          idxIdDict,
          projectList,
          targetProjectName,
          dimensions,
          measures
        )
        // 新增项目
        let targetProjectId = asyncProjectData.project.id
        if (!targetProjectId) {
          const projRes = await projectController.create({
            q: { name: asyncProjectData.project.name, type: asyncProjectData.project.type },
            session: { user: { company_id: userInfo.company_id, id: userInfo.id, company: { id: userInfo.company_id, type: 'payed' } } }
          })
          targetProject = projRes.result
        }
        // 新增维度
        await forAwaitAll(asyncProjectData.dimensions.filter(p => !p.id), async p => {
          await db.SugoDimensions.create({ ...p, role_id: userRole, parentId: targetProject.datasource_id })
        })
        // 修改维度
        await forAwaitAll(asyncProjectData.dimensions.filter(p => p.id), async p => {
          await db.SugoDimensions.update(p, { where: { id: p.id } })
        })

        // 新增指标
        await forAwaitAll(asyncProjectData.measures.filter(p => !p.id), async p => {
          await db.SugoMeasures.create({ ...p, role_id: userRole, parentId: targetProject.datasource_id })
        })
        // 修改指标
        await forAwaitAll(asyncProjectData.measures.filter(p => p.id), async p => {
          await db.SugoMeasures.update(p, { where: { id: p.id } })
        })

        // 拉取最新的维度和指标
        dimensions = await db.SugoDimensions.findAll({
          where: {
            parentId: targetProject.datasource_id
          }
        }, {
          raw: true
        })
        measures = await db.SugoMeasures.findAll({
          where: {
            parentId: targetProject.datasource_id
          }
        }, {
          raw: true
        })

        // 获取模型连接信息
        const joinDimDepsIds = _.reduce(joinLinks, (r, v) => {
          const [, sourceDim] = v.source.split('/')
          const [, targetDim] = v.target.split('/')
          r.push(sourceDim)
          r.push(targetDim)
          return r
        }, [])
        const joinDimDeps = dimensions.filter(p => _.includes(joinDimDepsIds, p.name))
        // 创建采集任务

        const collectTask = await syncOdsTask(
          colInfoIdFieldNameDict,
          asyncProjectData.outputDims,
          model,
          depTables,
          depDataSources,
          joinDimDeps,
          scheDsArr,
          odsTaskList,
          createOdsTaskFunction,
          saveOdsTaskStepFunction,
          _.get(odsType, 'id', '1'),
          scheDsArr,
          dataDevHiveScriptProxyUser,
          setCronForTask(scheduleCron, odsTaskList)
        )

        // 更新调度信息
        res = await FetchKit.get(`${taskUrl}manager`)
        odsTaskList = res.projects
        // 生成sql
        const genSqlExpression = (rawTableNameDict) => {
          const tempModel = {
            params: {
              outputCols: _.get(model, 'params.outputCols', []),
              diagramInfo: _.get(model, 'params.diagramInfo', {}),
              calcType: _.get(model, 'params.calcType', VisualModelCalcTypeEnum.Select),
              filters: _.get(model, 'params.filters', [])
            }
          }
          return offlineCalcModelToSql(tempModel, {
            tableIdDict: _.keyBy(depTables, p => p.id),
            idxIdDict,
            ...rawTableNameDict
          })
        }
        // 创建清洗任务
        await syncCalcTask(
          targetProject.datasource_name,
          model,
          asyncProjectData.outputDims,
          collectTask,
          odsTaskList,
          depTables,
          depDataSources,
          genSqlExpression,
          createOdsTaskFunction,
          saveOdsTaskStepFunction2,
          saveOdsTaskFlowFun,
          hiveHostInfo,
          tindexLeader,
          _.get(calcType, 'id', '2'),
          scheDsArr,
          dataDevHiveScriptProxyUser,
          visualModelHiveBaseDirPrefixForTindexSpec,
          setCronForTask(scheduleCron, odsTaskList)
        )
      } catch (e) {
        console.log('执行智能建模异常', e)
      }	
    })
    // 删除历史
    await modelServ.remove({ tags: { $eq: ['auto_generate'] }, id: { $notIn: existModelIds } })
  } catch (e) {
    console.log('执行智能建模异常', e)
  }
}

const initOfflineModelTasks = async () => {
  const clusterId = process.env.NODE_APP_INSTANCE
  // 仅仅在第一个实例运行，这样就不会出现请求不匹配
  if (clusterId > 0) return
  // // 清理历史缓存中的配置
  let redisSchedule = RedisSchedule.getInstance()
  // await redisSchedule.clearJobs() // 清除当前模块所有相关定时任务key
  // process.nextTick(async () => {
  //   await generateModel()
  // })
  await redisSchedule.cancelJob('offline-calc-generate-model')
  const [hour, minute] = (autoGenerateOfflineModelsTime || '23:30').split(':')
  setTimeout(() => {
    redisSchedule.addJob('offline-calc-generate-model', {
      cron: `0 ${minute} ${hour} * * *`,
      // cron: '59 * * * * *',
      path: '../controllers/sugo-offline-calc-models.controller.js',
      func: 'generateModel',
      data: 0,
      counter: 0
    })
  }, 100)
}

export default {
  query,
  create,
  update,
  remove,
  queryByScheduler,
  generateModel,
  initOfflineModelTasks
}
