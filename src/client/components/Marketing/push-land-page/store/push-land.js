import * as pushLandService from 'client/services/marketing/push-land-page'
import _ from 'lodash'

/**
 *活动分组
 */
export default {
  namespace: 'marketingPushLandPage',
  state: {
    createRecordModalVisible: false,
    pushLandList: [],
    loading: false,
    page: 1,
    pageSize: 10,
    count: 0,
    msg: '',
    item: {},
    name: ''
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
        loading: true
      })
      const name = yield select(state => state.marketingPushLandPage.name)
      if(name) Object.assign(payload, {
        where: {
          name
        }
      })
      const { result, success }  = yield call(pushLandService.getPushLandList, payload)
      if (success) {
        const {page, pageSize} = payload
        const { rows, count } = result
        yield put({
          type: 'change',
          payload: {
            pushLandList: rows,
            count,
            page,
            pageSize
          }
        })
      }
      yield put({
        type: 'change',
        loading: false
      })
    },
    *create({ payload }, { call, put}) {
      const { success, message } = yield call(pushLandService.create, payload)
      if (success) {
        yield put({type: 'change', payload: { createRecordModalVisible: false}})
        yield put({type: 'list', payload: { page: 1, pageSize: 10}})
      } else {
        yield put({type: 'change', payload: { msg: message }})
      }
    },
    *save({ payload }, { call, select, put }) {

    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      dispatch({type: 'list', payload: { page: 1, pageSize: 10 }})
    }
  }
}
