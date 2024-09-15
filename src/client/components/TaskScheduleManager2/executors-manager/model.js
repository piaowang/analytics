import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'

export const namespace = 'executorsModel'

export default () => ({
  namespace,
  state: {
    showEidtExecutors: false,//新增添加任务
    showExecutorInfo: false,
    executors: [],
    selectExecutorInfo: {},
    searchKey: '',
    serverStatistics: {}
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
    *deleteExecutor({ payload }, { call, select, put }) {
      const { id } = payload
      let url = `/app/task-schedule/executors?action=delete&id=${id}`
      let res = yield call(Fetch.post, url, {})
      if (!res.error) {
        yield put({ type: 'getScheduleExecutors', payload: {} })
        yield put({ type: 'changeState', payload: { showEidtExecutors: false } })
      } else {
        message.error('删除失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *saveExecutor({ payload }, { call, select, put }) {
      const { id, port, active, host } = payload
      let url = `/app/task-schedule/executors?action=add&host=${host}&port=${port}&active=${active}`
      if (id) {
        url = `/app/task-schedule/executors?action=edit&id=${id}&host=${host}&port=${port}&active=${active}`
      }
      let res = yield call(Fetch.post, url, {})
      if (!res.error) {
        yield put({ type: 'getScheduleExecutors', payload: {} })
        yield put({ type: 'changeState', payload: { showEidtExecutors: false } })
      } else {
        message.error(`${id ? '修改' : '添加'}失败!`)
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *getServerStatistics({ payload }, { call, select, put }) {
      const { host, port } = payload
      const url = '/app/new-task-schedule/getServerStatistics'
      const res = yield call(Fetch.get, url, payload)
      if (res && res.success ) {
        yield put({
          type: 'changeState',
          payload: {
            serverStatistics: {
              ...res.result,
              host,
              port
            }
          }
        })
      } else {
        message.error('获取执行器信息失败!')
      }
    },
    *getScheduleExecutors({ payload }, { call, select, put }) {
      let url = '/app/task-schedule/executors?action=getAllExecutors'
      let res = yield call(Fetch.get, url, null)
      if (res && res.executors) {
        yield put({
          type: 'changeState',
          payload: {
            executors: _.orderBy(res.executors, p => !p.id)
          }
        })
      } else {
        message.error('获取执行器信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getScheduleExecutors', payload: {} })
    }
  }
})
