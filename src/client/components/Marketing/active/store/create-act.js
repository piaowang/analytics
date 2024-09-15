import * as actsService from 'client/services/marketing/acts'

/**
 *活动分组
 */
export default {
  namespace: 'marketingCreateAct',
  state: {
    actGroups: [],
    userGroups: [],
    item: {}
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
    *getUserGroups({ payload }, { call, put }) {
      const { result } = yield call(actsService.getUserGroups, payload)
      if (result) {
        yield put({
          type: 'change',
          payload: {
            userGroups: result
          }
        })
      }
    },
    *getActGroups(action, { call, put }) {
      const { result, success } = yield call(actsService.getActGroups)
      if (success) {
        yield put.resolve({
          type: 'change',
          payload: {
            actGroups: result
          }
        })
      }
    },
    *initEidtData({ payload: id }, { call, put }) {
      const { result: item = {} } = yield call(actsService.getOne, id)
      yield put.resolve({
        type: 'change',
        payload: {
          item
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query: { id } } = history.getCurrentLocation()
      // 加载活动分组列表
      dispatch({ type: 'getActGroups' })
      if (pathname.includes('/console/marketing-acts/new') && id) {
        dispatch({
          type: 'initEidtData',
          payload: id
        })
      }
    }
  }
}
