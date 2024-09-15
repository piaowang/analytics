import Fetch from '../../../common/fetch-final'
import { message } from 'antd'
import { recvJSON } from '../../../common/fetch-utils'
import { toQueryParams, tryJsonParse } from '../../../../common/sugo-utils'
import _ from 'lodash'

export const namespace = 'execute-manage-v366'

export const pageSize = 12
export default opt => ({
  namespace,
  state: {
    showLogPopWindow: false,
    showStopExecuteTaskPopwindow: false,
    showRestartExecuteTaskPopwindow: false,
    data: {},
    searchProjectIds: '',
    searchProjectName: '',
    searchTaskName: '',
    searchStartTime: '',
    searchEndTime: '',
    searchStatus: '',
    pageStatus: 1, //0:正在执行 1：执行历史
    checkAllLogContext: {}, //查看日志中的全部日志返回内容
    checkLogTableList: {}, //查看日志的tablelist
    //每个任务的单独日志
    singleLogMap: {},
    historyPageIndex: 0,
    historyList: [],
    runningList: [],
    totalNum: 0,
    pageIndex: 1,
    groupPageIndex: 1,
    groupTotalNum: 0,
    groupHistoryList: [],
    selectedKeys: [],
    pList: [],
    pgList: [],
    userList: []
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
    *queryAllUser({ payload }, { call, put }) {
      let url = '/app/user/get'
      const response = yield call(Fetch.get, url, payload)
      const { result = [] } = response
      if (result && result.length) {
        yield put({
          type: 'changeState',
          payload: {
            userList: result
          }
        })
      }
    },
    *queryAllTaskId({ payload }, { call, put }) {
      let url = '/app/task-schedule-v3/get-all-task'
      const response = yield call(Fetch.get, url, payload)
      const { result = [], success } = response
      if (success) {
        yield put({
          type: 'changeState',
          payload: {
            pList: result
          }
        })
      }
    },

    *queryAllGroupTaskId({ payload }, { call, put }) {
      let url = '/app/task-schedule-v3/get-all-group-task'
      const response = yield call(Fetch.get, url, payload)
      const { result = [], success } = response
      if (success) {
        yield put({
          type: 'changeState',
          payload: {
            pgList: result
          }
        })
      }
    },
    /**
     * 获取执行中的任务
     * @param {*} param0
     * @param {*} param1
     */
    *getRunningFlows({ payload }, { select, call, put }) {
      let url = `/app/task-schedule-v3/history?action=getRunningFlows&creator=${window.sugo.user.type === 'built-in' ? '' : window.sugo.user.id}`
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
     * 获取执行中的组任务
     * @param {*} param0
     * @param {*} param1
     */
    *getGroupRunningFlows({ payload }, { select, call, put }) {
      let url = `/app/task-schedule-v3/history?action=getRunningFlows&type=group&creator=${window.sugo.user.type === 'built-in' ? '' : window.sugo.user.id}`
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
     * 获取执行历史
     * @param {*} param0
     * @param {*} param1
     */
    *queryHistoryTask({ payload }, { select, call, put }) {
      const { page = 1, size = 10, typeId, projectId, projectIds, flowcontain, status, begin, end, orderby = 'end_time', order = 'desc' } = payload
      let url = `/app/task-schedule-v3/history`
      const { selectedKeys } = yield select(p => p[namespace])
      const selectKey = _.get(selectedKeys, '0', '')
      let params = {
        page,
        size,
        typeId,
        projectId: projectId || selectKey,
        projectIds,
        flowcontain,
        status,
        begin,
        end,
        orderby,
        order,
        creator: window.sugo.user.type === 'built-in' ? '' : window.sugo.user.id
      }
      params = _.pickBy(params, _.identity)
      params = toQueryParams(params)
      const res = yield call(Fetch.get, `${url}?action=fetchAllHistory&${params}`, null)
      if (_.get(res, 'status', '') === 'success') {
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

    /**
     * 获取执行组的历史
     * @param {*} param0
     * @param {*} param1
     */
    *queryGroupHistoryTask({ payload }, { select, call, put }) {
      const { page = 1, size = 10, typeId, projectId, projectIds, flowcontain, status, begin, end, orderby = 'end_time', order = 'desc' } = payload
      let url = '/app/task-schedule-v3/history'
      const { selectedKeys } = yield select(p => p[namespace])
      const selectKey = _.get(selectedKeys, '0', '')
      let params = {
        page,
        size,
        typeId,
        projectId: selectKey,
        projectIds,
        flowcontain,
        status,
        begin,
        end,
        orderby,
        order,
        type: 'group',
        creator: window.sugo.user.type === 'built-in' ? '' : window.sugo.user.id
      }

      params = _.pickBy(params, _.identity)
      params = toQueryParams(params)
      const response = yield call(Fetch.get, `${url}?action=fetchAllHistory&${params}`, null)

      const { status: isSuccess, historyFlows = [], totalNum = 0, pageNum = 1, pageSize } = response
      if (isSuccess === 'success') {
        const list = historyFlows.map(({ first, second }) => ({
          id: _.get(first, ['executionId']),
          identifier: _.get(first, ['id']),
          showName: _.get(first, ['showName']),
          executeNum: _.get(first, ['executionId']),
          executer: _.get(second, ['host']),
          startTime: _.get(first, ['startTime']),
          endTime: _.get(first, ['endTime']),
          useTime: _.get(first, ['endTime'], 0) - _.get(first, ['startTime'], 0),
          businessTime: _.get(first, ['businessTime']),
          tag: _.get(first, ['status']),
          target: first
        }))

        yield put({
          type: 'changeState',
          payload: {
            groupHistoryList: list,
            pageStatus: 1,
            groupTotalNum: totalNum,
            groupPageIndex: page,
            ...payload
          }
        })
      } else {
        message.error('获取失败!')
      }
    },

    *stopExecuteTask({ payload }, { select, call, put }) {
      const { execId } = payload
      let url = '/app/task-schedule-v3/executor?action=cancelFlow'
      let res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ execid: execId })
      })
      if (!res.error) {
        message.success('作业停止成功')
        yield put({
          type: 'getRunningFlows',
          payload: {}
        })
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
      const execId = _.get(payload, 'first.executionId', '') || _.get(payload, 'executeNum', '')
      let url = '/app/task-schedule-v3/executor?action=retryJob'
      let res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ execid: execId })
      })
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
    //TODO: 多个线程的重跑，应该由后台去操作
    *restartExexuteTaskList({ payload, callback }, { select, call, put }) {
      // 如果有的话，则多次递归调用自己
      if (payload.length > 0) {
        const execId = _.get(payload[0], 'first.executionId', '') || _.get(payload[0], 'executeNum', '')
        let url = '/app/task-schedule-v3/executor?action=retryJob'
        let res = yield call(Fetch.post, url, null, {
          ...recvJSON,
          body: JSON.stringify({ execid: execId })
        })
        if (res.status === 'restart success') {
          // 重跑成功，继续下一个
          payload.shift()
          if (payload.length === 0) {
            message.success('重跑成功!')
            callback && callback()
            return
          }
          yield put({
            type: 'restartExexuteTaskList',
            payload: payload,
            callback
          })
        } else {
          message.error('作业重跑失败')
          callback && callback()
        }
      }
    },

    *restartExecuteFailTask({ payload }, { select, call, put }) {
      const execId = _.get(payload, 'first.executionId', '') || _.get(payload, 'executeNum', '')
      const skipWaitNode = _.get(payload, 'skipWaitNode', false)
      let url = `/app/task-schedule-v3/executor?execid=${execId}&action=fetchExecflowGroup`
      let res = yield call(Fetch.get, url, null)
      const list = []
      if (res && res.nodes && res.nodes.length > 0) {
        _.forEach(res.nodes, item => {
          if (item.status === 'SUCCEEDED' || item.status === 'SKIPPED' || (skipWaitNode && item.type === 'nodeWait')) {
            list.push(item.id)
          }
        })
      }

      url = '/app/task-schedule-v3/executor?action=retryJob'
      res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ execid: execId, disabled: list })
      })
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
      const { offset = 0, data = '' } = _.get(singleLogMap, 'all', {})
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

    *queryTaskGroupAllLog({ payload }, { select, call, put }) {
      const { execId, showLogPopWindow } = payload
      let url = `/app/task-schedule-v3/executor?execid=${execId}&action=fetchExecflowGroup`
      let res = yield call(Fetch.get, url, null)
      if (res && res.nodes && res.nodes.length > 0) {
        res.nodes = _.sortBy(res.nodes, p => (p.startTime === -1 ? 9999999999999 : p.startTime))
        const list = []
        _.forEach(res.nodes, item => {
          if (item.data && item.data.nodes && item.data.nodes.length) {
            list.push(..._.map(item.data.nodes, d => ({ ...d, execid: item.data.execId, taskName: item.showName, taskGroupName: res.showName })))
          } else {
            list.push({ ...item, execid: res.execId, taskName: '', taskGroupName: res.showName })
          }
        })
        res.nodes = list
        res.group = true
        yield put({
          type: 'changeState',
          payload: {
            checkLogTableList: res,
            showLogPopWindow
          }
        })
      } else {
        message.error('查看日志失败')
      }
    },

    *queryTaskLogTableList({ payload }, { select, call, put }) {
      const { execId, showLogPopWindow } = payload
      let url = `/app/task-schedule-v3/executor?execid=${execId}&action=fetchexecflow`
      let res = yield call(Fetch.get, url, null)
      if (res && res.nodes && res.nodes.length > 0) {
        res.nodes = _.sortBy(res.nodes, p => (p.startTime === -1 ? 9999999999999 : p.startTime))
        res.nodes = _.map(res.nodes, item => ({ ...item, execid: res.execid, taskName: res.showName }))
        yield put({
          type: 'changeState',
          payload: {
            checkLogTableList: res,
            showLogPopWindow
          }
        })
      } else {
        message.error('查看日志失败')
      }
    },

    *fetchExecJobLogs({ payload }, { select, call, put }) {
      const { execId, jobId } = payload
      let { singleLogMap } = yield select(state => state[namespace])
      singleLogMap = _.cloneDeep(singleLogMap)
      const { offset = 0, data = '' } = _.get(singleLogMap, jobId, {})
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
      dispatch({ type: 'queryAllTaskId' })
      dispatch({ type: 'queryAllGroupTaskId' })
      dispatch({ type: 'queryAllUser' })

      if (opt.location.query.taskid) {
        dispatch({ type: 'changeState', payload: { selectedKeys: [opt.location.query.taskid] } })
      }
    }
  }
})
