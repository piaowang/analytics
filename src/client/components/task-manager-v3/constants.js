import _ from 'lodash'

/**
 * 实时清洗json转 source clean sink 结构
 * @param {*} scriptContent
 */
export const ScriptContentToJointData = scriptContent => {
  let graph = []
  let lineData = {}
  let nodeData = {}
  if (!scriptContent) {
    return {
      graph,
      nodeData,
      lineData
    }
  }
  const data = JSON.parse(scriptContent)
  //{"pos":[365,46],"title":"Hive脚本","inputs":[],"id":"27DgnK3T6_node_1569484498422","type":"hive"}
  _.forEach(data.source, p => {
    const { name, top, left, id, type, inputs = [], outputs = [], ports } = p
    graph.push({ pos: [top, left], title: name, outputs: outputs.map(p => p.point || p), id, type, ports, inputs })
    _.set(nodeData, id, p)
    _.assign(
      lineData,
      _.keyBy(outputs, o => `${id}|${o.point}`)
    )
  })
  _.forEach(data.clean, p => {
    const { name, top, left, id, inputs = [], outputs = [], ports } = p
    graph.push({ pos: [top, left], title: name, outputs: outputs.map(p => p.point || p), id, type: p.type, ports, inputs })
    _.set(nodeData, id, { ...p, type: p.type })
    _.assign(
      lineData,
      _.keyBy(outputs, p => `${id}|${p.point}`)
    )
  })
  _.forEach(data.sink, p => {
    const { name, top, left, id, type, inputs = [], outputs = [], ports } = p
    graph.push({ pos: [top, left], title: name, outputs: outputs.map(p => p.point || p), id, type, ports, inputs })
    _.set(nodeData, id, p)
    _.assign(
      lineData,
      _.keyBy(outputs, p => `${id}|${p.point}`)
    )
  })
  return {
    graph,
    nodeData,
    lineData
  }
}

/**
 * 实时清洗jointjs结构转 字符串grahp
 * @param {*} data
 * @param {*} nodeData
 * @param {*} lineData
 */
