import React from 'react'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Checkbox, message, Modal, Steps } from 'antd';
import {connect} from 'react-redux'
import _ from 'lodash'
import TaskListModel, {namespace as mainNS, taskTreeNamespance} from '../TaskScheduleManager2/store/model'
import dbConnModel, {namespace as dbConnNS} from '../TaskScheduleManager2/db-connect/db-connect-model'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {delayPromised, forAwaitAll, groupBy, immutateUpdate} from '../../../common/sugo-utils'
import {OfflineCalcDataSourceTypeEnum} from '../../../common/constants'
import xorUtils from '../../../common/xor-utils'
import taskTreeModel, {namespace as treeNS} from '../TaskScheduleManager2/store/tree-model'
import {TASK_ACTION_TYPE, TASK_TREE_TYPE} from '../TaskScheduleManager2/constants'
import {recvJSON} from '../../common/fetch-utils'
import FetchFinal from '../../common/fetch-final'
import {ContextNameEnum, getContextByName} from '../../common/context-helper'
import DruidColumnType, {DruidNativeType} from '../../../common/druid-column-type'
import {guessDruidStrTypeByDbDataType, guessDruidTypeByDbDataType} from '../../../common/offline-calc-model-helper'
import {createProjectForModel} from 'client/common/offline-calc-helper'
import moment from 'moment'
import {genLoadHiveTableTaskSpec} from '../../../common/model-publish-helper'

const {
  visualModelHiveBaseDirPrefixForTindexSpec = '/user/hive/warehouse'
} = window.sugo

// 同步数据库连接到调度系统，命名规范 dbAlais: 指标模型_modelId_数据源_name
// 创建采集任务，命名规范： 指标模型_modelId_表采集，目标表名规范：stg_oc_modelId_tableName_full_20190810
// 创建写入（清洗）任务，命名规范: 指标模型_modelId_计算; 根据 sql 清洗出表  hive：create table edw_oc_bafgnl5xe_full_20190810 as  select * from stg_oc_bafgnl5xe_community_full_20190810;
// 创建项目，用 json 创建 task，指明 hive 表位置
// 创建项目，同步维度

// 备注：如果创建 hive 表失败，可尝试：
// delete from sugo_table_info where db_id=77 and table_name='stg_oc_bafgnl5xe_community_full_20190810'
// ssh 223, hive, drop table stg_oc_bafgnl5xe_community_full_20190810;

// TODO 支持增量计算
// TODO 支持字典表
// TODO 支持删除模型同步删除任务

const {
  dataDevHiveScriptProxyUser = 'root'
} = window.sugo

const isDevEnv = _.startsWith(_.get(window.sugo, 'env'), 'dev')

const { Step } = Steps

function getSagaState(ns) {
  return _.get(window.store.getState(), ns)
}

function reformatId(id) {
  return `${id || ''}`.replace(/-/g, '_').toLowerCase();
}

const treeNamespace = `${treeNS}_${TASK_TREE_TYPE.dataDevelop.name}`

@connect(state => {
  return {
    listData: _.get(state, [taskTreeNamespance, 'listData'], []),
    selectedKeys: _.get(state, [taskTreeNamespance, 'selectedKeys'], []),
    isDataCollect: _.get(state, [taskTreeNamespance, 'isDataCollect'], []),
    taskActionType: _.get(state, [taskTreeNamespance, 'taskActionType'], []),
    scheduleInfos: _.get(state, [taskTreeNamespance, 'scheduleInfos'], {}),
    taskTreeInfo: _.get(state, [taskTreeNamespance, 'taskTreeInfo'], {}),
    ...state[mainNS],
    ...state[dbConnNS],
    ...state[treeNamespace]
  }
})
@withRuntimeSagaModel([
  () => taskTreeModel({taskTreeType: TASK_TREE_TYPE.dataDevelop.name}),
  TaskListModel,
  () => {
    return getSagaState(dbConnNS) ? null : dbConnModel
  }
])
export default class ModelPublisher extends React.Component {
  static contextType = getContextByName(ContextNameEnum.ProjectInfo)
  
