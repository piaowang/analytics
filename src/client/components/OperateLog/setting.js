import _ from 'lodash'

export const resultFilterArr = [
  {value: 'success', name: '成功'},
  {value: 'fail', name: '失败'}
]

export const typeFilterArr = [
  {value: 'create', name: '创建'},
  {value: 'update', name: '修改'},
  {value: 'delete', name: '删除'},
  {value: 'logout', name: '登出'},
  {value: 'login', name: '登录'}
]


export const initStore = {
  loading: false,
  scheduleTables: [],
  historyTables: [],
  runningFlows: [],
  finishedFlows: {},
  historyFlows: {
    flowHistory: [],
    pageNum: 1,
    pageSize: 10,
    totalNum: 0
  }
}

export const taskType = {
  updateStatus: 'updateStatus',
  saveScheduleTables: 'saveScheduleTables',
  saveHistoryTables: 'saveHistoryTables',
  saveRunningFlows: 'saveRunningFlows',
  saveFinishedFlows: 'saveFinishedFlows',
  saveExecutorResult: 'saveExecutorResult',
  saveHistoryFlows: 'saveHistoryFlows'
}

export const ORDER_FIELDS_MAP = {
  submitTime: 'submit_time',
  endTime: 'end_time',
  showName: 'show_name',
  costTime: 'cost_time',
  executionId: 'exec_id'
}

export const Interface = {
  schedule: '/schedule', // 获取调度表格
  executor: '/executor', // 查看调度状态,
  history: '/history'  // 执行历史
}

_.forOwn(Interface, (v, n) => Interface[n] = `/app/task-schedule${v}`)
