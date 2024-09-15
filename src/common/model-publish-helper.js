import _ from 'lodash'
import { delayPromised, forAwaitAll, groupBy, immutateUpdate, isDiffBySomePath } from './sugo-utils'
import { OfflineCalcDataSourceTypeEnum } from './constants'
import xorUtils from './xor-utils'
import {
  guessDruidStrTypeByDbDataType,
  guessDruidTypeByDbDataType,
  timestampFormatForHive,
  timestampFormatForHiveWithoutMS
} from './offline-calc-model-helper'
import moment from 'moment'
import { AccessDataType, VisualModelCalcTypeEnum } from './constants'
import DruidColumnType, { DRUID_DIMENSION_MAP, DruidColumnTypeInverted, DruidNativeType } from './druid-column-type'
import { numberFormulaGenerator, stringFormulaGenerator } from './temp-metric'
import { generate } from 'shortid'

const TASK_ACTION_TYPE = {
  dataCollection: 1,
  dataCleaning: 2,
  dataModeling: 3
}

// export function guessDruidTypeByDbDataType(dbType) {
//   let dbTypeLowerCase = (dbType || '').toLowerCase()
//   if (/text|clob|graphic|blob|binary|image|json|xml|raw|file/.test(dbTypeLowerCase)) {
//     return DruidColumnType.Text
//   }
//   if (/char|uid|rowid|enum|set/.test(dbTypeLowerCase)) {
//     return DruidColumnType.String
//   }
//   if (/bigdecimal|bigserial|bigint/.test(dbTypeLowerCase)) {
//     return DruidColumnType.BigDecimal
//   }
//   if (/double|real|num|decimal|dec|money/.test(dbTypeLowerCase)) {
//     return DruidColumnType.Double
//   }
//   if (/long/.test(dbTypeLowerCase)) {
//     return DruidColumnType.Long
//   }
//   if (/^int|int$|bit|bool|byte|serial/.test(dbTypeLowerCase)) {
//     return DruidColumnType.Int
//   }
//   if (/float/.test(dbTypeLowerCase)) {
//     return DruidColumnType.Float
//   }
//   if (/date|time/.test(dbTypeLowerCase)) {
//     return DruidColumnType.Date
//   }
//   return DruidColumnType.String
// }

function reformatId(id) {
  return `${id || ''}`.replace(/-/g, '_').toLowerCase()
}


export function getDruidDimTypeByTableField(colInfoIdFieldNameDict) {
  return (tableId, fieldName) => {
    let colInfo = _.get(colInfoIdFieldNameDict, [tableId, fieldName])
    return colInfo ? guessDruidTypeByDbDataType(colInfo.sourceType) : DruidColumnType.String
  }
}


/**
 * 创建项目方法 返回要更新的数据
 * @param {*} getDruidDimTypeByTableField 
 * @param {*} depTables 
 * @param {*} outputCols 
 * @param {*} idxIdDict 
 * @param {*} projectList 
 * @param {*} targetProjectName 
 * @param {*} calcType 
 * @param {*} institution 
 * @param {*} roleIds 用户权限
 * @param {*} dimensions 当前项目下已有的维度信息
 * @param {*} measures 当前项目下已有的指标信息
 */
