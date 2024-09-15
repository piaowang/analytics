import _ from 'lodash'
import * as marketingTaskService from 'client/services/marketing/task'


export const namespace = 'marketingTask'

export default {
  namespace,
  state: {
    page: 1,
    pageSize: 10,
    count: 0,
    loading: true,
    taskList: [],
    filter: {},
    expandedRowKeys: [],
    expandedRows: {
      /*
        [key]: {
          loaded: false, // 是否已加载过一次
          list: [], //事件任务执行列表
          pageSize: 10,
          offset: 0
        }
      */
    }
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    * list({ payload }, { call, select, put }) {
      yield put({
        type: 'change',
        payload: {
          loading: true
        }
      })
      let filter = yield select(state => state.marketingTask.filter)
      Object.assign(payload, {
        where: {
          ...filter
        }
      })
      const { result, success } = yield call(marketingTaskService.list, payload)
      if (success) {
        const { rows, count } = result
        const { page, pageSize } = payload
        yield put({
          type: 'change',
          payload: {
            taskList: rows,
            count,
            page,
            pageSize
          }})
      }
      yield put({
        type: 'change',
        payload: {
          loading: false
        }
      })
    },
    * downloadRecord({ payload }, { call, put }) {
      const { id: task_id, execute_id, record } = payload
      const { result, success } = yield call(marketingTaskService.getOneDetails, task_id, { execute_id })
      if (success) {
        yield call(marketingTaskService.downLoadFile, result, record)
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({type: 'list', payload: { page: 1, pageSize: 10}})
    }
  }
}