  state = {
    step: -1,
    hasError: false,
    runTaskAfterCreated: false
  }
  
  componentDidMount() {
  }
  
  syncDataSource = async () => {
    let {
      depDataSources, depTables, outputCols, modelId,
      dataSource: scheduleDs, onVisibleChange, dispatch
    } = this.props
    // 加载数据源
    let scheDsArr = await new Promise(resolve => {
      dispatch({
        type: `${dbConnNS}/getDataTables`,
        callback: resolve
      })
    })
    
    const OfflineCalcDataSourceTypeConvertDict = {
      Tindex: '',
      MySQL: 'mysql',
      Oracle: 'oracle',
      Db2: 'db2',
      SQLServer: 'sqlserver',
      PostgreSQL: 'postgresql'
    }
    await forAwaitAll(depDataSources, async ds => {
      let dbAlais = `指标模型_${reformatId(modelId)}_数据源_${ds.name}`
      let existed = _.some(scheDsArr, scheDs => scheDs.dbAlais === dbAlais)
      if (existed) {
        return existed
      }
      let {name, type, connection_params} = ds
      let { hostAndPort, database, schema, user, password} = connection_params || {}
      let typeEnumName = _.findKey(OfflineCalcDataSourceTypeEnum, v => v === type)
      const dbType = OfflineCalcDataSourceTypeConvertDict[typeEnumName]
      if (!dbType) {
        // hive 无需创建数据源
        return null
      }
      const res = await new Promise(resolve => {
        const [dbIp, dbPort] = hostAndPort.split(':')
        const payload = {
          'dbAlais': dbAlais,
          'dbType': dbType,
          'dbUser': user,
          'dbPassword': password ? xorUtils.decrypt(password) : '',
          'dbIp': dbIp,
          'dbPort': +dbPort,
          'dbName': database,
          'schema': schema
        }
        dispatch({
          type: `${dbConnNS}/save`,
          payload: payload,
          callback: resolve
        })
      })
      if (!res) {
        throw new Error(`同步数据库连接失败: ${dbAlais}`)
      }
      return res
    })
    this.setState({
      step: this.state.step + 1
    })
  
    await new Promise(resolve => {
      dispatch({ type: `${mainNS}/getDataDb`, force: true, callback: resolve })
    })
    // 等待数据源状态设置到 store 并更新到 props
    await delayPromised(1000)
  }
  
  // 这个方法只有在同步数据源后才能调用
  queryColInfoForTable = async () => {
    let {
      modelName, depDataSources, depTables, outputCols, modelId,
      dataSource: scheduleDs, onVisibleChange, dispatch, treeData, taskTreeInfo
    } = this.props
  
    // 获取字段类型
    // [{name: "id", type: "int", length: null, comment: ""}]
    let colInfoOfTables = await forAwaitAll(depTables, async t => {
      // hive 使用另外的查询字段类型的接口
      let belongsToOcDs = _.find(depDataSources, ds => ds.id === t.data_source_id)
      if (!belongsToOcDs) {
        throw new Error(`DataSource not found for table: ${t.title || t.name}`)
      }
      if (_.startsWith(t.id, 'hive')) {
        let hiveDbName = _.get(belongsToOcDs, 'connection_params.database')
        let queryHiveTableFieldsRes = await FetchFinal.get(`/app/hive/${hiveDbName}/${t.name}/schema`)
        return _.get(queryHiveTableFieldsRes, 'result.schema', []).map(fi => ({
          sourceCol: fi.name,
          sourceType: fi.type,
          finalCol: fi.name,
          finalType: 'string'
        }))
      }
      const tagetScheDsName = `指标模型_${reformatId(modelId)}_数据源_${belongsToOcDs.name}`
      let targetScheDs = _.find(scheduleDs, ds => ds.dbAlais === tagetScheDsName)
      
      return await new Promise(resolve => {
        dispatch({
          type: `${mainNS}/getDataFields`,
          payload: {
            dbId: targetScheDs.id,
            tableName: t.name
          },
          callback: resolve
        })
      })
    })
  
    return _.zipObject(depTables.map(t => t.id), colInfoOfTables.map(colInfo => _.keyBy(colInfo, c => c.sourceCol)))
  }
  
