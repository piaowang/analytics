import * as marketingActsServices from 'client/services/marketing/acts.js'
import _ from 'lodash'

/**
 *活动分组
 */
export default {
  namespace: 'marketingActResult',
  state: {
    resultSet: {},
    eventInfo: {},
    lineChartResult: {},
    selectedMetric: 'revisit_total'
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
    *fetch({ payload }, { put, call, select }) {
      const { result, success } = yield call(marketingActsServices.getResult, payload)
      if (success) {
        yield put({
          type: 'change', 
          payload: result
        })
      }
    },
    *getResult({ payload }, { call, select, put }) {
      const { result, success } = yield call(marketingActsServices.getResult, payload)
      if (success) {
        yield put({
          type: 'change', 
          payload: { result }
        })
      }
    },
    *getLine({ payload }, { call, select, put }) {
      const { success, result } = yield call(marketingActsServices.getLine, payload)
      if (success) {
        yield put({
          type: 'change',
          payload: {
            lineSet: result
          }
        })
      }
    },
    *save({ payload }, { call, select, put }) {

    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, search, query } = history.getCurrentLocation()
      const { id } = query
      if (pathname.includes('/console/marketing-acts') && id) {
        dispatch({type: 'fetch', payload: { id }})
      }
    }
  }
}