export function createProjectForModel(
  getDruidDimTypeByTableField,
  depTables,
  outputCols,
  idxIdDict,
  projectList,
  targetProjectName,
  dimensions,
  measures,
  roleIds = [],
  calcType = VisualModelCalcTypeEnum.Select,
  institution = ''
) {
  const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy

  const formulaAstToPlyqlFormula = (ast) => {
    if (!_.isPlainObject(ast)) {
      return ast
    }
    let { op, left, right } = ast
    switch (op) {
      case '+':
      case '-':
        return `(${formulaAstToPlyqlFormula(left)} ${op} ${formulaAstToPlyqlFormula(right)})`
      case '*':
      case '/':
        return `${formulaAstToPlyqlFormula(left)} ${op} ${formulaAstToPlyqlFormula(right)}`
      case 'call':
        if (left === 'createIdx') {
          let { dim, filters, aggregator } = right[0]
          let { dataType, fieldName } = _.get(dim, 'args[0]')
          // TODO consider rename
          let sliceFilters = filters.map(flt => {
            return {
              ...flt,
              col: _.get(flt, 'dim.args[0].fieldName')
            }
          })
          const generator = DruidColumnTypeInverted[dataType] === 'number'
            ? numberFormulaGenerator({ filters: sliceFilters })
            : stringFormulaGenerator({ filters: sliceFilters })
          return generator[aggregator](fieldName)
        }
        if (left === 'useIdx') {
          let { idxId } = right[0]
          let ast = _.get(idxIdDict[idxId], 'formula_info.ast')
          return ast && formulaAstToPlyqlFormula(ast) || ''
        }
        throw new Error(`Unhandled func: ${left}`)
      default:
        throw new Error(`Unhandled op: ${left}`)
    }
  }

  function outputDimColInfoToDbDim(oc, institution) {
    let { dimId, renameTo, omitInGroupByMode, castTo, parseDateFormat, castToDateFormat, isMainTimeDim } = oc
    if (isCalcTypeEqGroupBy && omitInGroupByMode) {
      return null
    }
    let [tableId, fieldName] = dimId.split('/')
    let originalDimType = getDruidDimTypeByTableField(tableId, fieldName)
    let params = { originalType: originalDimType, parseDateFormat, castToDateFormat, isMainTimeDim, isInstitution: false }
    if (dimId === institution) params.isInstitution = true
    return {
      name: _.snakeCase(renameTo || fieldName),
      type: castTo ? DruidColumnType[castTo] : originalDimType,
      // 'user_ids':[],
      role_ids: roleIds,
      // 'tags':[],
      // 'sourceName': existedProject.datasource_name,
      // 'isUindex': false,
      params,
      _dimDeps: [{ tableId, fieldName }]
    }
  }

  function guessIdxOutputType(idxAst) {
    // count, countDistinct => long
    // max, min, sum => by dim type

    // useIdx({idxId: 'dimId'}) 使用现有指标
    // createIdx({dim: {func: 'useDim', args: [{dimId: 'xxx'}]}, aggregator: 'count'}) 创建指标

    if (!_.isPlainObject(idxAst)) {
      return _.isInteger(+idxAst) ? DruidColumnType.Int : DruidColumnType.Double
    }
    let { op, left, right } = idxAst
    switch (op) {
      case '+':
      case '-':
      case '*':
      case '/':
      {
        return guessIdxOutputType(left) === DruidColumnType.Double || guessIdxOutputType(right) === DruidColumnType.Double
          ? DruidColumnType.Double
          : DruidColumnType.Int
      }
      case 'call':
        if (left === 'createIdx') {
          let { dim, filters, aggregator } = right[0]
          if (aggregator === 'count' || aggregator === 'countDistinct') {
            return DruidColumnType.Int
          }
          // TODO find real dim type
          // let {dataType, fieldName} = _.get(dim, 'args[0]')
          return DruidColumnType.Double
        }
        if (left === 'useIdx') {
          let { idxId } = right[0]
          let ast = _.get(idxIdDict[idxId], 'formula_info.ast')
          return ast && guessIdxOutputType(ast) || DruidColumnType.Double
        }
        throw new Error(`Unhandled func: ${left}`)
      default:
        throw new Error(`Unhandled op: ${left}`)
    }
  }

  function outputIdxColInfoToDbDim(oc) {
    let { idxId, renameTo } = oc
    let idx = _.get(idxIdDict, idxId)
    let isCalcDim = _.get(idx, 'formula_info.isCalcDim')
    let dimDepInfos = _(_.get(idx, 'formula_info.dimDeps') || [])
      .map(dimDep => {
        // dsId|tableName|fieldName
        let [dsId, tableName, fieldName] = dimDep.split('|')
        let table = _.find(depTables, t => t.name === tableName && t.data_source_id === dsId)
        return table && { tableId: table.id, fieldName }
      })
      .compact()
      .value()

    if (!isCalcDim) {
      // 聚合型指标，输出大宽表时不输出，同步到指标管理，在多维分析实时计算
      if (!isCalcTypeEqGroupBy) {
        return null
      }
      // groupby 模式，聚合型指标将会输出成数值列
      let idxAst = _.get(idx, 'formula_info.ast')
      return {
        name: _.snakeCase(renameTo || idx.name),
        type: guessIdxOutputType(idxAst),
        role_ids: roleIds,
        _dimDeps: dimDepInfos
      }
    }

    // 非聚合型指标, 目前非聚合指标只支持数值
    let druidTypes = _.map(dimDepInfos, dimDepInfo => {
      return getDruidDimTypeByTableField(dimDepInfo.tableId, dimDepInfo.fieldName)
    }).filter(_.identity)

    return {
      name: _.snakeCase(renameTo || idx.name),
      type: _.some(druidTypes, t => t === DruidColumnType.Float || t === DruidColumnType.Double || t === DruidColumnType.BigDecimal)
        ? DruidColumnType.Double
        : _.some(druidTypes, t => t === DruidColumnType.Long)
          ? DruidColumnType.Long
          : DruidColumnType.Int,
      role_ids: roleIds,
      _dimDeps: dimDepInfos
    }
  }


  let res = {
    project: {},
    dimensions: {},
    measures: {}
  }

  // 判断项目是否存在 不存在则添加
  let existedProject = _.find(projectList, p => p.name === targetProjectName)
  res.project = {
    id: existedProject ? existedProject.id : '',
    name: targetProjectName,
    type: AccessDataType.OfflineCalc
  }

  // 创建维度
  let preCreateDims = _(outputCols)
    .map(oc => {
      let { dimId, idxId, renameTo } = oc
      if (dimId) {
        return outputDimColInfoToDbDim(oc, institution)
      } else if (idxId) {
        return outputIdxColInfoToDbDim(oc)
      } else {
        throw new Error(`Unknown outputCol: ${JSON.stringify(oc)}`)
      }
    })
    .compact()
    .value()

  let existedDimDict = _.keyBy(dimensions, 'name')
  res.dimensions = [{ name: '__time', type: DruidColumnType.Date, role_ids: roleIds }, ...preCreateDims].map(p => {
    let existed = existedDimDict[p.name]
    if (existed) {
      if (!isDiffBySomePath(p, existed, 'type', 'role_ids') && !isDiffBySomePath(p, existed, 'params.isInstitution')) {
        return
      }
      return {
        ...p,
        id: existed.id
      }
    }
    return p
  }).filter(_.identity)
  // 创建指标
  let preCreateMetrics = isCalcTypeEqGroupBy ? [] : _(outputCols).filter(oc => oc.idxId)
    .map(oc => {
      let { idxId, renameTo } = oc
      let idx = _.get(idxIdDict, idxId)
      let isCalcDim = _.get(idx, 'formula_info.isCalcDim')
      if (isCalcDim) {
        return null
      }
      const formulaAst = _.get(idx, 'formula_info.ast')
      return {
        name: renameTo || idx.name,
        title: idx.title || renameTo || idx.name,
        formula: formulaAstToPlyqlFormula(formulaAst).toString(),
        role_ids: roleIds,
        type: 1,
        params: { 'simple': { 'filters': [], 'statistics': { 'type': 'count', 'dimensionName': '' } }, 'composite': { 'items': [{}, {}], 'operator': 'divide' }, 'formulaEditMode': 'direct' }
      }
    })
    .compact()
    .value()

  let existedIdxDict = _.keyBy(measures, 'name')
  res.measures = preCreateMetrics.map(p => {
    let existed = existedIdxDict[p.name]
    if (existed) {
      if (!isDiffBySomePath(p, existed, 'type', 'role_ids') && !isDiffBySomePath(p, existed, 'params.isInstitution')) {
        return
      }
      return {
        ...p,
        id: existed.id
      }
    }
    return p
  }).filter(_.identity)
  res.outputDims = preCreateDims
  return res
}