export const JointDataToScriptContent = (data, nodeData, lineData) => {
  let res = {}
  //{"pos":[365,46],"title":"Hive脚本","inputs":[],"id":"27DgnK3T6_node_1569484498422","type":"hive"}
  const sourceNodes = data.filter(p => p.type.indexOf('Source') > 0)
  res.source = sourceNodes.map(p => {
    return {
      ..._.get(nodeData, p.id, {}),
      top: p.pos[0],
      left: p.pos[1],
      name: p.title,
      ..._.omit(p, ['top', 'name']),
      outputs: p.outputs.map(p => lineData[`${p.id}|${p}`] || { point: p })
    }
  })

  const cleanNode = data.filter(p => p.type === TASK_EDIT_TABS_TYPE.groovy || p.type === TASK_EDIT_TABS_TYPE.flinkSql)
  res.clean = _.map(cleanNode, p => {
    return {
      ..._.get(nodeData, p.id, {}),
      top: p.pos[0],
      left: p.pos[1],
      name: p.title,
      ..._.omit(p, ['top', 'name']),
      outputs: p.outputs.map(o => lineData[`${p.id}|${o}`] || { point: o })
    }
  })
  const skinNode = data.filter(p => p.type.indexOf('Sink') > 0)
  res.sink = _.map(skinNode, p => {
    return {
      ..._.get(nodeData, p.id, {}),
      top: p.pos[0],
      left: p.pos[1],
      name: p.title,
      ..._.omit(p, ['pos', 'name']),
      outputs: p.outputs.map(o => lineData[`${p.id}|${o}`] || { point: o })
    }
  })
  return JSON.stringify(res)
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

export const FLOW_NODE_TYPE = [
  {
    key: 'type-1',
    title: '数据采集',
    children: []
  },
  {
    key: 'type-2',
    title: '数据开发',
    children: []
  },
  {
    key: 'type-3',
    title: '模型输出',
    children: []
  },
  {
    key: 'type-4',
    title: '节点组件',
    children: []
  }
]

export const FLOW_NODE_TYPE_REAL_TIME_CALC = [
  {
    key: 'type-2',
    title: '数据开发',
    children: []
  },
  {
    key: 'type-4',
    title: '节点组件',
    children: []
  }
]

export const FLOW_GROUP_BAS_NODE = []
export const FLOW_NODE_INFOS = _.uniqBy(
  _.flatMap([...FLOW_NODE_TYPE, ...FLOW_NODE_TYPE_REAL_TIME_CALC], p => p.children),
  c => c.nodeType
)

export const TASK_SCRIPT_TYPE = {
  dataCollect: 'dataCollect.script',
  python: 'script',
  hive: 'hive.script',
  command: 'command',
  exportMysql: 'command',
  tindex: 'tindex.script',
  nodeWait: 'nodeWait.script',
  textCollect: 'textCollect.script',
  scala: 'scala.script',
  impala: 'impala.script',
  perl: 'perl.script',
  mlsql: 'mlsql.script',
  flinkSql: 'flinkSql.script',
  flinkJar: 'flinkJar.script',
  oraclesql: 'oraclesql.script',
  sqlserver: 'sqlserver.script',
  mysql: 'mysql.script',
  sparkSql: 'sparkSql.script',
  end: ''
}

export const TASK_EDIT_TABS_TYPE = {
  offLineTask: 'offLine', //流程图编辑
  offLineTaskGroup: 'taskGroup', //流程图编辑
  realTimeTask: 'realTime', //实时数据编辑
  realTimeCalc: 'realTimeCalc', //实时计算
  realtimeCollect: 'realtimeCollect', //实时数据编辑
  dataCollect: 'dataCollect', // 采集结点
  textCollect: 'textCollect', // 文本采集结点
  hive: 'hive',
  python: 'python',
  command: 'command',
  nodeWait: 'nodeWait',
  exportTIndes: 'tindex',
  exportMysql: 'exportMysql',
  scala: 'scala',
  impala: 'impala',
  perl: 'perl',
  mlsql: 'mlsql',
  groovy: 'groovy',
  flinkSql: 'flinkSql',
  flinkJar: 'flinkJar',
  oraclesql: 'oraclesql',
  sqlserver: 'sqlserver',
  mysql: 'mysql',
  sybase: 'sybase',
  sparkSql: 'sparkSql',
  guide: 'guide'
}

// 可以右鍵编辑脚本的节点类型
export const TASK_CAN_EDIT_NODE_TYPE = _.values(_.omit(TASK_EDIT_TABS_TYPE, ['offLineTask', 'offLineTaskGroup', 'realTimeTask', TASK_EDIT_TABS_TYPE.realTimeCalc, 'guide']))

export const TASK_EDIT_NODE_TYPE = {
  task: 'task', //流程图编辑
  dataCollect: 'dataCollect', // 采集结点
  hive: 'hive',
  python: 'python',
  command: 'command',
  nodeWait: 'nodeWait',
  exportMysql: 'command',
  tindex: 'tindex',
  scala: 'scala',
  impala: 'impala',
  perl: 'perl',
  mlsql: 'mlsql',
  oraclesql: 'oraclesql',
  sqlserver: 'sqlserver',
  mysql: 'mysql',
  sybase: 'sybase',
  sparkSql: 'sparkSql'
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
  PREPARING: '#cccccc',
  QUEUED: '#666666'
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
  PREPARING: '准备中',
  QUEUED: '排队中'
  // SKIPPED: '  ',  // 等待节点的单独执行引起，直接显示空白灰色的
}

export function jointDataToAzkabanFLowData(data, transform, oldTransform) {
  let [x = 0, y = 0] = transform
  let [oldX = 0, oldY = 0] = oldTransform
  // data = {"graphInfo":[{"pos":[365,46],"title":"Hive脚本","inputs":[],"id":"27DgnK3T6_node_1569484498422","type":"hive"},{"pos":[365,126],"title":"Shell脚本","inputs":["27DgnK3T6_node_1569484498422"],"id":"27DgnK3T6_node_1569484498432","type":"command"},{"pos":[365,206],"title":"结束","inputs":["27DgnK3T6_node_1569484498432"],"id":"27DgnK3T6_node_1569484498442","type":"end"}],"scale":1}
  let lines = {}
  let nodes = {}
  _.each(data, p => {
    let nodeInfo = {
      top: Math.floor(p.pos[1] + y - oldY),
      left: Math.floor(p.pos[0] + x - oldX),
      name: p.title,
      type: p.type === 'exportMysql' ? 'command' : p.type,
      width: 26,
      height: 26,
      ports: p.ports ? JSON.stringify(p.ports) : ''
    }
    if (_.get(p, ['proxy.job'], '')) {
      nodeInfo = {
        ...nodeInfo,
        ..._.pick(p, ['proxy.job.id', 'proxy.job'])
      }
    }
    nodes[p.id] = nodeInfo
    if (p.inputs.length) {
      _.forEach(p.inputs, line => {
        lines[`${p.id.replace('node', 'line')}__${line.substring(line.lastIndexOf('_'))}`] = { marked: false, from: line, to: p.id, type: 'sl' }
      })
    }
  })
  return {
    lines,
    nodes
  }
}

export function autoTypography(graphInfo, type = 1, transform) {
  const cellHeight = 40
  const cellMarginTop = 50
  const cellMarginRight = 80
  const cellWidth = 160
  let res = []
  const getChildren = function (item, index = 0) {
    let resNodes = graphInfo.filter(p => _.includes(item, p.id))
    let nodesMap = _.keyBy(resNodes, p => p.id)
    const nodes = _.reduce(
      item,
      (r, v) => {
        r.push(nodesMap[v])
        return r
      },
      []
    )
    // let nodes = graphInfo.filter(p => _.includes(item, p.id))

    res.push({ index, nodes })
    const childrens = _.flatten(nodes.map(p => p.inputs))
    if (childrens.length) {
      getChildren(_.uniq(childrens), index + 1)
    }
  }

  const allInputs = _.flatten(graphInfo.map(p => p.inputs))
  const endNode = graphInfo.find(p => !_.includes(allInputs, p.id))
  getChildren([endNode.id])

  const cellCount = _.max(res.map(p => p.nodes.length))
  const rowCount = res.length
  const maxWidth = type === 1 ? cellWidth * cellCount + (cellCount - 1) * cellMarginRight : cellWidth * rowCount + (rowCount - 1) * cellMarginRight
  const maxHeight = type === 1 ? cellHeight * rowCount + (rowCount - 1) * cellMarginTop : cellHeight * cellCount + (cellCount - 1) * cellMarginTop

  let [minX, minY] = transform
  minX = -minX + 50
  minY = -minY + 50
  // const minX = 50 // -(maxWidth / 2) + (type === 1 ? 100 : 400)
  // const minY = 50//-(maxHeight / 2) + 50

  res = _.orderBy(res, ['index'], ['desc'])

  res = res.map((p, i) => {
    const count = p.nodes.length
    return p.nodes.map((n, j) => {
      const avgWidth = maxWidth / (type === 1 ? count : rowCount)
      const avgHeght = maxHeight / (type === 1 ? rowCount : count)
      let [top, left] = [0, 0]
      if (type === 1) {
        top = minY + (cellHeight + cellMarginTop) * i
        left = minX + (cellWidth + cellMarginRight) * j + (avgWidth / 2 - cellWidth / 2)
        // top = minY + ((cellHeight + cellMarginTop) * i)
        // left = minX + ((cellWidth + (cellMarginRight * j)) * i)
      } else {
        top = minY + (cellHeight + cellMarginTop) * j + (avgHeght / 2 - cellHeight / 2)
        left = minX + (cellWidth + cellMarginRight) * i
      }
      return {
        ...n,
        pos: [left, top]
      }
    })
  })
  return _.flatten(res, p => p.nodes)
}

export function azkabanFLowDataToJointData(data, param, taskList) {
  // const data = {
  //   "gline": {
  //     "27DgnK3T6_line_1569484498422__1569484498432": {
  //       "marked": false,
  //       "from": "27DgnK3T6_node_1569484498422",
  //       "to": "27DgnK3T6_node_1569484498432",
  //       "type": "sl"
  //     },
  //     "27DgnK3T6_line_1569484498432__1569484498442": {
  //       "marked": false,
  //       "from": "27DgnK3T6_node_1569484498432",
  //       "to": "27DgnK3T6_node_1569484498442",
  //       "type": "sl"
  //     }
  //   },
  //   "gnode": {
  //     "27DgnK3T6_node_1569484498422": {
  //       "top": 46,
  //       "left": 365,
  //       "name": "Hive脚本",
  //       "width": 104,
  //       "type": "hive",
  //       "height": 26
  //     },
  //     "27DgnK3T6_node_1569484498432": {
  //       "top": 126,
  //       "left": 365,
  //       "name": "Shell脚本",
  //       "width": 104,
  //       "type": "command",
  //       "height": 26
  //     },
  //     "27DgnK3T6_node_1569484498442": {
  //       "top": 206,
  //       "left": 365,
  //       "name": "结束",
  //       "width": 104,
  //       "type": "end",
  //       "height": 26
  //     }
  //   },
  //   "flowid": "27DgnK3T6"
  // }
  let taskMap = {}
  if (taskList.length) {
    taskMap = _.reduce(
      taskList,
      (r, v) => {
        r[v.id] = _.get(v, 'showName', '')
        return r
      },
      {}
    )
  }
  const gnode = _.reduce(
    JSON.parse(data.gnode),
    (r, v, k) => {
      r.push({
        id: k,
        ...v
      })
      return r
    },
    []
  )

  const gline = _.reduce(
    JSON.parse(data.gline),
    (r, v, k) => {
      r.push(v)
      return r
    },
    []
  )

  const graph = gnode.map(p => {
    let params = {}
    if (p.type === 'project') {
      params = _.pick(p, ['proxy.job.id', 'proxy.job'])
    }
    return {
      pos: [p.left, p.top],
      title: p.type === 'project' ? _.get(taskMap, params['proxy.job.id'], p.name) : p.name,
      inputs: gline.filter(l => l.to === p.id).map(l => l.from),
      ports: _.isEmpty(p.ports) ? {} : JSON.parse(p.ports),
      id: p.id,
      type: param[p.id] || p.type,
      ...params
    }
  })
  return {
    graph,
    scale: 1
  }
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

export const DISPLAY_TASK_MODEL = {
  offLineTaskGroup: 'taskGroup',
  offLineTask: 'offLine',
  realTimeTask: 'realTime',
  realTimeCalc: 'realTimeCalc',
  realtimeCollect: 'realtimeCollect'
}

export const DISPLAY_TASK_MODEL_TRANSLATE = {
  taskGroup: '工作流组',
  task: '工作流',
  realTime: '实时清洗',
  realTimeCalc: '实时计算',
  realtimeCollect: '实时采集'
}
export const DISPLAY_TASK_EDITINGORDER = {
  offLineTaskGroup: false,
  offLineTask: false,
  realTimeTask: false
}

/* ---------嵌套树需用到的函数----------- */

export function makeTreeNode({ types, tasks, order }) {
  // if(!types || !tasks || !order) return
  if (!types) return //|| !tasks
  let typeNodes = types.map(k => ({
    title: k.title,
    id: k.id + '',
    parent_id: k.parent_id + '', //添加一个parentid，要做离时/实时区分
    key: `type-${k.id}`,
    parentKey: k.parent_id ? `type-${k.parent_id}` : null,
    children: []
  }))
  let typeNodeKeyDict = _.keyBy(typeNodes, 'key')

  let treeRoot = []

  // 插入 task
  ;(tasks || []).forEach(task => {
    let parentType = typeNodeKeyDict[`type-${task.category_id}`]
    let taskNodeProps = {
      title: task.showName,
      key: task.id + '',
      id: task.id + '',
      parentKey: parentType ? parentType.key : 'type-0'
    }
    // 工作流状态
    if (task.status_exc) {
      taskNodeProps.status_exc = task.status_exc
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

  let sortInfo = order
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
  return recurSort(tree, 'type-0')
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

export function getTypeKeysByKey(ids, types) {
  let newIds = types.filter(p => ids.includes(p.parent_id.toString()))
  if (newIds.length) {
    newIds = newIds.map(p => p.id.toString())
    return _.union(getTypeKeysByKey(newIds, types), ids)
  }
  return ids
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

export const FLOW_INCON_MAP = {
  dataCollect: 'sugo-api-access',
  textCollect: 'file-text',
  python: 'sugo-language-python',
  hive: 'sugo-hive1',
  command: 'sugo-shell',
  exportMysql: 'sugo-mysql1',
  tindex: 'sugo-flow-druidio',
  nodeWait: 'sugo-new-wait',
  end: 'sugo-end',
  task: 'sugo-workflow',
  taskGroup: 'sugo-workflow-group',
  realTimeTask: 'sugo-workflow',
  impala: 'sugo-impala',
  perl: 'sugo-perl',
  scala: 'sugo-scala',
  mlsql: 'sugo-mlsql'
}

export const TASK_PROJECT_USER_ROLE_TYPE = {
  manager: 2,
  dev: 1,
  guest: 0
}

export const TASK_PROJECT_USER_ROLE_TYPE_TRANSLATE = {
  manager: '管理员',
  dev: '开发者',
  guest: '访客'
}

/**
 * 实时清洗 clean节点文件后缀映射
 */
export const REALTIME_TASK_SCRIPT_MAP = {
  flinkSql: 'sql',
  groovy: 'java'
}
// 概览页面用到的变量，注意不要修改，部分值是传到后台的
export const CIRCLE_DISPATCH_MANAGER_PROJECT = {
  ALL: 'all', //任务调度全部任务的id
  PROJECT: 'project', //任务调度工作流类型-工作流
  GROUP: 'group', //任务调度工作流类型-工作流组
  REALTIME: 'realtime', //任务调度工作流类型-实时
  OFFLINE: 'offline' //任务调度工作流类型-离线
}

export const HIVE_DATATYPES_MAPS = {
  mysql: {
    bigint: 'bigint',
    int: 'int',
    smallint: 'smallint',
    tinyint: 'tinyint',
    decimal: 'decimal',
    double: 'double',
    float: 'double',
    binary: 'binary',
    varbinary: 'binary',
    char: 'string',
    varchar: 'string',
    mediumtext: 'string',
    text: 'string',
    datetime: 'string',
    time: 'string',
    timestamp: 'string',
    date: 'date',
    json: 'map<string,string>'
  },
  oracle: {
    integer: 'double',
    number: 'double',
    float: 'double',
    binary_float: 'double',
    binary_double: 'double',
    date: 'timestamp',
    'timestamp(N)': 'timestamp',
    char: 'string',
    nchar: 'string',
    varchar2: 'string',
    nvarchar: 'string',
    nvarchar2: 'string',
    blob: 'string',
    bfile: 'string',
    nclob: 'string',
    rowid: 'string',
    urowid: 'string',
    'timestamp with time zone': 'string',
    'timestamp with local time zone': 'string',
    anydata: 'string',
    varray: 'string',
    nestedtab: 'string',
    object: 'string',
    ref: 'string',
    raw: 'binary'
  },
  sqlserver: {
    numeric: 'int',
    bit: 'smallint',
    long: 'bigint',
    dec_float: 'double',
    money: 'double',
    smallmoeny: 'double',
    real: 'double',
    char: 'string',
    nchar: 'string',
    varchar2: 'string',
    nvarchar: 'string',
    text: 'string',
    ntext: 'string',
    binary: 'binary',
    varbinary: 'binary',
    image: 'binary',
    date: 'date',
    datetime: 'timestamp',
    datetime2: 'timestamp',
    smalldatetime: 'timestamp',
    datetimeoffset: 'timestamp',
    timestamp: 'timestamp',
    time: 'timestamp',
    clob: 'string',
    blob: 'binary'
  },
  postgresql: {
    smallint: 'smallint',
    int: 'int',
    bigint: 'bigint',
    decimal: 'decimal',
    numeric: 'int',
    real: 'double',
    double: 'double',
    smallserial: 'smallint',
    serial: 'int',
    bigserial: 'bigint',
    money: 'bigint',
    varchar: 'string',
    char: 'string',
    text: 'string',
    timestamp: 'string',
    date: 'date',
    time: 'string',
    interval: 'string',
    boolean: 'boolean'
  },
  db2: {
    char: 'string',
    varchar: 'string',
    'long varchar': 'string',
    graphics: 'string',
    vargraphics: 'string',
    'long vargraphics': 'string',
    timestamp: 'timestamp',
    date: 'date',
    time: 'string',
    int: 'int',
    smallint: 'smallint',
    double: 'double',
    float: 'float',
    bigint: 'bigint',
    real: 'double',
    numeric: 'numeric',
    decimal: 'demical',
    text: 'string',
    blob: 'string'
  },
  hana: {
    char: 'string',
    varchar: 'string',
    varchar2: 'string',
    nvarchar: 'string',
    alphanum: 'string',
    shorttext: 'string',
    tinyint: 'tinyint',
    smallint: 'smallint',
    integer: 'int',
    bigint: 'bigint',
    smalldecimal: 'smalldecimal',
    decimal: 'decimal',
    real: 'double',
    double: 'double',
    date: 'date',
    time: 'string',
    timestamp: 'timestamp',
    varbinary: 'string',
    blob: 'string',
    clob: 'string',
    nclob: 'string',
    text: 'string'
  },
  kudu: {
    bool: 'boolean',
    int8: 'tinyint',
    int16: 'smallint',
    int32: 'int',
    bigint: 'bigint',
    float: 'float',
    double: 'double',
    string: 'string',
    binary: 'string',
    timestamp: 'timestamp'
  }
}
