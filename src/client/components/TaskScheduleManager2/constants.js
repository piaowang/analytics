import moment from 'moment'
import _ from 'lodash'

export const TASK_TREE_TYPE = {
  dataDevelop: { name: 'dataDevelop', propsName: 'projects' }, // 数据开发
  scheduleHandle: { name: 'scheduleHandle', propsName: 'schedules' }, //调度管理
  executionHandle: { name: 'executionHandle', propsName: 'executions' }, // 执行管理
  dataCatalog: { name: 'dataCatalog', propsName: 'dataCatalog' } //数据目录
}

export const TASK_ACTION_TYPE = {
  dataCollection: 1,
  dataCleaning: 2,
  dataModeling: 3
}

export const formatDate = timer => {
  return timer > 0 ? moment(timer).format('YYYY-MM-DD HH:mm:ss') : '-'
}

export const TASK_OPERTION_FORM_TYPE = {
  addBaseInfo: 1,
  addCollectConfig: 2,
  addExecutor: 3,
  addFlow: 4,
  editTaskInfo: 5,
  editExecutor: 6,
  editModelInfo: 7 // 可视化建模
}

export const TASK_FORM_LAST_SETP = [
  TASK_OPERTION_FORM_TYPE.addCollectConfig,
  TASK_OPERTION_FORM_TYPE.editTaskInfo,
  TASK_OPERTION_FORM_TYPE.addFlow,
  TASK_OPERTION_FORM_TYPE.editModelInfo
]

export const TASK_FORM_SET_HW_STEP = [
  TASK_OPERTION_FORM_TYPE.editTaskInfo,
  TASK_OPERTION_FORM_TYPE.addCollectConfig,
  TASK_OPERTION_FORM_TYPE.addFlow,
  TASK_OPERTION_FORM_TYPE.editModelInfo
]

export const TASK_FORM_ADD_STEP = [TASK_OPERTION_FORM_TYPE.addBaseInfo, TASK_OPERTION_FORM_TYPE.addCollectConfig, TASK_OPERTION_FORM_TYPE.addFlow]

/**
 * 计算任务耗时
 * @param obj
 * key
 */
export const getSpendTime = (obj, key) => {
  if (obj.endTime === -1 || obj.submitTime === -1) {
    return '-'
  }
  let start = obj.submitTime
  if (typeof start === 'undefined') {
    start = obj.startTime
  }

  const sec = moment(obj.endTime).diff(moment(start), 'seconds')
  return sec < 60 ? `${sec} 秒` : moment.duration(sec, 'seconds').humanize()
}

export const RELOAD_TREE = 'task-schedule.reloadTree'

export const FLOW_REMARK = {
  cursor: '选择指针',
  direct: '转换连线',
  command: 'Shell脚本',
  python: 'Python脚本',
  hive: 'Hive脚本',
  druidIndex: 'Duridio作业',
  nodeWait: '等待',
  oraclesql: 'oracle脚本',
  postgres: 'postgre脚本',
  sqlserver: 'sqlserver脚本',
  access: '接入节点',
  'end round': '结束',
  end: '结束',
  gobblin: 'gobblin脚本',
  mysql: 'mysql脚本',
  dataClean: '数据加工',
  dataModel: '建模开发',
  scala: 'Scala脚本',
  impala: 'Impala脚本',
  perl: 'Perl脚本',
  mlsql: 'mlsql脚本',
  sybase: 'sybase脚本',
  sparkSql: 'sparkSql脚本'
}

export const FLOW_STATUS_COLOR_MAP = {
  READY: '#cccccc',
  RUNNING: '#3398cc',
  PAUSED: '#c82123',
  SUCCESS: '#5cb85c',
  SUCCEED: '#5cb85c',
  SUCCEEDED: '#5cb85c',
  KILLING: '#ff9999',
  KILLED: '#d9534f',
  FAILED: '#d9534f',
  CANCELLED: '#ff9999',
  PREPARING: '#cccccc'
}

export const FLOW_STATUS_TEXT_MAP = {
  READY: '准备',
  RUNNING: '执行中',
  PAUSED: '已暂停',
  SUCCESS: '成功',
  SUCCEED: '成功',
  SUCCEEDED: '成功',
  KILLING: '终止中',
  KILLED: '终止',
  FAILED: '失败',
  CANCELLED: '已取消',
  PREPARING: '准备中'
}