// 同步数据源
/**
 * 
 * @param {*} scheDsArr // 现有任务调度数据源
 * @param {*} depDataSources //需要添加的数据源
 * @param {*} modelId // 计算模型编号
 * @param {*} saveDataSourceFunction //保存数据源方法
 */
export async function syncDataSource(scheDsArr, depDataSources, modelId, saveDataSourceFunction) {
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
    let { name, type, connection_params } = ds
    let { hostAndPort, database, schema, user, password } = connection_params || {}
    let typeEnumName = _.findKey(OfflineCalcDataSourceTypeEnum, v => v === type)
    const dbType = OfflineCalcDataSourceTypeConvertDict[typeEnumName]
    if (!dbType) {
      // hive 无需创建数据源
      return null
    }
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
    const res = await saveDataSourceFunction(payload)
    if (!res) {
      throw new Error(`同步数据库连接失败: ${dbAlais}`)
    }
    return res
  })
  await delayPromised(1000)
}


// 获取字段信息
/**
 * 
 * @param {*} depDataSources //
 * @param {*} depTables 
 * @param {*} modelId 
 * @param {*} scheduleDs // 调度数据源信息
 * @param {*} getScheduleTableFieldFunction //获取调度平台表信息方法
 * @param {*} getHiveTableFieldsFunction //获取hive表信息方法
 */