  syncOdsTask = async (colInfoIdFieldNameDict, outputDims) => {
    let {
      modelName, depDataSources, depTables, outputCols, modelId, joinDimDeps,
      dataSource: scheduleDs, onVisibleChange, dispatch, treeData, taskTreeInfo
    } = this.props
  
    const odsTaskType = treeData && treeData[0]
    if (!odsTaskType) {
      throw new Error('没有找到数据采集任务的分类')
    }
  
    const allDimDeps = [..._.flatMap(outputDims, od => od._dimDeps), ...joinDimDeps]
    let fieldDepsGroupByTable = groupBy(allDimDeps,
      info => info.tableId,
      arr => arr.map(info => info.fieldName))
    
    // hive 数据源无需采集
    const preCollectTables = depTables.filter(t => !_.startsWith(t.id, 'hive_'))
    // 创建采集任务
    let odsTitle = `指标模型_${reformatId(modelId)}_表采集`
    let odsShowName = `指标模型_${modelName}_表采集`
    const businessDepartment = '无'
    const description = `指标模型 ${modelName} 所依赖的采集任务`

    let existedOdsTask = _.find(taskTreeInfo.tasks, ot => ot.showName === odsTitle)
    existedOdsTask = existedOdsTask || await new Promise(resolve => {
      dispatch({
        type: `${mainNS}/addTaskBaseInfo`,
        payload: {
          showName: odsTitle,
          businessDepartment: businessDepartment,
          businessName: odsShowName,
          description: description,
          actionType: TASK_ACTION_TYPE.dataCollection,
          typeId: _.startsWith(odsTaskType.key, 'type-') ? odsTaskType.key.substr(5) : odsTaskType.key
        },
        callback: res => resolve(_.get(res, 'newProject'))
      })
    })
    if (!existedOdsTask || !existedOdsTask.name) {
      throw new Error(`创建采集任务失败： ${odsTitle}`)
    }

    const dataCollectionInof = preCollectTables.map(t => {
      let belongsToOcDs = _.find(depDataSources, ds => ds.id === t.data_source_id)
      const tagetScheDsName = `指标模型_${reformatId(modelId)}_数据源_${belongsToOcDs.name}`
      let dbInfo = _.find(scheduleDs, ds => ds.dbAlais === tagetScheDsName)
      let fieldDeps = fieldDepsGroupByTable[t.id]
      let fieldDepsSet = new Set(fieldDeps)
      let colInfoFieldNameDict = colInfoIdFieldNameDict[t.id]
      const columnInfo = _(t.params.fieldInfos)
        .filter(ocField => fieldDepsSet.has(ocField.field))
        .map(ocField => {
          let colInfo = colInfoFieldNameDict[ocField.field]
          // 将必要的维度设为 int/double
          return {
            finalCol: _.snakeCase(ocField.field), // 不能用驼峰命名法
            finalType: guessDruidStrTypeByDbDataType(colInfo.sourceType).toLowerCase(),
            finalComment: '',
            sourceCol: ocField.field,
            sourceType: colInfo.sourceType,
            sourceComment: ''
          }
        })
      return {
        columnInfo,
        datasource: t.name,
        column:'',
        filterSql:'',
        dbInfo,
        toDataSource: `stg_oc_${reformatId(modelId)}_${_.snakeCase(t.name)}_full_${moment().format('YYYYMMDD')}`
      }
    })
    let taskDetails = {
      name: existedOdsTask.name,
      description,
      showName: odsTitle,
      businessDepartment: businessDepartment,
      businessName: odsShowName,
      dataCollectionInof
    }
    let saveTaskRes = await new Promise(resolve => {
      dispatch({
        type: `${mainNS}/saveTaskConfigInfo`,
        payload: taskDetails,
        callback: resolve
      })
    })
    if (!saveTaskRes) {
      throw new Error('保存采集任务失败')
    }
    await this.setCronForTask(existedOdsTask)

    this.setState({
      step: this.state.step + 1
    })
    // 等待数据源状态设置到 store 并更新到 props
    await delayPromised(1000)
    
    return {
      task: existedOdsTask,
      hiveDbName: _.get(saveTaskRes, 'hiveInfo.dbName') || 'default'
    }
  }
  
