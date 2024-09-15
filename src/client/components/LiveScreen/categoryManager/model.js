import Fetch from '../../../common/fetch-final'
import { message } from 'antd'
import _ from 'lodash'

export const namespace = 'livescreenCategoryModel'

export default () => ({
  namespace,
  state: {
    addCategoryModal: false,
    categoryName: '',
    categoryList: [],
    selectedCategoryId: undefined,
    deleteCategoryModal: '',
    showEditCategoryName: false,
    editInfo: {}
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
    *delete({ payload, cb }, { call, put }) {
      const { id } = payload
      let url = `/app/livescreen-category/delete/${id}`
      let res = yield call(Fetch.post, url, null)
      if (res && res.success) {
        message.success('删除成功')
        yield put({ type: 'list', payload: {} })
        cb && cb()
      } else {
        message.error('删除失败')
      }
    },
    /**
     * 获取表信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *list({ payload }, { call, select, put }) {
      let url = `/app/livescreen-category/list`
      let res = yield call(Fetch.get, url, null)
      if (res && res.success) {
        yield put({
          type: 'changeState',
          payload: {
            categoryList: res.result || []
          }
        })
      } else {
        message.error('获取分类失败!')
      }
    },

    *create({ payload, callback }, { select, call, put }) {
      let { categoryName } = yield select(state => state[namespace])
      let url = `/app/livescreen-category/create`
      let res = yield call(Fetch.post, url, { title: categoryName })
      if (res && res.success) {
        message.success('创建成功')
        yield put({ type: 'list', payload: {} })
        yield put({ type: 'changeState', payload: { addCategoryModal: false, categoryName: '' } })
      } else {
        callback && callback(res.message)
      }
    },

    *update({ payload }, { select, call, put }) {
      const { id, title } = payload
      let url = `/app/livescreen-category/update/${id}`
      let res = yield call(Fetch.post, url, { title })
      if (res && res.success) {
        message.success('修改成功')
        yield put({ type: 'list', payload: {} })
        yield put({ type: 'changeState', payload: { showEditCategoryName: false } })
      } else {
        message.error('操作失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'list', payload: {} })
    }
  }
})