export const STEP_PARAMS_REMARK = {
  projectId: '依赖任务',
  nodeId: '任务节点',
  executeTime: '执行时间',
  timeout: '超时时间'
}

export const DEFAULT_CRONINFO = {
  unitType: '0',
  selectedPeriod: 'hour',
  cronExpression: '0 * * * *',
  hourValue: null,
  selectedHourOption: {
    minute: '0'
  },
  selectedDayOption: {
    hour: '0',
    minute: '0'
  },
  selectedWeekOption: {
    hour: '0',
    day: '1',
    minute: '0'
  },
  selectedMonthOption: {
    hour: '0',
    day: '1',
    minute: '0'
  },
  selectedYearOption: {
    month: '1',
    hour: '0',
    day: '1',
    minute: '0'
  },
  selectedIntervalOption: {
    hour: 1,
    startHour: 18,
    minute: 38
  },
  period: 'day',
  option: {
    hour: '0',
    month: '1',
    day: '1',
    minute: '0'
  },
  taskStartTime: moment().format('YYYY-MM-DD HH:mm')
}

export const gobblin = {
  'bootstrap.with.offset': 'earliest',
  'data.publisher.final.dir': '${fs.uri}/gobblin/job-output',
  'data.publisher.type': 'gobblin.publisher.BaseDataPublisher',
  'extract.namespace': 'gobblin.extract.kafka',
  'job.description': 'Gobblin Load Data From Kafka To HDFS',
  'job.group': 'GobblinKafkaHDFS',
  'job.lock.enabled': 'false',
  'job.name': 'GobblinKafka-HDFS-REALTIME',
  'kafka.brokers': '192.168.0.223:9092,192.168.0.224:9092,192.168.0.225:9092',
  'metrics.log.dir': '/gobblin/gobblin-kafka/metrics',
  'metrics.reporting.file.enabled': 'true',
  'metrics.reporting.file.suffix': 'txt',
  'mr.job.max.mappers': '2',
  'mr.job.root.dir': '${fs.uri}/gobblin/gobblin-kafka/working',
  showName: 'gobblin脚本',
  'simple.writer.delimiter': '\n',
  'source.class': 'gobblin.source.extractor.extract.kafka.KafkaSimpleSource',
  'state.store.dir': '${fs.uri}/gobblin/gobblin-kafka/state-store',
  'task.data.root.dir': '${fs.uri}/gobblin/jobs/kafkaetl/gobblin/gobblin-kafka/task-data',
  'topic.whitelist': 'gobblin0413',
  'writer.builder.class': 'gobblin.writer.SimpleDataWriterBuilder',
  'writer.destination.type': 'HDFS',
  'writer.file.path.type': 'tablename',
  'writer.output.format': 'csv'
}

export const VisualModelOutputTargetTypeEnum = {
  // None: '只计算不导出',
  Tindex: 'Tindex',
  MySQL: 'MySQL'
}

export function treeFilter(tree, predicate) {
  if (_.isEmpty(tree)) {
    return []
  }
  return tree
    .map(n => {
      if (n.children) {
        let filteredChildren = treeFilter(n.children, predicate)
        return !predicate(n) && _.isEmpty(filteredChildren) ? null : { ...n, children: filteredChildren }
      }
      return predicate(n) ? n : null
    })
    .filter(_.identity)
}

export function getTypeKeysByKey(ids, types) {
  let newIds = types.filter(p => ids.includes(p.parentId.toString()))
  if (newIds.length) {
    newIds = newIds.map(p => p.id.toString())
    return _.union(getTypeKeysByKey(newIds, types), ids)
  }
  return ids
}

