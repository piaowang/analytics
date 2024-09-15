/**
 * 可视化建模
 * 输出到 hive 表表名规范： dm_xxx_full_20190810
 */
import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import FetchFinal from '../../../common/fetch-final'

import {
  AreaChartOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  FilterOutlined,
  FolderOutlined,
  TableOutlined,
} from '@ant-design/icons';

import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';

import { Button, Col, Input, message, Popover, Radio, Row, Select } from 'antd';
import ModelOutputColumnEditor from '../../OfflineCalc/model-output-column-editor'
import {
  delayPromised,
  groupToArrayDeep,
  immutateUpdate,
  immutateUpdates,
  isDiffByPath,
  isDiffBySomePath,
  tryJsonParse
} from '../../../../common/sugo-utils'
import DraggableTree from '../../OfflineCalc/draggable-tree'
import JoinConfigDiagram from '../../OfflineCalc/join-config-diagram'
import {enableSelectSearch} from '../../../common/antd-freq-use-props'
import {connect} from 'react-redux'
import {validateFieldsByForm} from '../../../common/decorators'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import {sagaSyncModel} from '../../Fetcher/saga-sync'
import {namespace as mainNS} from '../store/model'
import classNames from 'classnames'
import {TASK_ACTION_TYPE, validInputName} from '../constants'
import moment from 'moment'
import TaskScheduleDesign from '../flow/flow-design'
import {recvJSON} from '../../../common/fetch-utils'
import offlineCalcModelToSql, {
  guessDruidStrTypeByDbDataType,
  guessDruidTypeByDbDataType,
  guessSimpleTypeByDbDataType
} from '../../../../common/offline-calc-model-helper'
import {createProjectForModel} from 'client/common/offline-calc-helper'
import DruidColumnType, {DruidNativeType} from 'common/druid-column-type'
import ObjectSelector from '~/components/common/object-selector'
import MultiSelect from '../../Common/multi-select'
import VerticalSplitHelper from '../../Common/vertical-split-helper'
import {indicesSagaModelGenerator} from '../../OfflineCalc/saga-model-generators'
import {
  OfflineCalcDataSourceTypeEnum,
  VisualModelCalcTypeEnum,
  VisualModelCalcTypeTranslation,
  VisualModelOutputTargetTypeEnum, VisualModelOutputTargetTypeTranslation, VisualModelUpdateStrategyEnum
} from '../../../../common/constants'
import HoverHelp from '../../Common/hover-help'
import {hiveDataSourcesSagaModelGenerator, hiveTablesSagaModelGenerator} from './visual-modeling-saga-models'
import CommonDruidFilterPanel from '../../Common/common-druid-filter-panel'
import {genLoadHiveTableTaskSpec} from '../../../../common/model-publish-helper'

const {
  dataDevHiveScriptProxyUser = 'root',
  visualModelHiveBaseDirPrefixForTindexSpec = '/user/hive/warehouse'
} = window.sugo

const {Option} = Select
const {Item: FormItem} = Form
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

export const defaultEditMode = 'flowDesignMode'

const isDevEnv = _.startsWith(_.get(window.sugo, 'env'), 'dev')

function reformatId(id) {
  return `${id || ''}`.replace(/-/g, '_').toLowerCase();
}
const resolveAllDimDepsOfIndex = (idx, idxIdDict) => {
  if (!idx) {
    return []
  }
  let {dimDeps, idxDeps} = idx.formula_info || {}
  return [...dimDeps, ..._.flatMap(idxDeps, idxId => resolveAllDimDepsOfIndex(idxIdDict[idxId], idxIdDict))]
}


const namespace = 'visual-modeling-saga-model'

// 指标模型实际上是存储在流程的额外参数里面
const visualModelingSagaModelGen = props => {
  let taskName = _.get(props, 'taskInfo.name') || ''
  let taskId = _.get(props, 'taskInfo.id') || 'new'
  return sagaSyncModel({
    namespace: `${namespace}-${taskId}`,
    modelName: 'visualModelingModels',
    getEffect: async () => {
      const result = await FetchFinal.post(`/app/new-task-schedule/manager?ajax=fetchProjectProps&project=${taskName}`)
  
      const mStr = _.get(result, 'param.visualModel') || ''
      let m = tryJsonParse(mStr.replace(/\r?\n/g, '\\n'))
      return [m].filter(_.identity)
    },
    postEffect: async (model) => {
      let data = {visualModel: JSON.stringify(model)}
      // const url = `/app/new-task-schedule/manager?ajax=setProjectProps&project=${taskName}&param=${JSON.stringify(data)}`
      const url = '/app/new-task-schedule/manager'
      let formData = new FormData()
      formData.append('action', 'setProjectProps')
      formData.append('project', taskName)
      formData.append('param', JSON.stringify(data))
      return await FetchFinal.post(url, null, {
        body: formData,
        headers: {}
      })
    },
    putEffect: async model => {
      let data = {visualModel: JSON.stringify(model)}
      // const url = `/app/new-task-schedule/manager?ajax=setProjectProps&project=${taskName}&param=${(JSON.stringify(data))}`
      const url = '/app/new-task-schedule/manager'
      let formData = new FormData()
      formData.append('action', 'setProjectProps')
      formData.append('project', taskName)
      formData.append('param', JSON.stringify(data))
      return await FetchFinal.post(url, null, {
        body: formData,
        headers: {}
      })
    },
    deleteEffect: async model => {
      let data = {}
      const url = `/app/new-task-schedule/manager?ajax=setProjectProps&project=${taskName}&param=${(JSON.stringify(data))}`
      return await FetchFinal.post(url)
    }
  });
}

function mapStateToProps(state, ownProps) {
  let taskId = _.get(ownProps, 'taskInfo.id') || 'new'
  let runtimeEditorNs = `${namespace}-${taskId}`
  const dsList = state['hive-data-sources-for-model-editor'] || {}
  const tableList = state['hive-tables-for-model-editor'] || {}
  
  const offlineCalcDataSources = dsList.hiveDataSources || []
  const offlineCalcTables = tableList.hiveTables || []
  
  const mySQLDbs = _.filter(_.get(state.taskSchedule, 'dataDbs'), db => db.dbType === 'mysql')
  const indicesList = state['pick-offline-calc-indices-in-model-info-editor'] || {}

  const isDimInHiveDs = _.overSome(offlineCalcDataSources.map(ds => dimDep => _.startsWith(dimDep, ds.id)))
  const idxIdDict = _.keyBy(indicesList.offlineCalcIndices || [], d => d.id)
  const offlineCalcIndices = (indicesList.offlineCalcIndices || []).filter(idx => {
    let allDimDeps = resolveAllDimDepsOfIndex(idx, idxIdDict)
    return _.every(allDimDeps, isDimInHiveDs)
  })
  return {
    offlineCalcDataSources: offlineCalcDataSources,
    dsIdDict: _.keyBy(offlineCalcDataSources, ds => ds.id),
    offlineCalcTables: offlineCalcTables,
    tableIdDict: _.keyBy(offlineCalcTables, d => d.id),
    offlineCalcModels: _.get(state[runtimeEditorNs], 'visualModelingModels') || [],
    // 指标只能使用基于 hive 数据源创建的公有指标
    offlineCalcIndices: offlineCalcIndices,
    idxIdDict: idxIdDict,
    tagIdDict: _.keyBy([], 'id'),
    mySQLDbs: mySQLDbs,
    tablesInSelectedDb: _.get(state.taskSchedule, 'dataTables') || [],
    runtimeEditorNs
  }
}

