import Fetch from 'client/common/fetch-final'
import _ from 'lodash'

/**
 *活动分组
 */
export default {
  namespace: 'dataChecking',
  state: {
    // addModalVisible: false,
    // timeRange: [],
    // loading: false,
    // page: 1, 
    // pageSize: 10,
    // count: 0,
    // activeGroupsList: [],
    // getListByTime: false,
    // filter: {
    //   name: ''
    //   // create_range
    // },
    // createActGroupsModalVisible: false,
    // createActivePageVisible: false,
    // selectedGroup: '',
    // group_id: ''
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
    // *getList({ payload }, { call, put, select }) {
    //   yield put({
    //     type: 'change',
    //     payload: {
    //       loading: true
    //     }
    //   })
    //   const { filter } = yield select(state => state.marketingActGroups)
    //   const res = yield call(Fetch.get,'/app/marketing-act-groups/list', { ...payload, ...filter })
    //   if (res.success) {
    //     const { page, pageSize } = payload
    //     const { rows, count } = _.get(res, 'result')
    //     yield put({type: 'change', payload: {
    //       activeGroupsList: rows,
    //       count,
    //       page,
    //       pageSize
    //     }})
    //   }
    //   yield put({
    //     type: 'change',
    //     payload: {
    //       loading: false
    //     }
    //   })
    // }
  },
  subscriptions: {
    // init({ dispatch, history }) {
    //   const { pathname } = history.getCurrentLocation()
    //   // 可以做异步加载数据处理
    //   if (pathname.includes('/console/data-checking')) {
    //     dispatch({ type: 'getList', payload: { page: 1, pageSize: 10 } })
    //   }
    // }
  }
}
