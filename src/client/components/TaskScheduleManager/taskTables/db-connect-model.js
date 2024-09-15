import Fetch from '../../../common/fetch-final'
import {message} from 'antd'

export const namespace = 'dbConnect'

export const pageSize = 12
export default {
  namespace,
  state: {
    editPopWindowVisible: false,
    offset: 0,
    limit: 10,
    data: {},
    dataSource: [],
    sum: 0,
    search: '',
    deletePopWindowVisible:false

  },
  reducers: {
    changeState(state, {payload}) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    * delete({payload: id}, {select, call, put}) {
      let {offset, limit} = yield select(state => state[namespace])
      let res = yield call(Fetch.post, '/app/dbconnectsetting/delete', id)
      if (res.success) {
        message.success('删除数据库连接成功')
        yield put({
          type: 'changeState',
          payload: {
            deletePopWindowVisible: false
          }
        })
        yield put({
          type: 'queryList',
          payload: {
            search: '',
            limit,
            offset:0
          }
        })
      }
    },

    * save({payload: data}, {select, call, put}) {
      let {limit} = yield select(state => state[namespace])
      let res
      if (data.id) { // 编辑
        res = yield call(Fetch.post, '/app/dbconnectsetting/update', data)
      } else {
        // 新增
        res = yield call(Fetch.post, '/app/dbconnectsetting/create', data)
      }
      if (res.success) {
        message.success('操作数据库连接成功')
        yield put({
          type: 'changeState',
          payload: {
            editPopWindowVisible: false
          }
        })
        yield put({
          type: 'queryList',
          payload: {
            search: '',
            limit,
            offset:0
          }
        })
      }
    },

    * queryList(action, effects) {
      const res = yield effects.call(Fetch.get, '/app/dbconnectsetting/list', action.payload)
      if (res.success) {
        const {rows, count} = res.result
        yield effects.put({
          type: 'changeState',
          payload: {
            dataSource: rows,
            sum: count
          }
        })
      } else {
        message.error('刷新列表失败，请重试')
      }
    }

  },
  subscriptions: {
    init({dispatch, history}) {
      const {pathname} = history.getCurrentLocation()
      // 可以做异步加载数据处理
      if (pathname.includes('/console/heat-map')) {
        dispatch({type: 'queryHeatMapList', payload: {}})
      }
    }
  }
}

