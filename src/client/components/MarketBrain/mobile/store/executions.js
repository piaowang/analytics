import _ from 'lodash'
import * as marketBrainExecutionService from 'client/services/market-brain/executions'


export const namespace = 'marketBrainH5Executions'

export default {
  namespace,
  state: {
    page: 1,
    pageSize: 10,
    count: 0,
    loading: true,
    executionList: []
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

      let staff_id = _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id)

      const { result, success } = yield call(marketBrainExecutionService.getExecutionsByMaxDate, staff_id)
      if (success) {
        // const { page, pageSize } = payload
        yield put({
          type: 'change',
          payload: {
            executionList: result
            // count,
            // page,
            // pageSize
          }})
      }
      yield put({
        type: 'change',
        payload: {
          loading: false
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({type: 'list', payload: { page: 1, pageSize: 10}})
    }
  }
}