// => [{key: 'xxx', title: 'xxx', parentKey: null, children: [{key, title, parentKey: 'xxx'}, ...]}]
export function makeTreeNode({ types, tasks, order }) {
  // if(!types || !tasks || !order) return
  if (!types) return //|| !tasks
  let typeNodes = types.map(k => ({
    title: k.name,
    key: `type-${k.id}`,
    parentKey: k.parentId ? `type-${k.parentId}` : null,
    children: []
  }))
  let typeNodeKeyDict = _.keyBy(typeNodes, 'key')

  let treeRoot = []

  // 插入 task
  ;(tasks || []).forEach(task => {
    let parentType = typeNodeKeyDict[`type-${task.typeId}`]
    let taskNodeProps = {
      title: task.showName,
      key: task.id + '',
      parentKey: parentType ? parentType.key : null
    }
    if (parentType) {
      parentType.children.push(taskNodeProps)
    } else {
      // 未分类
      treeRoot.push(taskNodeProps)
    }
  })

  // types 嵌套
  let treeUnsorted = typeNodes.reduce((arr, k) => {
    if (k.parentKey) {
      let parent = typeNodeKeyDict[k.parentKey]
      if (!parent) {
        return [...arr, k]
      }
      parent.children.unshift(k)
      return arr
    }
    return [...arr, k]
  }, treeRoot)

  let sortInfo = JSON.parse(_.get(order, 'sort') || '{}')
  return sortTree(treeUnsorted, sortInfo)
}

export function sortTree(tree, sortInfoDict) {
  function recurSort(tree, parentKey) {
    let sortDict = (sortInfoDict[parentKey] || []).reduce((acc, curr, idx) => {
      acc[curr] = idx
      return acc
    }, {})
    return _.orderBy(tree, n => sortDict[n.key]).map(n => {
      return n.children ? { ...n, children: recurSort(n.children, n.key) } : n
    })
  }
  return recurSort(tree, '-1')
}

export function recurFindPathNodeKeys(treeData, targetNodeKey) {
  if (_.isEmpty(treeData)) {
    return []
  }
  let [headNode, ...rest] = treeData
  if (headNode.key === targetNodeKey) {
    return [targetNodeKey]
  }
  let childIds = recurFindPathNodeKeys(headNode.children, targetNodeKey)
  if (!_.isEmpty(childIds)) {
    return [headNode.key, ...childIds]
  }
  return recurFindPathNodeKeys(rest, targetNodeKey)
}

export function recurFlatten(tree) {
  if (_.isEmpty(tree)) {
    return []
  }
  return _.flatMap(tree, n => [n, ...recurFlatten(n.children)])
}

export function treeNode2KeyStr(n) {
  return _.startsWith(n.key, 'type-') ? n.key.substr(5) : n.key
}

export function treeNodeKeyStr(key) {
  return _.startsWith(key, 'type-') ? key.substr(5) : key
}

export function getTreeTypeId(id, tasks) {
  if (_.startsWith(id, 'type-')) {
    return id.substr(5)
  }
  return (tasks.find(p => p.id.toString() === id) || {}).typeId
}

export function getRootNodeActionTypeByKey(id, types, tasks, isType = false) {
  let nodeObj = isType ? types.find(p => p.id.toString() === id) : {}
  let parentId = ''
  if (_.isEmpty(nodeObj)) {
    const task = tasks.find(p => p.id.toString() === id)
    parentId = task.typeId
  } else {
    parentId = nodeObj.parentId
  }
  if (!parentId) {
    return nodeObj.actionType
  }
  return getRootNodeActionTypeByKey(parentId.toString(), types, [], true)
}

// 根据任务名获取所有父级节点
export function getAllParent({ types, tasks, selectId }) {
  let taskInfo = tasks.find(p => p.id.toString() === selectId.toString())
  if (_.isEmpty(taskInfo)) {
    return []
  }
  let parentIds = []
  const getparent = id => {
    const typeInfo = types.find(p => p.id.toString() === id.toString())
    parentIds.push(`type-${typeInfo.id}`)
    if (typeInfo.parentId) {
      getparent(typeInfo.parentId)
    }
    return
  }
  getparent(taskInfo.typeId)
  return parentIds
}

export const validInputName = [
  {
    pattern: new RegExp('[^a-zA-Z0-9_\u4e00-\u9fa5]', 'i'),
    message: '输入无效,包含非法字符',
    validator: (rule, value, callback) => {
      if (rule.pattern.test(value)) {
        callback(rule.message)
      }
      callback()
    }
  },
  {
    max: 60,
    message: '1~60个字符'
  }
]