@Form.create()
@withRuntimeSagaModel([
  visualModelingSagaModelGen,
  hiveDataSourcesSagaModelGenerator('hive-data-sources-for-model-editor'),
  hiveTablesSagaModelGenerator('hive-tables-for-model-editor'),
  indicesSagaModelGenerator('pick-offline-calc-indices-in-model-info-editor', 'list', {publicOnly: 1})
])
@connect(mapStateToProps)
export default class ModelInfo extends React.Component {
  
  state = {
    visiblePopoverKey: null,
    selectedDiagramKey: null,
    searchKey: ''
  }
  
  componentDidMount() {
    const { taskInfo, innerRef, dispatch, mySQLDbs } = this.props
    this.startHeartbeat(_.get(taskInfo, 'name', ''))
    
    if (_.isFunction(innerRef)) {
      innerRef(this)
    }
  }
  
  startHeartbeat = (taskName) => {
    this.heartbeatId = window.setInterval(() => FetchFinal.get(`/app/new-task-schedule/manager?project=${taskName}&ajax=heartbeat`), 5000)
  }
  
  clearHeartbeat = () => {
    if (this.heartbeatId) {
      window.clearInterval(this.heartbeatId)
    }
  }
  
  componentWillUnmount() {
    this.clearHeartbeat()
    this.props.form.resetFields()
    let {innerRef} = this.props
    if (_.isFunction(innerRef)) {
      innerRef(null)
    }
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'offlineCalcModels[0].params.editMode')) {
      let {onEditModeChange} = this.props
      if (_.isFunction(onEditModeChange)) {
        onEditModeChange()
      }
    }
    // 根据所选目标数据源加载表信息
    if (isDiffBySomePath(this.props, prevProps, 'offlineCalcModels[0].params.outputToDataBase', 'mySQLDbs')) {
      let dbInfo = _.get(this.props, 'offlineCalcModels[0].params.outputToDataBase')
      if (dbInfo) {
        this.props.dispatch({
          type: `${mainNS}/getDataTables`,
          payload: {
            dbId: dbInfo.id
          }
        })
      }
    }
  }
  
  onSubmit = async ev => {
    let {offlineCalcModels, dispatch, form, params, idxIdDict, taskInfo: originalTaskInfo, offlineCalcTables, runtimeEditorNs} = this.props
    ev.preventDefault()
    let formVals = await validateFieldsByForm(form, null, {force: true})
    if (!formVals) {
      this.setState({
        selectedDiagramKey: null
      })
      return message.error('表单验证不通过')
    }

    let {visualModel, ...taskInfo} = formVals
    let calcType = _.get(visualModel, 'params.calcType') || VisualModelCalcTypeEnum.Select
    const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy

    // 判断重名列，并提醒需要重命名
    let outputCols = _.get(visualModel.params, 'outputCols') || []
    let outputColInfos = outputCols.map(oc => {
      let {dimId, renameTo, idxId, omitInGroupByMode} = oc
      if (dimId) {
        if (isCalcTypeEqGroupBy && omitInGroupByMode) {
          return null
        }
        let [tableId, fieldName] = dimId.split('/')
        return {
          col: renameTo || fieldName,
          type: _(offlineCalcTables).chain()
            .find(t => t.id === tableId)
            .get('params.fieldInfos')
            .find(fi => fi.field === fieldName)
            .get('type')
            .value()
        }
      }
      if (idxId) {
        let idx = idxIdDict[idxId]
        if (!idx) {
          throw new Error(`Missing index: ${idxId}`)
        }
        const { formula_info: { isCalcDim } } = idx
        // 聚合型指标，输出大宽表时不输出，同步到指标管理，在多维分析实时计算 TODO mysql 同步项目？
        if (!isCalcDim && !isCalcTypeEqGroupBy) {
          return null
        }

        return {
          col: renameTo || idx.name,
          type: 'NUMBER'
        }
      }
      throw new Error('Unexpected output column type: ' + JSON.stringify(oc))
    }).filter(_.identity)

    if (outputColInfos.length > _.uniqBy(outputColInfos, 'col').length) {
      message.warn('存在同名的输出列，请先进行重命名')
      return
    }
    try {
      let outputTargetType = _.get(visualModel, 'params.outputTargetType') || 'Tindex'
      if (outputTargetType === 'MySQL') {
        await this.detectAllOutputColumnExistInTargetTable(outputColInfos)
      }
    } catch (e) {
      message.warn(e.message)
      return
    }
    // 冗余记录依赖的维表和指标，方便判断依赖
    visualModel = immutateUpdates(visualModel,
      'params.tableDeps', () => _.map(_.get(visualModel, 'params.diagramInfo.tables') || [], t => t.id),
      'params.idxDeps', () => outputCols.filter(oc => oc.idxId).map(oc => oc.idxId))
    const currIdInUrl = _.get(offlineCalcModels, '[0].id') || 'new'
    const isCreating = currIdInUrl === 'new'
    let nextModels = isCreating
      ? [visualModel]
      : offlineCalcModels.map(d => d.id === currIdInUrl ? {...d, ...visualModel} : d)
    await new Promise(resolve => {
      dispatch({
        type: `${runtimeEditorNs}/sync`,
        payload: nextModels,
        callback: syncRes => {
          let {resCreate, resUpdate} = syncRes || {}
          if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
            message.warn('没有修改数据，无须保存')
            resolve()
            return
          }
          if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
            // 保存报错
            resolve()
            return
          }
          const isCreated = _.isEmpty(resUpdate)
          message.success((
            <span>{isCreated ? '创建' : '修改'}数据模型成功</span>
          ))
          resolve()
        }
      })
    })
    await this.saveTaskFlow({...originalTaskInfo, ...taskInfo}, outputColInfos)
  }
  
  genSqlExpression = (rawTableNameDict) => {
    const { tableIdDict, idxIdDict } = this.props
    const { getFieldValue } = this.props.form
    const tempModel = {
      params: {
        outputCols: getFieldValue('visualModel.params.outputCols'),
        diagramInfo: getFieldValue('visualModel.params.diagramInfo'),
        calcType: getFieldValue('visualModel.params.calcType') || VisualModelCalcTypeEnum.Select,
        filters: getFieldValue('visualModel.params.filters') || []
      }
    }
    return offlineCalcModelToSql(tempModel, {
      tableIdDict,
      idxIdDict,
      rawTableNameDict
    })
  }
  
  createHiveNode = async (jobName, outputDims) => {
    let taskName = _.get(this.props, 'taskInfo.name') || ''
    const { getFieldValue } = this.props.form
    let writeTableName = `${getFieldValue('visualModel.name')}_full_${moment().format('YYYYMMDD')}`
    let writeToDbName = getFieldValue('visualModel.params.hiveDbName')
    let writeTargetTable = [writeToDbName, writeTableName].join('.')
    
    let hivePrefixSettings = getFieldValue('visualModel.params.hivePrefixSettings')
    let modelSql = this.genSqlExpression()
    if (_.isEmpty(outputDims)) {
      message.warn('警告：没有输出列')
    }
    const colAndTypes = (outputDims || [])
      .map(od => {
        let dataType = od.type === DruidColumnType.Date
          ? 'timestamp'
          : _.toLower(DruidNativeType[od.type] || 'string')
        return `${od.name} ${dataType}`
      }).join(',\n')
  
    // drop table ${writeTargetTable};
    // create table ${writeTargetTable} as ${modelSql};
    let hiveScriptContent = `
${hivePrefixSettings || ''}

drop table if EXISTS ${writeTargetTable};
create table ${writeTargetTable}(
${colAndTypes}
);

alter table ${writeTargetTable} SET SERDEPROPERTIES('serialization.null.format' = '');

insert OVERWRITE  TABLE ${writeTargetTable} ${modelSql};
`
    let hiveJobNodeInfo = {
      'jobName': `${jobName}`,
      'scriptContent': hiveScriptContent,
      'jobOverride[showName]': 'Hive脚本',
      'jobOverride[hive.script]': `${jobName}.sql`,
      'jobOverride[name]': 'Hive脚本',
      // TODO 采集任务的配置也需要修改
      'jobOverride[user.to.proxy]': dataDevHiveScriptProxyUser,
      'jobOverride[type]': 'hive',
      'paramJson': {}
    }
    const createHiveNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${taskName}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(hiveJobNodeInfo)
    })
    if (!createHiveNodeRes) {
      throw new Error('创建 Hive 节点失败')
    }
    return hiveJobNodeInfo
  }
  
  createExportToTindexNode = async (jobName, targetProject, outputDims) => {
    const { getFieldValue } = this.props.form
    let taskName = _.get(this.props, 'taskInfo.name') || ''
    
    let edwTableName = `${getFieldValue('visualModel.name')}_full_${moment().format('YYYYMMDD')}`
    let writeToDbName = getFieldValue('visualModel.params.hiveDbName')
  
    // TODO genLoadHiveTableTaskSpec 改为运行时去拿
    let queryActiveOverlordRes = await FetchFinal.get('/app/tindex/leaderHost')
    const shellNodeJobName = jobName + 10
    let loadHiveTableTaskSpec = genLoadHiveTableTaskSpec(targetProject.datasource_name, writeToDbName, edwTableName, outputDims, visualModelHiveBaseDirPrefixForTindexSpec)
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
    const createShellNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${taskName}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(shellJobNodeInfo)
    })
    if (!createShellNodeRes) {
      throw new Error('创建 Shell 节点失败')
    }
    return shellJobNodeInfo
  }
  
  createExportToMySQLNode = async (jobName, outputColInfos) => {
    const { getFieldValue } = this.props.form
    let taskName = _.get(this.props, 'taskInfo.name') || ''
    
    let preWriteDbInfo = getFieldValue('visualModel.params.outputToDataBase')
    let preWriteTableName = getFieldValue('visualModel.params.outputToTable')
    let hiveHostInfo = await FetchFinal.get('/app/hive/host')
    if (!hiveHostInfo) {
      throw new Error('无效的 hive 服务配置')
    }
    let {host: hiveHost, port: hivePort} = hiveHostInfo.result
    const shellNodeJobName = jobName
    // dbAlais: "224PG"
    // dbIp: "192.168.0.224"
    // dbName: "azkaban"
    // dbPassword: "123456"
    // dbPort: 15432
    // dbType: "postgresql"
    // dbUser: "postgres"
    // id: 129
    // refProjectId: "qaz-plm-wsx"
    // schema: "public"
    let {dbIp, dbName, dbPassword, dbPort, dbType, dbUser} = preWriteDbInfo
    let modelSql = this.genSqlExpression()
    let outputColNames = (outputColInfos || []).map(c => c.col).join(',')
  
    let createTaskShell = `
java -Dhive.host=${hiveHost} -Dhive.port=${hivePort} -Dhive.database=default -Dhive.user=hive "-Dhive.sql=${modelSql}" -Dtaget.db.type=MySQL -Dtaget.db.host=${dbIp} -Dtaget.db.port=${dbPort} -Dtaget.db.database=${dbName} -Dtaget.db.user=${dbUser} -Dtaget.db.password=${dbPassword} -Dtaget.db.table=${preWriteTableName} -Dtaget.db.columns=${outputColNames} -cp '/opt/apps/sugo-etl-1.0/lib/*'  io.sugo.service.HiveExporter
`
    let shellJobNodeInfo = {
      'jobName': shellNodeJobName,
      'scriptContent': createTaskShell,
      'jobOverride[name]':'Shell脚本',
      'jobOverride[type]':'command',
      'jobOverride[showName]':'Shell脚本',
      'paramJson':{}
    }
    const createShellNodeRes = await FetchFinal.post(`/app/new-task-schedule/manager?project=${taskName}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify(shellJobNodeInfo)
    })
    if (!createShellNodeRes) {
      throw new Error('创建 Shell 节点失败')
    }
  
    return shellJobNodeInfo
  }
  
  getDruidDimTypeByTableField = (tableId, fieldName) => {
    let { tableIdDict } = this.props
    let fieldInfo = _.find(_.get(tableIdDict && tableIdDict[tableId], 'params.fieldInfos'), fi => fi.field === fieldName)
    return fieldInfo ? guessDruidTypeByDbDataType(fieldInfo.type) : DruidColumnType.String
  }
  
  saveTaskFlow = async (taskInfo, outputColInfos) => {
    let {dispatch, idxIdDict, tableIdDict, projectList} = this.props
    const { getFieldValue } = this.props.form
    
    let edwTableName = getFieldValue('visualModel.name') // 项目名称无需加上 _full_date 后缀
    let taskName = _.get(this.props, 'taskInfo.name') || ''
    
    let hiveNodeJobName = Date.now()
    let outputTargetType = getFieldValue('visualModel.params.outputTargetType') || 'None'
    let calcType = getFieldValue('visualModel.params.calcType') || VisualModelCalcTypeEnum.Select
    
    let nodes = []
  
    const endingNode = {jobName: hiveNodeJobName + 100, 'jobOverride[name]': '结束', 'jobOverride[type]': 'end'}
    if (outputTargetType === 'Tindex') {
      let outputCols = getFieldValue('visualModel.params.outputCols')
      let diagramInfo = getFieldValue('visualModel.params.diagramInfo')
      let depTables = _(_.get(diagramInfo, 'tables') || [])
        .map(t => _.get(tableIdDict, t.id))
        .compact()
        .value()
      let { targetProject, outputDims } = await createProjectForModel(this.getDruidDimTypeByTableField, {
        depTables, outputCols, idxIdDict, projectList, targetProjectName: `模型_${edwTableName}`, calcType
      })
      
      let hiveNode = await this.createHiveNode(hiveNodeJobName, outputDims)
      let exportNope = await this.createExportToTindexNode(hiveNodeJobName + 10, targetProject, outputDims)
      nodes = [hiveNode, exportNope, endingNode]
    } else if (outputTargetType === 'MySQL') {
      let exportNope = await this.createExportToMySQLNode(hiveNodeJobName + 10, outputColInfos)
      nodes = [exportNope, endingNode]
    } else if (outputTargetType === 'None') {
      // outputDims ?
      let hiveNode = await this.createHiveNode(hiveNodeJobName)
      nodes = [hiveNode, endingNode]
    } else {
      nodes = [endingNode]
    }
  
    let flowId = taskName
    const taskConfig = {
      ...taskInfo,
      actionType: TASK_ACTION_TYPE.dataModeling,
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
        'lines': _.zipObject(_.take(nodes, nodes.length - 1).map((n, i) => `${flowId}_line_${n.jobName}__${nodes[i+1].jobName}`),
          _.take(nodes, nodes.length - 1).map((n, i) => ({
            'type': 'sl',
            'from': `${flowId}_node_${n.jobName}`,
            'to': `${flowId}_node_${nodes[i+1].jobName}`
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
      throw new Error(`创建数据模型 ${taskInfo.showName} 所依赖的计算任务失败`)
    }
    
    console.log(saveTaskRes)
  }
  
  renderIndicesPicker = () => {
    let { dsIdDict, tagIdDict, offlineCalcIndices } = this.props
    const clonedByTags = _.flatMap(offlineCalcIndices, idx => {
      return _.size(idx.tags) < 2 ? idx : idx.tags.map(tId => ({...idx, tags: [tId]}))
    })
    let databaseIcon = <DatabaseOutlined />
    let folderIcon = <FolderOutlined />
    let indicesIcon = <AreaChartOutlined />
    let treeInfo = groupToArrayDeep(clonedByTags,
      [idx => idx.data_source_id || '', idx => idx.tags[0] || ''],
      [
        (arr, dsId) => {
          return dsId
            ? { key: dsId, title: _.get(dsIdDict[dsId], 'name', dsId), children: arr, selectable: false, icon: databaseIcon }
            : {key: 'null', title: '跨数据源', children: arr, selectable: false, icon: databaseIcon}
        },
        (arr, tagId) => tagId
          ? {key: tagId, title: _.get(tagIdDict[tagId], 'name', tagId), children: arr, selectable: false, icon: folderIcon}
          : arr,
        idx => ({
          key: `index:${idx.id}`,
          title: idx.title || idx.name,
          hoverTitle: `公式：${_.get(idx.formula_info, 'uiText')}\n版本：${_.get(idx, 'SugoVersionHistory.version')}`,
          selectable: true,
          icon: indicesIcon
        })
      ])
    return (
      <React.Fragment>
        <div className="pd2l pd1y elli line-height30 shadowb-eee mg1b" >
          <HoverHelp addonBefore="指标库 " content="仅显示使用 Hive 数据源创建的公有指标" />
        </div>
        <div style={{height: 'calc(100% - 45px)'}} >
          <DraggableTree
            treeInfo={treeInfo}
            className="height-100 overscroll-y"
            showIcon
          />
        </div>
      </React.Fragment>
    )
  }
  
  renderTablesPicker = () => {
    let { dsIdDict, tagIdDict, offlineCalcTables } = this.props
    const clonedByTags = _.flatMap(offlineCalcTables, idx => {
      return _.size(idx.tags) < 2 ? idx : idx.tags.map(tId => ({...idx, tags: [tId]}))
    })
    let databaseIcon = <DatabaseOutlined />
    let folderIcon = <FolderOutlined />
    let tableIcon = <TableOutlined />
    let treeInfo = groupToArrayDeep(clonedByTags,
      [t => t.tags[0] || '', t => t.data_source_id || ''],
      [
        (arr, tagId) => tagId
          ? {
            key: tagId,
            title: _.get(tagIdDict[tagId], 'name', tagId),
            children: arr,
            selectable: false,
            icon: folderIcon
          }
          : arr,
        (arr, dsId) => ({
          key: dsId,
          title: _.get(dsIdDict[dsId], 'name', dsId),
          children: arr,
          selectable: false,
          icon: databaseIcon
        }),
        table => ({
          key: `table:${table.id}`,
          title: table.title || table.name,
          selectable: true,
          icon: tableIcon
        })
      ])
    return (
      <React.Fragment>
        <div className="pd2l pd1y elli line-height30 shadowb-eee mg1b" >维表</div>
        <div style={{height: 'calc(100% - 45px)'}} >
          <DraggableTree
            treeInfo={treeInfo}
            className="height-100 overscroll-y"
            showIcon
          />
        </div>
      </React.Fragment>
    )
  }
  
  detectColCanNotDel = (prevOutputCols, nextOutputCols) => {
    let {tableIdDict, idxIdDict} = this.props
    let [deletedCol] = _.differenceBy(prevOutputCols, nextOutputCols, oc => oc.dimId || oc.idxId)
    const preDeselectedField = deletedCol && deletedCol.dimId
    if (preDeselectedField) {
      let [tableId, fieldName] = preDeselectedField.split('/')
      let table = tableIdDict[tableId]
      let dimIdCanNotDel = table && `${table.data_source_id}|${table.name}|${fieldName}`
      let currUsingIndices = _.filter(prevOutputCols, oc => oc.idxId).map(oc => idxIdDict[oc.idxId])
      let idxCanNotDel = dimIdCanNotDel && _.find(currUsingIndices, idx => {
        return _.includes(resolveAllDimDepsOfIndex(idx), dimIdCanNotDel)
      })
      if (idxCanNotDel) {
        let idx = idxCanNotDel
        let errMsg = `此字段被指标 ${idx.title ? `${idx.name}（${idx.title}）` : idx.name} 所依赖，不能删除`
        const e = new Error(errMsg)
        e.dimIdCanNotDel = preDeselectedField
        throw e
      }
    }
  }
  
  renderFiltersConfigureBtn = () => {
    let {visiblePopoverKey} = this.state
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, tableIdDict, dsIdDict } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    getFieldDecorator('visualModel.params.filters', {
      // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
      initialValue: _.get(currModel, 'params.filters') || [],
      rules: [ ]
    })
    let currFilters = getFieldValue('visualModel.params.filters')
  
    let diagramInfo = getFieldValue('visualModel.params.diagramInfo')
    let depTables = _(_.get(diagramInfo, 'tables') || [])
      .map(t => _.get(tableIdDict, t.id))
      .compact()
      .value()
    const currOutputDims = _(depTables)
      .flatMap(table => {
        return (_.get(table, 'params.fieldInfos') || []).map(fi => {
          let ds = dsIdDict[table.data_source_id]
          if (!ds) {
            return null
          }
          return {
            // dimId: dsId|tableName|fieldName
            name: [table.data_source_id, table.name, fi.field].join('|'),
            // db.table.field
            title: [ds.name, table.name, fi.field].join('.'),
            type: this.getDruidDimTypeByTableField(table.id, fi.field),
            params: {}
          }
        })
      })
      .compact()
      .value()
  
    return (
      <Popover
        title={
          <React.Fragment>
            <span key="title" className="font16 mg2r">设置数据筛选条件</span>
            <CloseCircleOutlined
              key="close"
              className="fright fpointer font18 color-red"
              onClick={() => {
                this.setState({
                  visiblePopoverKey: ''
                })
              }} />
          </React.Fragment>
        }
        placement="bottomRight"
        arrowPointAtCenter
        // getPopupContainer={() => document.querySelector('.nav-bar')}
        trigger="click"
        visible={visiblePopoverKey === 'settingDataFilters'}
        onVisibleChange={_.noop}
        content={(
          <CommonDruidFilterPanel
            key="dataFilters"
            className="mw460 global-filters-setting-panel"
            uniqFilter
            dimNameDict={_.keyBy(currOutputDims, 'name')}
            dataSourceDimensions={currOutputDims}
            // getPopupContainer={() => document.querySelector('.global-filters-setting-panel')}
            mainTimeDimFilterDeletable
            timePickerProps={{}}
            headerDomMapper={_.noop}
            filters={currFilters || []}
            dimensionOptionFilter={dbDim => !_.get(dbDim, 'params.type')}
            onFiltersChange={nextFilters => {
              setFieldsValue({
                'visualModel.params.filters': nextFilters
              })
            }}
          />
        )}
      >
        <Button
          title="数据筛选条件"
          icon={<FilterOutlined />}
          className={classNames('inline mg1r', {
            'color-blue bold': !_.isEmpty(currFilters),
            'color-gray': _.isEmpty(currFilters)
          })}
          onClick={() => {
            this.setState({
              visiblePopoverKey: 'settingDataFilters'
            })
          }}
        >设置数据筛选条件{0 < _.size(currFilters) ? `（${_.size(currFilters)}）` : ''}</Button>
      </Popover>
    );
  }
  
  renderColumnPreviewTable = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, offlineCalcTables, offlineCalcIndices, idxIdDict, tableIdDict, disabled } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    let calcType = getFieldValue('visualModel.params.calcType') || VisualModelCalcTypeEnum.Select
    const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy
  
    return (
      <React.Fragment>
        <div className="pd2l pd1y elli line-height30" >数据模型表</div>
        <div
          style={{height: 'calc(100% - 45px)'}}
          className="overscroll-y pd1x hide-scrollbar-y"
        >
          {getFieldDecorator('visualModel.params.outputCols', {
            // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
            initialValue: _.get(currModel, 'params.outputCols') || [],
            rules: [ ]
          })(
            <ModelOutputColumnEditor
              disabled={disabled}
              offlineCalcIndices={offlineCalcIndices}
              tableIdDict={tableIdDict}
              idxIdDict={idxIdDict}
              calcType={calcType}
              showValue="all"
              offlineCalcTables={offlineCalcTables}
              onChange={async nextOutputCols => {
                const prevOutputCols = getFieldValue('visualModel.params.outputCols')
                try {
                  this.detectColCanNotDel(prevOutputCols, nextOutputCols)
                } catch (e) {
                  await delayPromised(100)
                  if (isCalcTypeEqGroupBy) {
                    // 因为指标依赖的维度无法移除，所以在 groupBy 模式时，简单地隐藏用户需要排除的维度
                    let {dimIdCanNotDel} = e
                    setFieldsValue({
                      'visualModel.params.outputCols': prevOutputCols.map(oc => oc.dimId === dimIdCanNotDel ? {...oc, omitInGroupByMode: true} : oc)
                    })
                  } else {
                    setFieldsValue({
                      'visualModel.params.outputCols': prevOutputCols
                    })
                    message.warn(e.message)
                    return
                  }
                }
                let [deletedCol] = _.differenceBy(prevOutputCols, nextOutputCols, oc => oc.dimId || oc.idxId)
                const preDeselectedField = deletedCol && deletedCol.dimId
                if (preDeselectedField) {
                  let [tableId, fieldName] = preDeselectedField.split('/')
                  // 移除关系图里选择了的字段
                  let prevDiagramInfo = getFieldValue('visualModel.params.diagramInfo')
                  let nextDiagramInfo = immutateUpdate(prevDiagramInfo, 'tables', tables => {
                    return tables.map(t => {
                      return t.id !== tableId
                        ? t
                        : { ...t, fields: t.fields.map(f => f.field === fieldName ? _.omit(f, 'selected') : f)}
                    })
                  })
                  setFieldsValue({
                    'visualModel.params.diagramInfo': nextDiagramInfo
                  })
                }
              }}
            />
          )}
        </div>
      </React.Fragment>
    )
  }
  
  renderJoinConfigDiagram = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, tableIdDict, idxIdDict, disabled } = this.props
    let {selectedDiagramKey} = this.state
    let calcType = getFieldValue('visualModel.params.calcType') || VisualModelCalcTypeEnum.Select
    const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy
  
    let currModel = _.get(offlineCalcModels, [0])
    
    const initialDiagramVal = _.get(currModel, 'params.diagramInfo')
    let prevOutputCols = getFieldValue('visualModel.params.outputCols')
    const prevSelectedFields = _.filter(prevOutputCols, oc => oc.dimId && (isCalcTypeEqGroupBy ? !oc.omitInGroupByMode : true))
      .map(oc => oc.dimId)
    return (
      getFieldDecorator('visualModel.params.diagramInfo', {
        initialValue: initialDiagramVal,
        rules: [ ]
      })(
        <JoinConfigDiagram
          disabled={disabled}
          tableIdDict={tableIdDict}
          selectedFields={prevSelectedFields}
          onSelectedFieldsChange={nextSelectedFields => {
            // 选择字段时更新 outputCols
            // tableId/fieldName
            let adds = _.difference(nextSelectedFields, prevSelectedFields)
            let removes = !_.isEmpty(adds) ? null : _.difference(prevSelectedFields, nextSelectedFields)
            
            // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
            const nextOutputCols = !_.isEmpty(adds)
              ? [...prevOutputCols.filter(oc => oc.idxId ? true : !_.includes(adds, oc.dimId)), ...adds.map(dimId => ({dimId}))]
              : _.filter(prevOutputCols, oc => oc.idxId ? true : !_.includes(removes, oc.dimId))
  
            // 判断字段是否被指标依赖
            try {
              this.detectColCanNotDel(prevOutputCols, nextOutputCols)
              setFieldsValue({
                'visualModel.params.outputCols': nextOutputCols
              })
            } catch (e) {
              if (isCalcTypeEqGroupBy) {
                // 因为指标依赖的维度无法移除，所以在 groupBy 模式时，简单地隐藏用户需要排除的维度
                let {dimIdCanNotDel} = e
                setFieldsValue({
                  'visualModel.params.outputCols': prevOutputCols.map(oc => oc.dimId === dimIdCanNotDel ? {...oc, omitInGroupByMode: true} : oc)
                })
              } else {
                message.warn(e.message)
              }
            }
          }}
          onChange={(next, prev) => {
            const prevTableIds = _.map(_.get(prev, 'tables'), t => t.id)
            const currTableIds = _.map(_.get(next, 'tables'), t => t.id)
            let [preDelTable] = _.difference(prevTableIds, currTableIds)
            if (!preDelTable) {
              return
            }
            this.setState({
              selectedDiagramKey: null
            })
            // 删除表时判断指标依赖
            let table = tableIdDict[preDelTable]
            let tableIdForDimDeps = table && `${table.data_source_id}|${table.name}`
            let currUsingIndices = _.filter(prevOutputCols, oc => oc.idxId).map(oc => idxIdDict[oc.idxId])
            let idxCanNotDel = tableIdForDimDeps && _.find(currUsingIndices, idx => {
              let dimDeps = resolveAllDimDepsOfIndex(idx)
              return _.some(dimDeps, dimDep => _.startsWith(dimDep, tableIdForDimDeps))
            })
            if (idxCanNotDel) {
              let idx = idxCanNotDel
              message.warn(`此表被指标 ${idx.title ? `${idx.name}（${idx.title}）` : idx.name} 所依赖，不能删除`)
              setTimeout(() => {
                setFieldsValue({
                  'visualModel.params.diagramInfo': prev
                })
              }, 100)
            }
          }}
          selectedKey={selectedDiagramKey}
          onSelect={modelKey => {
            this.setState({
              selectedDiagramKey: modelKey
            })
          }}
        />
      )
    )
  }
  
  renderPropsConfigurator = () => {
    let { tableIdDict, disabled } = this.props
    const { getFieldValue, setFieldsValue } = this.props.form
    
    let {selectedDiagramKey, searchKey} = this.state
    let overwriteDom = null // 避免 form 组件被卸载，如果需要展示其他配置页面，则把模型配置通过样式隐藏
    if (selectedDiagramKey in tableIdDict) {
      const table = tableIdDict[selectedDiagramKey]
      let diagramInfo = getFieldValue('visualModel.params.diagramInfo')
      let selectedFields = _(diagramInfo)
        .chain()
        .get('tables')
        .find(t => t.id === selectedDiagramKey)
        .get('fields')
        .map(f => f.field)
        .value()
      let allFields = _.get(table.params, 'fieldInfos') || []
      let fieldNameDict = _.keyBy(allFields, 'field')
      const selectOptions = allFields.map(fieldInfo => {
        const { field, type } = fieldInfo || {}
        if (searchKey && field.indexOf(searchKey) < 0) {
          return null
        }
        return field
      }).filter(_.identity)

      overwriteDom = (
        <React.Fragment>
          <div className="pd2l pd1y elli line-height30 shadowb-eee mg1b" >{`${table.title || table.name} 属性配置`}</div>
          <div style={{height: 'calc(100% - 45px)', overflowX: 'hidden'}} className="overscroll-y">
            <Form
              className="pd2"
              layout="vertical"
            >
              <Form.Item label="使用维度" >
                <MultiSelect
                  disabled={disabled}
                  placeholder="未添加维度"
                  // getPopupContainer={() => document.querySelector(`.scroll-content`)}
                  options={_.uniq(selectOptions)}
                  className="width-100"
                  // isLoading={isFetching}
                  value={selectedFields}
                  onChange={vals => {
                    // 移除已连接的字段时自动移除连接，和输出字段
                    let preDelField = _.difference(selectedFields, vals)[0]
                    let preDelFieldId = preDelField && `${table.id}/${preDelField}`
                    let prevOutputCols = getFieldValue('visualModel.params.outputCols')

                    let nextDiagramInfo = immutateUpdates(diagramInfo,
                      'joinLinks', joinLinks => {
                        return !preDelFieldId
                          ? joinLinks
                          : (joinLinks || []).filter(jl => !(jl.source === preDelFieldId || jl.target === preDelFieldId))
                      },
                      'tables', tables => {
                        return tables.map(t => {
                          return t.id !== selectedDiagramKey
                            ? t
                            : { ...t, fields: vals.map(fieldName => fieldNameDict[fieldName]) }
                        })
                      })
                    let nextOutputCols = _.filter(prevOutputCols, oc => oc.dimId ? oc.dimId !== preDelFieldId : true)
                    try {
                      this.detectColCanNotDel(prevOutputCols, nextOutputCols)
                      setFieldsValue({
                        'visualModel.params.diagramInfo': nextDiagramInfo,
                        'visualModel.params.outputCols': nextOutputCols
                      })
                    } catch (e) {
                      message.warn(e.message)
                    }
                  }}
                  onSearch={keyword => {
                    this.setState({ searchKey: keyword })
                  }}
                />

                <a
                  className="pointer"
                  onClick={() => {
                    let nextDiagramInfo = immutateUpdate(diagramInfo, 'tables', tables => {
                      return tables.map(t => {
                        return t.id !== selectedDiagramKey
                          ? t
                          : { ...t, fields: allFields }
                      })
                    })
                    // 选择字段时更新 outputCols
                    // dimId: tableId/fieldName
                    let prevOutputCols = getFieldValue('visualModel.params.outputCols')

                    let allDimIdsInTable = allFields.map(f => `${selectedDiagramKey}/${f.field}`)
                    let willAddDimIds = _.difference(allDimIdsInTable, prevOutputCols.map(oc => oc.dimId).filter(_.identity))

                    // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
                    const nextOutputCols = [...prevOutputCols, ...willAddDimIds.map(dimId => ({dimId}))]

                    setFieldsValue({
                      'visualModel.params.diagramInfo': nextDiagramInfo,
                      'visualModel.params.outputCols': nextOutputCols
                    })
                  }}
                >全部选中</a>
              </Form.Item>
            </Form>
          </div>
        </React.Fragment>
      )
    }
    
    return this.renderModelPropsConfigurator(overwriteDom)
  }
  
  renderModelPropsConfigurator = (overwriteDom) => {
    let { tableIdDict, offlineCalcModels, offlineCalcDataSources, disabled, taskInfo } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    return (
      <React.Fragment>
        {overwriteDom}
        <div className={classNames('pd2l pd1y elli line-height30 shadowb-eee mg1b', {hide: overwriteDom})} >属性配置</div>
        <div
          style={{height: 'calc(100% - 45px)', overflowX: 'hidden'}}
          className={classNames('overscroll-y', {hide: overwriteDom})}
        >
          <Form
            className="pd2"
            layout="vertical"
          >
            <FormItem label="任务名称" className="mg1b" hasFeedback>
              {getFieldDecorator('showName', {
                rules: [{ required: true, message: '任务名称必填!' }, ...validInputName],
                initialValue: _.get(taskInfo, 'showName', '')
              })(
                <Input />
              )}
            </FormItem>
  
            <FormItem label="任务描述" className="mg1b" hasFeedback>
              {getFieldDecorator('description', {
                initialValue: _.get(taskInfo, 'description', '')
              })(
                <Input />
              )}
            </FormItem>
  
            <Form.Item label="模型表名">
              {getFieldDecorator('visualModel.name', {
                initialValue: _.get(currModel, 'name') || 'dm_',
                rules: [
                  { required: true, message: '未输入模型表名', whitespace: true },
                  { max: 32, message: '名称太长' },
                  { min: 4, message: '名称太短' },
                  { pattern: /^dm_[a-z0-9_]*$/, message: '只能输入小写字母、下划线和数字，必须以“dm_”开头' }
                ]
              })(<Input disabled={disabled}/>)}
            </Form.Item>
  
            <Form.Item label="模型表存储库">
              {getFieldDecorator('visualModel.params.hiveDbName', {
                initialValue: _.get(currModel, 'params.hiveDbName') || 'default',
                rules: []
              })(
                <Select
                  {...enableSelectSearch}
                >
                  {(offlineCalcDataSources || []).filter(ds => ds.type === OfflineCalcDataSourceTypeEnum.Hive).map(ds => {
                    return (
                      <Option key={ds.name}>{ds.name}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            <Form.Item label="输出类型" >
              {getFieldDecorator('visualModel.params.calcType', {
                initialValue: _.get(currModel, 'params.calcType') || VisualModelCalcTypeEnum.Select,
                rules: [
                  // 没有选指标时不能选择统计汇总
                  {
                    validator(type, value, callback) {
                      if (getFieldValue('visualModel.params.calcType') === VisualModelCalcTypeEnum.Select) {
                        callback([])
                        return
                      }
                      let outputCols = getFieldValue('visualModel.params.outputCols')
                      if (!_.some(outputCols, oc => oc.idxId)) {
                        callback([new Error('没有选指标时不能选择统计汇总')])
                        return
                      }
                      callback([])
                    }
                  }
                ]
              })(
                <Select
                  onChange={nextCalcType => {
                    // 为了给用户重新决定是否排除某些列的机会，重置 omitInGroupByMode
                    if (nextCalcType === VisualModelCalcTypeEnum.Select) {
                      let outputCols = getFieldValue('visualModel.params.outputCols')
                      setFieldsValue({
                        'visualModel.params.outputCols': _.map(outputCols, oc => _.omit(oc, 'omitInGroupByMode'))
                      })
                    }
                  }}
                >
                  {_.keys(VisualModelCalcTypeEnum).map(k => {
                    return (
                      <Option key={k} value={k}>{VisualModelCalcTypeTranslation[k]}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            <Form.Item label="更新方式">
              {getFieldDecorator('visualModel.params.updateStrategy', {
                initialValue: _.get(currModel, 'params.updateStrategy') || 'Full',
                rules: [ ]
              })(
                <Select>
                  {_.keys(VisualModelUpdateStrategyEnum).map(k => {
                    return (
                      <Option key={k} >{VisualModelUpdateStrategyEnum[k]}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            <Form.Item label="最终导出到">
              {getFieldDecorator('visualModel.params.outputTargetType', {
                initialValue: _.get(currModel, 'params.outputTargetType') || 'Tindex',
                rules: [ ]
              })(
                <Select>
                  {_.keys(VisualModelOutputTargetTypeEnum).map(k => {
                    return (
                      <Option key={k} value={k}>{VisualModelOutputTargetTypeTranslation[k]}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
            
            <Form.Item label="主时间列">
              <Select
                {...enableSelectSearch}
                notFoundContent="没有输出时间维度"
                placeholder="未选择"
                value={_(getFieldValue('visualModel.params.outputCols') || [])
                  .chain()
                  .find(oc => oc.isMainTimeDim)
                  .get('dimId')
                  .value()}
                onChange={val => {
                  let prevOutputCols = getFieldValue('visualModel.params.outputCols') || []
                  setFieldsValue({
                    'visualModel.params.outputCols': _.map(prevOutputCols, oc => {
                      return oc.dimId
                        ? oc.dimId === val
                          ? {...oc, isMainTimeDim: true}
                          : _.omit(oc, 'isMainTimeDim')
                        : oc
                    })
                  })
                }}
              >
                {(getFieldValue('visualModel.params.outputCols') || []).map(oc => {
                  let {dimId, renameTo} = oc
                  if (!dimId) {
                    return null
                  }
                  const [ tableId, fieldName ] = oc.dimId.split('/')
                  let type = oc.castTo
                  if (!type) {
                    let field = _.find(_.get(tableIdDict[tableId], 'params.fieldInfos') || [], f => f.field === fieldName)
                    type = _.capitalize(guessDruidStrTypeByDbDataType(field && field.type))
                  }
                  if (type !== 'Date') {
                    return null
                  }
                  
                  return (
                    <Option key={dimId} >{renameTo || fieldName}</Option>
                  )
                }).filter(_.identity)}
              </Select>
            </Form.Item>
            
            <Form.Item label="数据筛选条件">
              {this.renderFiltersConfigureBtn()}
            </Form.Item>
            
            {getFieldValue('visualModel.params.outputTargetType') === VisualModelOutputTargetTypeEnum.MySQL
              ? this.renderMySQLTablePicker()
              : this.renderExtraArgsConfigPanel()}
          </Form>
        </div>
      </React.Fragment>
    );
  }
  
  renderExtraArgsConfigPanel = () => {
    let { offlineCalcModels } = this.props
    const { getFieldDecorator } = this.props.form
    let currModel = _.get(offlineCalcModels, [0])
    getFieldDecorator('visualModel.params.outputToDataBase', {
      initialValue: _.get(currModel, 'params.outputToDataBase'),
      rules: [  ]
    })
    getFieldDecorator('visualModel.params.outputToTable', {
      initialValue: _.get(currModel, 'params.outputToTable'),
      rules: [  ]
    })
  
    let defaultPrefix = `
-- for debug: 使用本地跑作业，不用去申请spark资源（需要1分钟左右）
${isDevEnv ? '' : '-- '}set mapreduce.framework.name = local;
${isDevEnv ? '' : '-- '}set hive.execution.engine=mr;
set hive.exec.compress.output=false;
`
    return (
      <Form.Item label="Hive 额外前置配置">
        {getFieldDecorator('visualModel.params.hivePrefixSettings', {
          initialValue: _.get(currModel, 'params.hivePrefixSettings') || defaultPrefix,
          rules: []
        })(<Input.TextArea placeholder="set xxx;" autosize />)}
      </Form.Item>
    )
  }
  
  renderMySQLTablePicker = () => {
    const { getFieldDecorator, setFieldsValue } = this.props.form
    let { offlineCalcModels, mySQLDbs, dispatch, tablesInSelectedDb } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    
    return (
      <React.Fragment>
        <FormItem label="目标数据库">
          {getFieldDecorator('visualModel.params.outputToDataBase', {
            initialValue: _.get(currModel, 'params.outputToDataBase'),
            rules: [ { required: true, message: '请填写目标数据库' } ]
          })(
            // dbAlais: "224PG"
            // dbIp: "192.168.0.224"
            // dbName: "azkaban"
            // dbPassword: "123456"
            // dbPort: 15432
            // dbType: "postgresql"
            // dbUser: "postgres"
            // id: 129
            // refProjectId: "qaz-plm-wsx"
            // schema: "public"
            <ObjectSelector
              options={mySQLDbs || []}
              getKey={o => o.id}
              getTitle={o => o.dbAlais}
              onChange={dbInfo => {
                dispatch({
                  type: `${mainNS}/getDataTables`,
                  payload: {
                    dbId: dbInfo.id
                  }
                })
                setFieldsValue({
                  'visualModel.params.outputToTable': null
                })
              }}
              {...enableSelectSearch}
            />
          )}
        </FormItem>
  
        <FormItem label="目标表">
          {getFieldDecorator('visualModel.params.outputToTable', {
            initialValue: _.get(currModel, 'params.outputToTable'),
            rules: [ { required: true, message: '请填写目标表' } ]
          })(
            <Select
              {...enableSelectSearch}
            >
              {(tablesInSelectedDb || []).map(table => {
                return (
                  <Option key={table.tableName} value={table.tableName}>{table.tableName}</Option>
                )
              })}
            </Select>
          )}
        </FormItem>
      </React.Fragment>
    )
  }
  
  detectAllOutputColumnExistInTargetTable = async (outputColInfos) => {
    let {tablesInSelectedDb, dispatch} = this.props
    const { getFieldValue } = this.props.form
    let dbConn = getFieldValue('visualModel.params.outputToDataBase')
    if (!dbConn) {
      message.warn('未选择目标数据库')
      return
    }
    let tableName = getFieldValue('visualModel.params.outputToTable')
    if (!tableName) {
      message.warn('未选择目标表')
      return
    }
    let tableInfo = _.find((tablesInSelectedDb || []), t => t.tableName === tableName)
    let dataFields = await new Promise(resolve => {
      dispatch({
        type: `${mainNS}/getDataFields`,
        payload: {
          dbId: tableInfo.dbId,
          tableName: tableInfo.tableName
        },
        callback: resolve
      })
    })
    let dataFieldNameDict = _.keyBy(dataFields, 'finalCol')
    _.forEach(outputColInfos, c => {
      const dataField = dataFieldNameDict[c.col]
      if (!dataField) {
        throw new Error(`${c.col} 不存在于目标表 ${tableName}，无法导出成功`)
      }
      // 检测类型是否匹配，使用模糊匹配，例如 long 可以匹配 int
      let targetType = guessSimpleTypeByDbDataType(dataField.sourceType)
      if (targetType !== guessSimpleTypeByDbDataType(c.type)) {
        throw new Error(`${c.col} 的类型（${c.type}）不匹配于目标表的字段类型（${targetType}），无法导出成功`)
      }
    })
  }
  
  handleDragToRelationChart = ev => {
    let { idxIdDict, tableIdDict, offlineCalcTables, disabled } = this.props
    const { getFieldValue, setFieldsValue } = this.props.form
    if (disabled) {
      return
    }
    let diagramInfo = getFieldValue('visualModel.params.diagramInfo')
    let outputCols = getFieldValue('visualModel.params.outputCols')
    
    ev.preventDefault()
    ev.stopPropagation()
    let payload = ev.dataTransfer.getData('text')
    // console.log(ev, payload)
    let domRect = ev.target.getBoundingClientRect()
    let x = ev.clientX - domRect.left, y = ev.clientY - domRect.top
    // 添加指标依赖的维表和字段到关系图
    let preAddTables, preAddCols
    if (_.startsWith(payload, 'index:')) {
      let [dragType, idxId] = payload.split(':')
      let idx = idxIdDict[idxId]
      if (!idx) {
        return
      }
      let dimDeps = resolveAllDimDepsOfIndex(idx)
      let dimIdDeps = _(dimDeps)
        .uniq()
        .map(dimDep => {
          let [dsId, tableName, fieldName] = dimDep.split('|')
          let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
          return table && { dimId: `${table.id}/${fieldName}` }
        })
        .compact()
        .value()
      preAddCols = [{idxId}, ...dimIdDeps]
      preAddTables = _(dimDeps).uniq()
        .map(dimDep => {
          let [dsId, tableName, fieldName] = dimDep.split('|')
          return { dsId, tableName, fieldName }
        })
        .groupBy(dep => `${dep.dsId}/${dep.tableName}`)
        .mapValues(deps => {
          let dsId = deps[0].dsId, tableName = deps[0].tableName
          let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
          if (!table) {
            return null
          }
          let fieldNameSet = new Set(deps.map(d => d.fieldName))
          return {
            id: table.id,
            name: table.name,
            title: table.title,
            // 表类型可能时延迟加载的
            fields: _.isEmpty(_.get(table.params, 'fieldInfos'))
              ? deps.map(d => ({field: d.fieldName}))
              : (_.get(table.params, 'fieldInfos') || []).filter(fi => fieldNameSet.has(fi.field))
          }
        })
        .values()
        .filter(_.identity)
        .value()
    } else if (_.startsWith(payload, 'table:')) {
      let [dragType, tableId] = payload.split(':')
      let table = tableIdDict[tableId]
      if (_.some(diagramInfo && diagramInfo.tables, t => t.id === tableId)) {
        message.warn('此维表已经添加过了')
        return
      }
      preAddCols = []
      preAddTables = [{
        id: tableId,
        name: table.name,
        title: table.title,
        fields: []
      }]
    } else {
      throw new Error('Unknown drag payload: ' + payload)
    }
    const nextDiagramInfo = immutateUpdate(diagramInfo, 'tables', tables => {
      let offset = 0
      return preAddTables.reduce((accTables, curr, i) => {
        let prev = _.find(accTables, t => t.id === curr.id)
        if (prev) {
          const position = {x: x + offset * 15, y: y + offset * 15}
          return _.map(accTables, t => {
            return t === prev
              ? {
                ...t,
                position,
                fields: _.uniqBy([...t.fields, ...curr.fields], 'field')
              }
              : t
          })
        }
        const position = {x: x + offset * 15, y: y + offset * 15}
        offset += 1
        return [...(accTables || []), {...curr, position}]
      }, tables)
    })
    setFieldsValue({
      'visualModel.params.diagramInfo': nextDiagramInfo,
      // 更新字段数组
      'visualModel.params.outputCols': _.uniqBy([...outputCols, ...preAddCols], c => c.dimId || c.idxId)
    })
  }
  
  renderFlowDesign = () => {
    let { form: { getFieldDecorator }, taskInfo = {}, addStep } = this.props
    return (
      <React.Fragment>
        {this.renderModeSwitchBtn()}
        <Row>
          <Col span={8}>
            <FormItem label="任务名称" className="mg1b" hasFeedback labelCol={{ span: 6 }} wrapperCol={{ span: 17 }}>
              {getFieldDecorator('showName', {
                rules: [{ required: true, message: '任务名称必填!' }, ...validInputName],
                initialValue: _.get(taskInfo, 'showName', '')
              })(
                <Input />
              )}
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem label="任务描述" className="mg1b" hasFeedback {...formItemLayout}>
              {getFieldDecorator('description', {
                initialValue: _.get(taskInfo, 'description', '')
              })(
                <Input />
              )}
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem label="创建时间" className="mg1b" {...formItemLayout}>
              {getFieldDecorator('createTimestamp', {
                initialValue: moment(_.get(taskInfo, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')
              })(
                <Input disabled />
              )}
            </FormItem>
          </Col>
        </Row>
        <TaskScheduleDesign taskName={taskInfo.name} value={taskInfo} />
      </React.Fragment>
    )
  }
  
  submitEditModeOnly = async () => {
    let { dispatch, runtimeEditorNs, offlineCalcModels, form: { getFieldValue } } = this.props
    let currEditMode = getFieldValue('visualModel.params.editMode')
    let currModel = _.get(offlineCalcModels, [0])
    let nextModel = immutateUpdate(currModel, 'params.editMode', () => currEditMode)
    await new Promise(resolve => {
      dispatch({
        type: `${runtimeEditorNs}/sync`,
        payload: offlineCalcModels.map(m => m === currModel ? nextModel : m),
        callback: resolve
      })
    })
  }
  
  renderModeSwitchBtn = () => {
    let {extraFooterBtnContainer, onEditModeChange, form} = this.props
    if (!extraFooterBtnContainer) {
      return null
    }
    let { form: { getFieldDecorator }, taskInfo = {}, addStep, offlineCalcModels } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    let content = (
      getFieldDecorator('visualModel.params.editMode', {
        initialValue: _.get(currModel, 'params.editMode') || defaultEditMode
      })(
        <Radio.Group
          onChange={ev => {
            let {value} = ev.target
            if (_.isFunction(onEditModeChange)) {
              onEditModeChange(value)
            }
            form.resetFields()
          }}
        >
          <Radio.Button value="visualModelingMode">可视化模式</Radio.Button>
          <Radio.Button value="flowDesignMode">高级模式</Radio.Button>
        </Radio.Group>
      )
    )
    return ReactDOM.createPortal(content, extraFooterBtnContainer)
  }
  
  render() {
    const { getFieldValue, getFieldDecorator } = this.props.form
    let editMode = getFieldValue('visualModel.params.editMode') || defaultEditMode
    
    if (editMode === 'flowDesignMode') {
      return this.renderFlowDesign()
    }
    let { offlineCalcModels } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    // 提前声明，为了能够读取到 fieldVal
    getFieldDecorator('visualModel.params.calcType', {
      initialValue: _.get(currModel, 'params.calcType') || VisualModelCalcTypeEnum.Select,
      rules: []
    })
    
    const columnPreviewTableDom = this.renderColumnPreviewTable()
    
    return (
      <div style={{height: 'calc(100vh - 55px - 24px * 2 - 30px)'}}>
        {this.renderModeSwitchBtn()}
        <HorizontalSplitHelper
          className="contain-docs-analytic height-100"
        >
          <VerticalSplitHelper
            defaultWeight={10}
            className="itblock height-100"
          >
            <div
              defaultWeight={3}
              style={{
                padding: '10px 5px 5px 10px'
              }}
            >
              <div className="bg-white height-100 corner" >
                {this.renderIndicesPicker()}
              </div>
            </div>
            <div
              defaultWeight={2}
              style={{
                padding: '5px 5px 10px 10px'
              }}
            >
              <div className="bg-white height-100 corner" >
                {this.renderTablesPicker()}
              </div>
            </div>
          </VerticalSplitHelper>
    
          <div
            className="itblock height-100"
            style={{padding: '10px 5px 10px 5px'}}
            defaultWeight={40}
          >
            <div
              className="bg-white corner relative"
              style={{height: 'calc(100% - 170px - 10px)'}}
              onDragOver={ev => ev.preventDefault()}
              onDrop={this.handleDragToRelationChart}
            >
              {this.renderJoinConfigDiagram()}
              {!_.isEmpty(_.get(getFieldValue('visualModel.params.diagramInfo'), 'tables')) ? null : (
                <div className="pd3 color-666 font18 aligncenter absolute top0 width-100 ignore-mouse">
                  请拖拽维表到这里
                </div>
              )}
            </div>
      
            <div
              className="bg-white corner"
              style={{height: 170, marginTop: '10px'}}
            >
              {columnPreviewTableDom}
            </div>
          </div>
    
          <div
            defaultWeight={12}
            className="itblock height-100"
            style={{
              padding: '10px 10px 10px 5px'
            }}
          >
            <div className="bg-white corner height-100">
              {this.renderPropsConfigurator()}
            </div>
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }
}