  createWaitNode = async (waitNodeJobName, existedWriteTask) => {
    let {
      modelName, depDataSources, depTables, outputCols, modelId, genSqlExpression, hivePrefixSettings, hiveDbName, tableIdDict,
      dataSource: scheduleDs, onVisibleChange, dispatch, treeData, taskTreeInfo
    } = this.props
    
    // 读取采集任务的结束节点 nodeId
    let odsTasks = _(depTables)
      .map(t => {
        if (_.startsWith(t.id, 'hive')) {
          return null
        }
        let odsTitle = `指标模型_${reformatId(modelId)}_表采集`
        return _.find(taskTreeInfo.tasks, t => t.showName === odsTitle)
      })
      .compact()
      .value()
    
    // 如果没有采集任务，则不创建等待节点（可能都是 hive 数据表）
    if (_.isEmpty(odsTasks)) {
      return null
    }
    // create job node
    let waitJobNodeInfo = {
      'jobName': `${waitNodeJobName}`,
      'scriptContent': JSON.stringify([
        ...odsTasks.map(ot => {
          let nodes = _.get(ot, 'flows[0].nodes')
          let endNode = _.find(nodes, n => n.showName === '结束')
          if (!endNode) {
            throw new Error(`${ot.showName} 没有找到结束节点`)
          }
          return {
            'executeTime':'1,hour',
            'timeout': 3600000, // 1 hour, 60 * 60 * 1000 (ms)
            'projectId': `${ot.id}`,
            'nodeId': endNode.id
          }
        })
      ]),
      'jobOverride[nodeWait.script]': `scripts/${waitNodeJobName}.sh`,
      'jobOverride[showName]': '等待',
      'jobOverride[name]': '等待',
      'jobOverride[type]': 'nodeWait',
      'paramJson': {}
    }
    const createWaitJobNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${existedWriteTask.name}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(waitJobNodeInfo)
    })
    if (!createWaitJobNodeRes) {
      throw new Error('创建等待节点失败')
    }
    return waitJobNodeInfo
  }
  
  createHiveNode = async (hiveNodeJobName, outputDims, odsTaskInfo, existedWriteTask, writeTableName) => {
    let {
      modelName, depDataSources, depTables, outputCols, modelId, genSqlExpression, hivePrefixSettings, hiveDbName, tableIdDict,
      dataSource: scheduleDs, onVisibleChange, dispatch, treeData, taskTreeInfo
    } = this.props
  
    let modelSql = genSqlExpression({
      // 覆盖 tableIdDict 主要是为了读 hive 的实际 dbName
      tableIdDict: _.mapValues(_.pick(tableIdDict, depTables.map(t => t.id)), (t, tid) => {
        if (_.startsWith(tid, 'hive')) {
          return immutateUpdate(t, 'params.hiveDbName', () => {
            let ds = _.find(depDataSources, ds => ds.id === t.data_source_id)
            return _.get(ds, 'connection_params.database') || ''
          })
        }
        return immutateUpdate(t, 'params.hiveDbName', () => _.get(odsTaskInfo, 'hiveDbName') || '')
      }),
      rawTableNameDict: _.zipObject(
        depTables.map(t => t.name),
        depTables.map(t => {
          return _.startsWith(t.id, 'hive')
            ? t.name
            : `stg_oc_${reformatId(modelId)}_${_.snakeCase(t.name)}_full_${moment().format('YYYYMMDD')}`
        })),
      // 直接使用 hive 数据源的话不用改名
      fieldNameModer: (fieldName, table) => _.startsWith(table.id, 'hive') ? fieldName : _.snakeCase(fieldName)
    })
    const colAndTypes = (outputDims || [])
      .map(od => {
        let dataType = od.type === DruidColumnType.Date
          ? 'timestamp'
          : _.toLower(DruidNativeType[od.type] || 'string')
        return `${od.name} ${dataType}`
      }).join(',\n')

    // TODO 支持增量
  
    let hiveScriptContent = `
${hivePrefixSettings || ''}

drop table if EXISTS ${writeTableName};
create table ${writeTableName}(
${colAndTypes}
);

alter table ${writeTableName} SET SERDEPROPERTIES('serialization.null.format' = '');

insert OVERWRITE  TABLE ${writeTableName} ${modelSql};
`
    let hiveJobNodeInfo = {
      'jobName': `${hiveNodeJobName}`,
      'scriptContent': hiveScriptContent,
      'jobOverride[showName]': 'Hive脚本',
      'jobOverride[hive.script]': `${hiveNodeJobName}.sql`,
      'jobOverride[name]': 'Hive脚本',
      'jobOverride[user.to.proxy]': dataDevHiveScriptProxyUser,
      'jobOverride[type]': 'hive',
      'paramJson': {}
    }
    const createHiveNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${existedWriteTask.name}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(hiveJobNodeInfo)
    })
    if (!createHiveNodeRes) {
      throw new Error('创建 Hive 节点失败')
    }
    return hiveJobNodeInfo
  }
  
  createShellNode = async (shellNodeJobName, targetProject, outputDims, existedWriteTask) => {
    let {
      modelName, depDataSources, depTables, outputCols, modelId, genSqlExpression, hivePrefixSettings, hiveDbName, tableIdDict,
      dataSource: scheduleDs, onVisibleChange, dispatch, treeData, taskTreeInfo
    } = this.props
  
    let edwTableName = `edw_oc_${reformatId(modelId)}_full_${moment().format('YYYYMMDD')}`
    
    // TODO genLoadHiveTableTaskSpec 改为运行时去拿
    let queryActiveOverlordRes = await FetchFinal.get('/app/tindex/leaderHost')
    let loadHiveTableTaskSpec = genLoadHiveTableTaskSpec(targetProject.datasource_name, hiveDbName, edwTableName, outputDims, visualModelHiveBaseDirPrefixForTindexSpec)
    let createTaskShell = `
curl -XPOST -H "Content-type: application/json" -d '${JSON.stringify(loadHiveTableTaskSpec)}' 'http://${_.get(queryActiveOverlordRes, 'result')}/druid/indexer/v1/task'
`
    let shellJobNodeInfo = {
      'jobName': shellNodeJobName,
      'scriptContent': createTaskShell,
      'jobOverride[name]':'Shell脚本',
      'jobOverride[type]':'command',
      'jobOverride[showName]':'Shell脚本',
      'paramJson':{}
    }
    const createShellNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${existedWriteTask.name}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(shellJobNodeInfo)
    })
    if (!createShellNodeRes) {
      throw new Error('创建 Shell 节点失败')
    }
    return shellJobNodeInfo
  }
  
  createExportToDbNode = async (jobName, outputColInfos, hiveDbName, outputToDataBase, outputToTable, existedWriteTask, hiveTableName) => {
    let { name } = existedWriteTask
    let hiveHostInfo = await FetchFinal.get('/app/hive/host')
    if (!hiveHostInfo) {
      throw new Error('无效的 hive 服务配置')
    }
    let { host: hiveHost, port: hivePort } = hiveHostInfo.result
    const shellNodeJobName = jobName
    let { connection_params: { database, hostAndPort, password, user, schema }, type: dbType } = outputToDataBase
    const [dbIp, dbPort] = hostAndPort.split(':')
    password = xorUtils.decrypt(password)
    dbType = _.findKey(OfflineCalcDataSourceTypeEnum, p => p === dbType)
    let outputColNames = (outputColInfos || []).map(c => c.name).join(',')
    let modelSql = ` select * from ${hiveTableName} `

    let createTaskShell = `
      java -Dhive.host=${hiveHost} -Dhive.port=${hivePort} -Dhive.database=${hiveDbName} -Dhive.user=hive "-Dhive.sql=${modelSql}" -Dtaget.db.type=${dbType} -Dtaget.db.host=${dbIp} -Dtaget.db.port=${dbPort} -Dtaget.db.database=${database} -Dtaget.db.user=${user} -Dtaget.db.password=${password} -Dtaget.db.table=${outputToTable} -Dtaget.db.columns=${outputColNames} ${dbType === 'Db2' ? `-Dtarget.db.schema=${schema || (user).toUpperCase()}` : ''} -cp '/opt/apps/sugo-etl-1.0/lib/*'  io.sugo.service.HiveExporter
    `
    let shellJobNodeInfo = {
      'jobName': shellNodeJobName,
      'scriptContent': createTaskShell,
      'jobOverride[name]': 'Shell脚本',
      'jobOverride[type]': 'command',
      'jobOverride[showName]': 'Shell脚本',
      'paramJson': {}
    }
    const createShellNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${name}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(shellJobNodeInfo)
    })
    if (!createShellNodeRes) {
      throw new Error('创建 Shell 节点失败')
    }

    return shellJobNodeInfo
  }

  syncCalcTask = async (targetProject, outputDims, odsTaskInfo) => {
    let {
      modelName, depDataSources, depTables, outputCols, modelId, genSqlExpression, hivePrefixSettings, hiveDbName, tableIdDict,
      dataSource: scheduleDs, onVisibleChange, dispatch, treeData, taskTreeInfo, outputTargetType, hiveDataInfo, outputToDataBase, outputToTable 
    } = this.props
    
    const writeTaskType = treeData && treeData[1]
    if (!writeTaskType) {
      throw new Error('没有找到数据清洗任务的分类')
    }
    let writeTaskTitle = `指标模型_${reformatId(modelId)}_计算`
    let writeTaskShowName = `指标模型_${modelName}_计算`
    const description = `指标模型 ${modelName} 所依赖的计算任务`
    
    let existedWriteTask = _.find(taskTreeInfo.tasks, ot => ot.showName === writeTaskTitle)

    existedWriteTask = existedWriteTask || await new Promise(resolve => {
      dispatch({
        type: `${mainNS}/addTaskBaseInfo`,
        payload: {
          showName: writeTaskTitle,
          description: description,
          businessDepartment: '无',
          businessName: writeTaskShowName,
          actionType: TASK_ACTION_TYPE.dataCleaning,
          typeId: _.startsWith(writeTaskType.key, 'type-') ? writeTaskType.key.substr(5) : writeTaskType.key
        },
        callback: res => resolve(_.get(res, 'newProject'))
      })
    })
    if (!existedWriteTask) {
      throw new Error(`创建指标模型 ${modelName} 所依赖的计算任务失败`)
    }
    let edwTableName = `edw_oc_${reformatId(modelId)}_full_${moment().format('YYYYMMDD')}`
    let writeTableName = [hiveDbName, edwTableName].join('.')

    let waitNodeJobName = Date.now()
    let waitJobNodeInfo = await this.createWaitNode(waitNodeJobName, existedWriteTask)

    let hiveNodeJobName = waitNodeJobName + 10
    let hiveJobNodeInfo = await this.createHiveNode(hiveNodeJobName, outputDims, odsTaskInfo, existedWriteTask, writeTableName)

    let saveToDbNodeInfo = null
    let saveToDbNodeJobName = hiveNodeJobName
    if (outputTargetType) {
      saveToDbNodeJobName = saveToDbNodeJobName + 10
      saveToDbNodeInfo = await this.createExportToDbNode(saveToDbNodeJobName, outputDims, hiveDbName, outputToDataBase, outputToTable, existedWriteTask, writeTableName)
    }
    const shellNodeJobName = saveToDbNodeJobName + 10
    let shellJobNodeInfo = await this.createShellNode(shellNodeJobName, targetProject, outputDims, existedWriteTask)

    const endNodeJobName = shellNodeJobName + 10
    const endingNode = { jobName: endNodeJobName, 'jobOverride[name]': '结束', 'jobOverride[type]': 'end' }

    let nodes = [waitJobNodeInfo, hiveJobNodeInfo, shellJobNodeInfo, saveToDbNodeInfo, endingNode].filter(_.identity)
    let flowId = existedWriteTask.name
    const taskConfig = {
      ...existedWriteTask,
      actionType: TASK_ACTION_TYPE.dataCleaning,
      data: {
        'title': flowId,
        'nodes': _.zipObject(nodes.map(n => `${flowId}_node_${n.jobName}`), nodes.map((n, i) => {
          return {
            'top': 46 + 80 * i,
            'left': 365,
            'name': n['jobOverride[name]'],
            'width': 104,
            'type': n['jobOverride[type]'],
            'height': 26
          }
        })),
        'lines': _.zipObject(_.take(nodes, nodes.length - 1).map((n, i) => `${flowId}_line_${n.jobName}__${nodes[i + 1].jobName}`),
          _.take(nodes, nodes.length - 1).map((n, i) => ({
            'type': 'sl',
            'from': `${flowId}_node_${n.jobName}`,
            'to': `${flowId}_node_${nodes[i + 1].jobName}`
          }))),
        'areas': {},
        'initNum': 1
      }
    }
    
    let saveTaskRes = await new Promise(resolve => {
      dispatch({
        type: `${mainNS}/saveTaskFlowInfo`,
        payload: taskConfig,
        callback: resolve
      })
    })
    if (!saveTaskRes) {
      throw new Error(`创建指标模型 ${modelName} 所依赖的计算任务失败`)
    }
    await this.setCronForTask(existedWriteTask)
    this.setState({
      step: this.state.step + 1
    })
    // 等待数据源状态设置到 store 并更新到 props
    await delayPromised(1000)
    return existedWriteTask
  }
  
  setCronForTask = async (task) => {
    let {
      depDataSources, depTables, outputCols, scheduleCron, dispatch,
      dataSource: scheduleDs, onVisibleChange, scheduleInfos
    } = this.props
  
    let scheduleInfoForTask = _.get(scheduleInfos[task.id], [0])
    if (!_.isEmpty(scheduleCron)) {
      // 更新调度设置
      let updateSchedRes = await new Promise(resolve => {
        dispatch({
          type: `${mainNS}/saveScheduleCron`,
          payload: {
            name: task.name,
            id: task.id,
            executorIdsOverwrite: '',
            cronInfoOverwrite: scheduleCron,
            scheduleIdOverwrite: scheduleInfoForTask && scheduleInfoForTask.scheduleId || ''
          },
          callback: resolve
        })
      })
      if (!updateSchedRes) {
        throw new Error('保存调度设置失败')
      }
    } else {
      // 移除调度设置
      if (scheduleInfoForTask) {
        let res = await FetchFinal.post(`/app/new-task-schedule/schedule?action=removeSched&scheduleId=${scheduleInfoForTask.scheduleId}`)
        if (!(res && res.status && res.status === 'success')) {
          throw new Error('取消调度设置失败')
        }
      }
    }
  }
  
  startTasks = async (tasks) => {
    let {
      depDataSources, depTables, outputCols, scheduleCron, dispatch,
      dataSource: scheduleDs, onVisibleChange, scheduleInfos
    } = this.props
    await forAwaitAll(tasks, async t => {
      let res = await new Promise(resolve => {
        dispatch({
          type: `${mainNS}/startTask`,
          payload: {
            project: t.name,
            projectId: t.id
          },
          callback: resolve
        })
      })
      if (!res) {
        throw new Error(`启动任务失败: ${t.showName}`)
      }
      return res
    })
    // done
    this.setState({
      step: this.state.step + 1
    })
  }
  
  genStepIcon = (forStep) => {
    return forStep === this.state.step
      ? <LegacyIcon type={this.state.hasError ? 'exclamation-circle' : 'loading'} />
      : undefined;
  }
  
  render() {
    let {
      depDataSources, depTables, outputCols, modelName, idxIdDict,
      dataSource: scheduleDs, onVisibleChange, institution
    } = this.props
    let {projectList} = this.context
    
    let {step, runTaskAfterCreated, hasError} = this.state
    const closable = hasError || step === -1 || (step === (runTaskAfterCreated ? 5 : 4))
    return (
      <Modal
        title="发布模型"
        visible
        closable={closable}
        onOk={async () => {
          if (step === -1) {
            this.setState({
              step: 0
            })
            try {
              // 先同步数据源，后续操作需要查询数据源中表的字段信息
              await this.syncDataSource()
              let colInfoIdFieldNameDict = await this.queryColInfoForTable()
              
              // 先创建项目、维度、指标，后续操作需要依赖 dataSourceName 和 输出的列
  
              let getDruidDimTypeByTableField = (tableId, fieldName) => {
                let colInfo = _.get(colInfoIdFieldNameDict, [tableId, fieldName])
                return colInfo ? guessDruidTypeByDbDataType(colInfo.sourceType) : DruidColumnType.String
              }
              let { targetProject, outputDims } = await createProjectForModel(getDruidDimTypeByTableField, {
                depTables, outputCols, idxIdDict, projectList, targetProjectName: `指标模型_${modelName}`, institution
              })
              this.setState({
                step: this.state.step + 1
              })
              
              // 创建采集任务
              let odsTaskInfo = await this.syncOdsTask(colInfoIdFieldNameDict, outputDims)
              // 创建计算任务，包括 等待节点、hive脚本和加载数据到 tindex 的操作
              let calcTask = await this.syncCalcTask(targetProject, outputDims, odsTaskInfo)
  
              let tasks = [odsTaskInfo.task, calcTask]
              
              if (runTaskAfterCreated) {
                await this.startTasks(tasks)
              }
            } catch (e) {
              message.warn(e.message)
              console.error(e)
              this.setState({
                hasError: true
              })
            }
          }
        }}
        okText="确认发布"
        cancelText={step === -1 ? '取消' : '关闭'}
        onCancel={() => {
          onVisibleChange(false)
        }}
        okButtonProps={{
          disabled: step !== -1
        }}
        cancelButtonProps={{
          disabled: !closable
        }}
      >
        {step === -1
          ? (
            // 发布完后是否立即开始执行调度任务
            // TODO 选择时间列
            <React.Fragment>
              <div className="mg2b">确认发布模型？</div>
              <Checkbox
                checked={runTaskAfterCreated}
                onChange={ev => {
                  let {checked} = ev.target
                  this.setState({
                    runTaskAfterCreated: checked
                  })
                }}
              >发布成功后立即执行</Checkbox>
            </React.Fragment>
          )
          : (
            <Steps
              direction="vertical"
              size="small"
              current={step}
            >
              <Step title="同步数据库连接到调度系统" icon={this.genStepIcon(0)} />
              <Step title="创建项目、维度和指标" icon={this.genStepIcon(1)} />
              <Step title="创建采集任务" icon={this.genStepIcon(2)} />
              <Step title="创建计算任务" icon={this.genStepIcon(3)} />
              {!runTaskAfterCreated ? null : (
                <Step title="开始执行任务" icon={this.genStepIcon(4)} />
              )}
            </Steps>
          )}
      </Modal>
    )
  }
}
