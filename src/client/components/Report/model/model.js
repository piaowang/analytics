/*
 * @Author: xuxinjiang
 * @Date: 2020-06-22 09:50:41
 * @LastEditTime: 2020-06-22 20:38:30
 * @LastEditors: Please set LastEditors
 * @FilePath: \sugo-analytics\src\client\components\Report\model.js
 */
import Fetch from 'client/common/fetch-final'

export const namespace = 'reportModel'
export default {
  namespace,
  state: {
    list: [],
    total: 0
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
    *getData({ payload }, { call, put }) {
      window.sugo.$loading.show()
      const res = yield call(Fetch.post, '/app/mannings/list', { ...payload })
      yield put({
        type: 'changeState',
        payload: {
          list: res.result.rows,
          total: res.result.count
        }
      })
      window.sugo.$loading.hide()
    }
  }
}
