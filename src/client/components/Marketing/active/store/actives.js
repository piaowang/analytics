import * as actsService from 'client/services/marketing/acts'
import _ from 'lodash'

/**
 *活动分组
 */
export default {
  namespace: 'marketingActives',
  state: {
    loading: false,
    page: 1,
    pageSize: 10,
    count: 0,
    editResultProjectModalVisible: false,
    activesList: [],
    selectedItem: {},
    mes: {
      status: null,
      content: ''
    },
    actGroups: [],
    filter: {}
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
    *getList({ payload }, { call, select, put }) {
      yield put({
        type: 'change',
        payload: {
          loading: true
        }
      })
      let filter = yield select(state => state.marketingActives.filter)
      Object.assign(payload, {
        where: {
          ...filter
        }
      })

      // 查询所有分组列表
      yield put({ type: 'getActGroups' })

      const res = yield call(actsService.get, payload)
      if (res.success) {
        const {page, pageSize} = payload
        const { rows, count } = _.get(res, 'result')
        yield put({type: 'change', payload: {
          activesList: rows,
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
    *update({ payload }, { call, select, put }) {
      const { success, message } = yield call(actsService.update, payload)
      if (success) {
        const { page, pageSize } = yield select(state => state.marketingActives)
        yield put({type: 'getList', payload: { page, pageSize }})
        yield put({type: 'change', payload: {
          selectedItem: {}, editResultProjectModalVisible: false, mes: { status: 'success', content: '更新成功'}
        }})
      } else { 
        yield put({type: 'change', payload: { mes: { status: 'error', content: message } }})
      }
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, search } = history.getCurrentLocation()
      // 可以做异步加载数据处理
      if (pathname.includes('/console/marketing-acts')) {
        dispatch({
          type: 'getList',
          payload: {
            page: 1,
            pageSize: 10,
            group_id: search.replace('?', '')
          }
        })
      }
    }
  }
}