export async function queryColInfoForTable(depDataSources, depTables, modelId, scheduleDs, getScheduleTableFieldFunction, getHiveTableFieldsFunction) {

  // 获取字段类型
  // [{name: "id", type: "int", length: null, comment: ""}]
  let colInfoOfTables = await forAwaitAll(depTables, async t => {
    // hive 使用另外的查询字段类型的接口
    let belongsToOcDs = _.find(depDataSources, ds => ds.id === t.data_source_id)
    if (!belongsToOcDs) {
      throw new Error(`DataSource not found for table: ${t.title || t.name}`)
    }
    if (_.startsWith(t.id, 'hive')) {
      let queryHiveTableFieldsRes = await getHiveTableFieldsFunction('default', t.name)
      return _.get(queryHiveTableFieldsRes, 'result.schema', []).map(fi => ({
        sourceCol: fi.name,
        sourceType: fi.type,
        finalCol: fi.name,
        finalType: 'string'
      }))
    }
    const tagetScheDsName = `指标模型_${reformatId(modelId)}_数据源_${belongsToOcDs.name}`
    let targetScheDs = _.find(scheduleDs, ds => ds.dbAlais === tagetScheDsName)
    return await getScheduleTableFieldFunction(targetScheDs.id, t.name)
  })

  return _.zipObject(depTables.map(t => t.id), colInfoOfTables.map(colInfo => _.keyBy(colInfo, c => c.sourceCol)))
}

/**
 * 
 * @param {*} colInfoIdFieldNameDict 
 * @param {*} outputDims 
 * @param {*} modelName 
 * @param {*} depDataSources 
 * @param {*} depTables 
 * @param {*} modelId 
 * @param {*} joinDimDeps 
 * @param {*} scheduleDs 
 * @param {*} odsTaskList 
 * @param {*} createOdsTaskFunction 
 * @param {*} saveOdsTaskStepFunction 
 */
