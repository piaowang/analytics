import _ from 'lodash'
import * as resultService from 'client/services/market-brain/result'
import { message } from 'antd'

export const namespace = 'marketBrainResult'

export default {
  namespace,
  state: {
    baseInfo: {}
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
    *fetchResult({ payload: { id } }, { call, put, select }) {
      let res = yield call(resultService.fetchResult, id)
      if (!res.success) {
        return message.error('该活动预设属性不全')
      }
      yield put({
        type: 'change',
        payload: {
          baseInfo: res.result
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query: { id } } = history.getCurrentLocation()
      if (pathname === '/console/market-brain-acts/result') {
        dispatch({ type: 'fetchResult', payload: { id } })
      }
    }
  }
}
