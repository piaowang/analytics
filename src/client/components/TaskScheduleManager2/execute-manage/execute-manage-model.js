import Fetch from '../../../common/fetch-final'
import { message } from 'antd'
import { sendJSON, recvJSON } from '../../../common/fetch-utils'
import { TASK_TREE_TYPE, TASK_ACTION_TYPE } from '../constants'
import { toQueryParams, tryJsonParse } from '../../../../common/sugo-utils'

export const namespace = 'execute-manage'

export const taskTreeNamespance = `taskScheduleTree_${TASK_TREE_TYPE.executionHandle.name}`

export const pageSize = 12
export default opt => ({
  namespace,
  state: {
    showLogPopWindow: false,
    showStopExecuteTaskPopwindow: false,
    showRestartExecuteTaskPopwindow: false,
    data: {},
    searchTaskName: '',
    searchStartTime: '',
    searchEndTime: '',
    searchStatus: '',
    //0:正在执行 1：执行历史
    pageStatus: 1,
    //查看日志中的全部日志返回内容
    checkAllLogContext: {},
    //查看日志的tablelist
    checkLogTableList: {},
    //每个任务的单独日志
    singleLogMap: {},
    historyPageIndex: 0,
    historyList: [],
    runningList: [], 
    totalNum: 0,
    pageIndex: 1
  },
  reducers: {
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    /**
    * 获取执行中的任务
    * @param {*} param0 
    * @param {*} param1 
    */
    *getRunningFlows({ payload }, { select, call, put }) {
      let url = '/app/new-task-schedule/executor?getRunningFlows'
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            runningList: res.runningFlows,
            ...payload
          }
        })
      } else {
        message.error('获取失败!')
      }
    },
    /**
     * 获取执行中的任务
     * @param {*} param0 
     * @param {*} param1 
     */
    *queryHistoryTask({ payload }, { select, call, put }) {
      const { page = 1, size = 10, typeId, projectId, flowcontain, status, begin, end, orderby = 'end_time', order = 'desc' } = payload
      let url = '/app/new-task-schedule/history'
      let params = {
        page,
        size,
        typeId,
        projectId,
        flowcontain,
        status,
        begin,
        end,
        orderby,
        order
      }

      params = _.pickBy(params, _.identity)
      params = toQueryParams(params)
      let res = yield call(Fetch.get, `${url}?${params}`, null)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            historyList: res.historyFlows,
            pageStatus: 1,
            totalNum: res.totalNum,
            pageIndex: page,
            ...payload
          }
        })
      } else {
        message.error('获取失败!')
      }
    },

    *stopExecuteTask({ payload }, { select, call, put }) {
      const { execId } = payload
      let url = `/app/new-task-schedule/executor?ajax=cancelFlow&execid=${execId}`
      let res = yield call(Fetch.get, url, null)
      if (res.status === 'success') {
        message.success('作业停止成功')

      } else {
        message.success('作业停止失败,原因:' + res.error)
      }
      yield put({
        type: 'changeState',
        payload: {
          showStopExecuteTaskPopwindow: false
        }
      })
    },

    *restartExecuteTask({ payload }, { select, call, put }) {
      let url = `/app/new-task-schedule/executor?ajax=retryJob&execid=${_.get(payload, 'first.executionId', '')}`
      let res = yield call(Fetch.get, url, null)
      if (res.status === 'restart success') {
        message.success('作业重跑成功')
        //TODO：需要重新调用请求屏幕接口
      } else {
        message.error('作业重跑失败')
      }
      yield put({
        type: 'changeState',
        payload: {
          showRestartExecuteTaskPopwindow: false
        }
      })
    },

    *queryTaskAllLog({ payload }, { select, call, put }) {
      const { execId } = payload
      let { singleLogMap } = yield select(state => state[namespace])
      singleLogMap = _.cloneDeep(singleLogMap)
      const {offset = 0, data = '' } = _.get(singleLogMap, 'all', {})
      let url = `/app/new-task-schedule/executor?ajax=fetchExecFlowLogs&execid=${execId}&offset=${offset}&length=${5000}`
      let res = yield call(Fetch.get, url, null)
      if (res.status === 'success') {
        _.set(singleLogMap, 'all.data', data + res.data) 
        _.set(singleLogMap, 'all.offset', offset + res.length) 
        yield put({
          type: 'changeState',
          payload: {
            singleLogMap
          }
        })
      } else {
        message.success('获取日志内容失败')
      }
    },

    *queryTaskLogTableList({ payload }, { select, call, put }) {
      const { execId, showLogPopWindow } = payload
      let url = `/app/new-task-schedule/executor?execid=${execId}&ajax=fetchexecflow`
      let res = yield call(Fetch.get, url, null)
      if (res && res.nodes.length > 0) {
        res.nodes = _.sortBy(res.nodes, p => p.startTime === -1 ? 9999999999999 : p.startTime)
        
        yield put({
          type: 'changeState',
          payload: {
            checkLogTableList: res,
            showLogPopWindow
          }
        })
      } else {
        message.success('查看日志失败')
      }
    },

    *fetchExecJobLogs({ payload }, { select, call, put }) {
      const { execId, jobId }  = payload
      let { singleLogMap } = yield select(state => state[namespace])
      singleLogMap = _.cloneDeep(singleLogMap)
      const {offset = 0, data = '' } = _.get(singleLogMap, jobId, {})
      let url = `/app/new-task-schedule/executor?execid=${execId}&jobId=${jobId}&ajax=fetchExecJobLogs&offset=${offset}&length=${500000000}`
      let res = yield call(Fetch.get, url, null)
      if (res.status === 'success') {
        _.set(singleLogMap, `${jobId}.data`, data + res.data) 
        _.set(singleLogMap, `${jobId}.offset`, offset + res.length) 
        yield put({
          type: 'changeState',
          payload: {
            singleLogMap
          }
        })
      } else {
        message.success('查看日志失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getRunningFlows', payload: {} })
      const { taskId } = opt.params
      if(taskId) {
        dispatch({ type: 'queryHistoryTask', payload: { projectId: taskId } })
      }
    }
  }
})