export async function syncOdsTask(
  colInfoIdFieldNameDict,
  outputDims,
  modelInfo,
  depTables,
  depDataSources,
  joinDimDeps,
  scheduleDs,
  odsTaskList,
  createOdsTaskFunction,
  saveOdsTaskStepFunction,
  taskTypeId,
  scheDsArr,
  dataDevHiveScriptProxyUser,
  setCronForTask
) {
  const { id: modelId, title: modelName } = modelInfo
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

  let existedOdsTask = _.find(odsTaskList, ot => ot.showName === odsTitle)
  existedOdsTask = existedOdsTask || await createOdsTaskFunction({
    showName: odsTitle,
    businessDepartment: businessDepartment,
    businessName: odsShowName,
    description: description,
    actionType: TASK_ACTION_TYPE.dataCollection,
    typeId: taskTypeId
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
      column: '',
      filterSql: '',
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

  const { params, jobName } = generatorTaskConfig(taskDetails, scheDsArr, dataDevHiveScriptProxyUser)
  let saveTaskRes = await saveOdsTaskStepFunction(existedOdsTask.name, jobName, params)

  if (!saveTaskRes) {
    throw new Error('保存采集任务失败')
  }

  await delayPromised(1000)
  // 设置调度信息
  await setCronForTask(existedOdsTask)
  return {
    task: existedOdsTask,
    hiveDbName: _.get(saveTaskRes, 'hiveInfo.dbName') || 'default'
  }
}


/**
 * 
 * @param {*} targetDataSourceName // 目标项目dataSourceName
 * @param {*} modelInfo //模型信息
 * @param {*} targetDataSourceDims // 目标项目的维度信息
 * @param {*} odsTaskInfo // 采集任务的信息
 * @param {*} odsTaskList // 调度任务列表
 * @param {*} offlineTables // 指标管理表信息
 * @param {*} offlineDataSources // 指标管理数据源信息
 * @param {*} genSqlExpression // sql生成方法
 * @param {*} createOdsTaskFunction // 创建任务
 * @param {*} saveOdsTaskStepFunction // 保存任务步骤方法
 * @param {*} saveOdsTaskFlowFun // 保存任务流程方法
 */
export async function syncCalcTask(
  targetDataSourceName,
  modelInfo,
  outputDims,
  odsTaskInfo,
  odsTaskList,
  depTables,
  depDataSources,
  genSqlExpression,
  createOdsTaskFunction,
  saveOdsTaskStepFunction,
  saveOdsTaskFlowFun,
  hiveHostInfo,
  activeOverlord,
  taskTypeId,
  scheDsArr,
  dataDevHiveScriptProxyUser,
  visualModelHiveBaseDirPrefixForTindexSpec,
  setCronForTask
) {
  const { id: modelId, title: modelName, params: { tableDeps, hiveDbName, outputTargetType, hivePrefixSettings, outputToDataBase, outputToTable, outputCols } } = modelInfo
  const tableIdDict = _.keyBy(depTables, p => p.id)
  let writeTaskTitle = `指标模型_${reformatId(modelId)}_计算`
  let writeTaskShowName = `指标模型_${modelName}_计算`
  const description = `指标模型 ${modelName} 所依赖的计算任务`

  let existedWriteTask = _.find(odsTaskList, ot => ot.showName === writeTaskTitle)
  existedWriteTask = existedWriteTask || await createOdsTaskFunction({
    showName: writeTaskTitle,
    description: description,
    businessDepartment: '无',
    businessName: writeTaskShowName,
    actionType: TASK_ACTION_TYPE.dataCleaning,
    typeId: taskTypeId
  })
  if (!existedWriteTask) {
    throw new Error(`创建指标模型 ${modelName} 所依赖的计算任务失败`)
  }

  let edwTableName = `edw_oc_${reformatId(modelId)}_full_${moment().format('YYYYMMDD')}`
  let writeTableName = [hiveDbName, edwTableName].join('.')
  const taskName = existedWriteTask.name

  const saveOdsTaskStepFunction2 = (taskDetails) => {
    return saveOdsTaskStepFunction(taskName, taskDetails)
  }

  let waitNodeJobName = Date.now()
  let waitJobNodeInfo = await createWaitNode(waitNodeJobName,
    depTables,
    modelId,
    odsTaskList,
    saveOdsTaskStepFunction2)

  let hiveNodeJobName = waitNodeJobName + 10
  let hiveJobNodeInfo = await createHiveNode(
    hiveNodeJobName,
    outputDims,
    odsTaskInfo,
    writeTableName,
    depDataSources,
    depTables,
    modelId,
    genSqlExpression,
    hivePrefixSettings,
    tableIdDict, //// todo
    saveOdsTaskStepFunction2,
    dataDevHiveScriptProxyUser)

  let saveToDbNodeInfo = null
  let saveToDbNodeJobName = hiveNodeJobName
  if (outputTargetType) {
    saveToDbNodeJobName = saveToDbNodeJobName + 10
    saveToDbNodeInfo = await createExportToDbNode(
      saveToDbNodeJobName,
      outputDims,
      hiveDbName,
      outputToDataBase, // todo
      outputToTable, // todo
      hiveTableName, // todo
      hiveHostInfo,  // todo
      saveOdsTaskStepFunction2)
  }
  const shellNodeJobName = saveToDbNodeJobName + 10
  let shellJobNodeInfo = await createShellNode(
    shellNodeJobName,
    targetDataSourceName,
    outputDims,
    modelId,
    hiveDbName,
    activeOverlord,
    saveOdsTaskStepFunction2,
    visualModelHiveBaseDirPrefixForTindexSpec
  )

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

  let saveTaskRes = await saveOdsTaskFlowFun(taskConfig)
  if (!saveTaskRes) {
    throw new Error(`创建指标模型 ${modelName} 所依赖的计算任务失败`)
  }
  await delayPromised(1000)
  await setCronForTask(existedWriteTask)
  // 等待数据源状态设置到 store 并更新到 props
  return existedWriteTask
}

async function createWaitNode(
  jobName,
  depTables,
  modelId,
  odsTaskList,
  saveOdsTaskStepFunction
) {
  // 读取采集任务的结束节点 nodeId
  let odsTasks = _(depTables)
    .map(t => {
      if (_.startsWith(t.id, 'hive')) {
        return null
      }
      let odsTitle = `指标模型_${reformatId(modelId)}_表采集`
      return _.find(odsTaskList, t => t.showName === odsTitle)
    })
    .compact()
    .value()

  // 如果没有采集任务，则不创建等待节点（可能都是 hive 数据表）
  if (_.isEmpty(odsTasks)) {
    return null
  }
  // create job node
  let waitJobNodeInfo = {
    'jobName': `${jobName}`,
    'scriptContent': JSON.stringify([
      ...odsTasks.map(ot => {
        let nodes = _.get(ot, 'flows[0].nodes')
        let endNode = _.find(nodes, n => n.showName === '结束')
        if (!endNode) {
          throw new Error(`${ot.showName} 没有找到结束节点`)
        }
        return {
          'executeTime': '1,hour',
          'timeout': 3600000, // 1 hour, 60 * 60 * 1000 (ms)
          'projectId': `${ot.id}`,
          'nodeId': endNode.id
        }
      })
    ]),
    'jobOverride[nodeWait.script]': `scripts/${jobName}.sh`,
    'jobOverride[showName]': '等待',
    'jobOverride[name]': '等待',
    'jobOverride[type]': 'nodeWait',
    'paramJson': {}
  }
  const createWaitJobNodeRes = await saveOdsTaskStepFunction(waitJobNodeInfo)
  if (!createWaitJobNodeRes) {
    throw new Error('创建等待节点失败')
  }
  return waitJobNodeInfo
}


async function createHiveNode(
  jobName,
  outputDims,
  odsTaskInfo,
  writeTableName,
  depDataSources,
  depTables,
  modelId,
  genSqlExpression,
  hivePrefixSettings,
  tableIdDict,
  saveOdsTaskStepFunction,
  dataDevHiveScriptProxyUser
) {

  let modelSql = genSqlExpression({
    // 覆盖 tableIdDict 主要是为了读 hive 的实际 dbName
    tableIdDict: _.mapValues(_.pick(tableIdDict, depTables.map(t => t.id)), (t, tid) => {
      if (_.startsWith(tid, 'hive')) {
        return immutateUpdate(t, 'params.hiveDbName', () => {
          let ds = _.find(depDataSources, ds => ds.id === t.data_source_id)
          return ds && ds.name || ''
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
    'jobName': `${jobName}`,
    'scriptContent': hiveScriptContent,
    'jobOverride[showName]': 'Hive脚本',
    'jobOverride[hive.script]': `${jobName}.sql`,
    'jobOverride[name]': 'Hive脚本',
    'jobOverride[user.to.proxy]': dataDevHiveScriptProxyUser,
    'jobOverride[type]': 'hive',
    'paramJson': {}
  }
  const createHiveNodeRes = await saveOdsTaskStepFunction(hiveJobNodeInfo)
  if (!createHiveNodeRes) {
    throw new Error('创建 Hive 节点失败')
  }
  return hiveJobNodeInfo
}


async function createExportToDbNode(
  jobName,
  outputColInfos,
  hiveDbName,
  outputToDataBase,
  outputToTable,
  hiveTableName,
  hiveHostInfo,
  saveOdsTaskStepFunction
) {
  let { host: hiveHost, port: hivePort } = hiveHostInfo
  let { connection_params: { database, hostAndPort, password, user, schema }, type: dbType } = outputToDataBase
  const [dbIp, dbPort] = hostAndPort.split(':')
  password = xorUtils.decrypt(password)
  dbType = _.findKey(OfflineCalcDataSourceTypeEnum, p => p === dbType)
  let outputColNames = (outputColInfos || []).map(c => c.name).join(',')
  let modelSql = ` select * from ${hiveTableName} `

  let createTaskShell = `
    java -Dhive.host=${hiveHost} -Dhive.port=${hivePort} -Dhive.database=${hiveDbName} -Dhive.user=hive "-Dhive.sql=${modelSql}" -Dtaget.db.type=${dbType} -Dtaget.db.host=${dbIp} -Dtaget.db.port=${dbPort} -Dtaget.db.database=${database} -Dtaget.db.user=${user} -Dtaget.db.password=${password} -Dtaget.db.table=${outputToTable} -Dtaget.db.columns=${outputColNames} ${dbType === 'Db2' ? `-Dtarget.db.schema=${schema || _.upperCase(user)}` : ''} -cp '/opt/apps/sugo-etl-1.0/lib/*'  io.sugo.service.HiveExporter
  `
  let shellJobNodeInfo = {
    'jobName': jobName,
    'scriptContent': createTaskShell,
    'jobOverride[name]': 'Shell脚本',
    'jobOverride[type]': 'command',
    'jobOverride[showName]': 'Shell脚本',
    'paramJson': {}
  }
  const createShellNodeRes = await saveOdsTaskStepFunction(shellJobNodeInfo)
  if (!createShellNodeRes) {
    throw new Error('创建 Shell 节点失败')
  }
  return shellJobNodeInfo
}


async function createShellNode(
  jobName,
  targetDataSourceName,
  outputDims,
  modelId,
  hiveDbName,
  activeOverlord,
  saveOdsTaskStepFunction,
  visualModelHiveBaseDirPrefixForTindexSpec
) {
  let edwTableName = `edw_oc_${reformatId(modelId)}_full_${moment().format('YYYYMMDD')}`

  // TODO genLoadHiveTableTaskSpec 改为运行时去拿
  let loadHiveTableTaskSpec = genLoadHiveTableTaskSpec(targetDataSourceName, hiveDbName, edwTableName, outputDims, visualModelHiveBaseDirPrefixForTindexSpec)
  let createTaskShell = `
    curl -XPOST -H "Content-type: application/json" -d '${JSON.stringify(loadHiveTableTaskSpec)}' 'http://${activeOverlord}/druid/indexer/v1/task'
  `
  let shellJobNodeInfo = {
    'jobName': jobName,
    'scriptContent': createTaskShell,
    'jobOverride[name]': 'Shell脚本',
    'jobOverride[type]': 'command',
    'jobOverride[showName]': 'Shell脚本',
    'paramJson': {}
  }
  const createShellNodeRes = await saveOdsTaskStepFunction(shellJobNodeInfo)
  if (!createShellNodeRes) {
    throw new Error('创建 Shell 节点失败')
  }
  return shellJobNodeInfo
}

function generatorTaskConfig(payload, scheDsArr, dataDevHiveScriptProxyUser) {
  let {
    jobName = '',
    showName,
    description,
    businessDepartment,
    businessName,
    dataCollectionInof = []
  } = payload
  const scriptContent = dataCollectionInof.map(p => {
    let { columnInfo, datasource, toDataSource, column = '', filterSql = '', dbInfo = {} } = p
    return {
      toDataSource,
      reader: {
        filterSql,
        dbId: _.get(dbInfo, 'id', ''),
        database: _.get(dbInfo, 'dbName', ''),
        datasource,
        dbType: _.get(dbInfo, 'dbType', ''),
        offsetSpec: {
          column,
          format: '',
          type: 'date'
        },
        password: _.get(dbInfo, 'dbPassword', ''),
        port: _.get(dbInfo, 'dbPort', ''),
        server: _.get(dbInfo, 'dbIp', ''),
        sql: ` select ${columnInfo.map(p => p.sourceCol).join(',')} from ${datasource}`,
        type: 'offset_db',
        user: _.get(dbInfo, 'dbUser', '')
      },
      cleaner: {
        assembler: {
          columns: columnInfo.map(p => p.sourceCol),
          separator: '\u0001',
          type: 'csv'
        },
        converterList: columnInfo.map(p => ({ ..._.omit(p, ['status']), type: 'dummy' }))
      },
      type: 'collect'
    }
  })

  jobName = jobName ? jobName : moment() + 0
  const jobOverride = {
    'dataCollect.script': `scripts/${jobName}.sh`,
    top: '60',
    left: '278',
    showName: '采集测试',
    width: '104',
    'user.to.proxy': dataDevHiveScriptProxyUser,
    type: 'dataCollect',
    height: '26'
  }
  let params = {
    showName,
    description,
    businessDepartment,
    businessName,
    scriptContent
  }
  _.keys(jobOverride).forEach(p => {
    _.set(params, [`jobOverride[${p}]`], jobOverride[p])
  })
  const endJobName = moment() + 10
  const flowId = generate()
  params.data = {
    title: flowId,
    nodes: {
      [`${flowId}_node_${jobName}`]: {
        top: 87,
        left: 354,
        name: '数据采集',
        width: 104,
        type: 'dataCollect',
        height: 26
      },
      [`${flowId}_node_${endJobName}`]: {
        top: 225,
        left: 396,
        name: '结束',
        width: 26,
        type: 'end',
        height: 26
      }
    },
    lines: {
      [`${flowId}_line_${jobName}__${endJobName}`]: {
        type: 'sl',
        from: `${flowId}_node_${jobName}`,
        to: `${flowId}_node_${endJobName}`
      }
    },
    areas: {},
    initNum: 1
  }
  return { params, jobName }
}

export const genLoadHiveTableTaskSpec = (taskName, hiveDbName, sourceTableName, outputDims, visualModelHiveBaseDirPrefixForTindexSpec) => {
  let today = moment().startOf('day').toISOString()
  let mainTimeDim = _.find(outputDims, oc => _.get(oc.params, 'isMainTimeDim'))
  let mainTimeDimOriginalType = _.get(mainTimeDim, 'params.originalType')
  return {
    'type': 'lucene_index',
    'spec': {
      'dataSchema': {
        'dataSource': taskName,
        'metricsSpec': [],
        'parser': {
          'parseSpec': {
            'format': 'tsv',
            // 没有时间列则填 missingValue: '2017-03-12T00:00:00Z'
            'timestampSpec': mainTimeDim
              ? {
                'column': mainTimeDim.name,
                'format': mainTimeDimOriginalType === DruidColumnType.Date || mainTimeDimOriginalType === DruidColumnType.String
                  ? _.includes(_.get(mainTimeDim, 'params.parseDateFormat'), 'S')
                    ? timestampFormatForHive
                    : timestampFormatForHiveWithoutMS
                  : 'millis',
                'timeZone': 'Asia/Shanghai',
                missingValue: '1970-01-01T00:00:00.000Z'
              }
              : { missingValue: today },
            'dimensionsSpec': {
              'dimensionExclusions': [],
              'spatialDimensions': [],
              dimensions: outputDims.map(dim => {
                const type = (DruidNativeType[dim.type] || 'string').toLowerCase()
                if (type === DRUID_DIMENSION_MAP.date) {
                  let { originalType, parseDateFormat, castToDateFormat } = dim.params
                  if (originalType === DruidColumnType.Date || originalType === DruidColumnType.String) {
                    // hive 的 timestamp 类型的格式默认输出时是没有毫秒结尾的
                    return {
                      'name': dim.name,
                      'type':'date',
                      'format': _.includes(_.get(mainTimeDim, 'params.parseDateFormat'), 'S')
                        ? timestampFormatForHive
                        : timestampFormatForHiveWithoutMS,
                      'timeZone': 'Asia/Shanghai'
                    }
                  }
                  return { 'name': dim.name, 'type': 'date', format: 'millis', 'timeZone': 'Asia/Shanghai' }
                }
                return {
                  name: dim.name,
                  type: type
                }
              })
            },
            'delimiter': '\u0001',
            'listDelimiter': '\u0002',
            'columns': outputDims.map(d => d.name)
          }
        },
        'granularitySpec': {
          'intervals': ['1000/3000'],
          'segmentGranularity': 'MONTH',
          'queryGranularity': 'NONE',
          'type': 'uniform'
        }
      },
      'ioConfig': {
        'type': 'lucene_index',
        'firehose': {
          'type': 'hdfs',
          'filter': '*', // 全量用 *，增量用 *.*
          // TODO 支持增量
          'baseDir': !hiveDbName || hiveDbName === 'default'
            ? [visualModelHiveBaseDirPrefixForTindexSpec, sourceTableName].join('/')
            : [visualModelHiveBaseDirPrefixForTindexSpec, `${hiveDbName}.db`, sourceTableName].join('/')
          // "baseDir": "/user/hive/warehouse/user_card_total_result/$dt=20190101"
        }
      },
      'tuningConfig': {
        'type': 'lucene_index',
        'maxRowsPerSegment': 5000000,
        // TODO 支持增量
        'overwrite': true,
        'reportParseExceptions': true
      }
    },
    'context': {
      'debug': true
    }
  }
}
