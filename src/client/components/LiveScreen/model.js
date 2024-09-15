import Fetch from '../../common/fetch-final'
import { message } from 'antd'
import _ from 'lodash'
import { remoteUrl } from '../../constants/interface'
import { create } from '../../services/examine'
import { EXAMINE_TYPE } from '~/src/common/constants'

export const namespace = 'liveScreenModel'

export const pageSize = 12
export default () => ({
  namespace,
  state: {
    editLiveScreenVisible: false,
    addModalVisible: false,
    addType: 0,
    categoryList: [],
    selectedCategoryId: '',
    shares: [],
    selectType: -1,
    filterKey: '',
    sortType: 'default',
    recycle: false,
    loading: false,
    list: [],
    editId: '',
    publishList: []
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
    // 查询大屏列表
    *queryList({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const res = yield effects.call(Fetch.get, remoteUrl.GET_LIVESCREENS)
      if (res && res.result) {
        yield effects.put({ type: 'changeState', payload: { loading: false, list: res.result } })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('获取大屏列表失败')
      }
    },

    // 查询以发布大屏列表
    *queryPublishList({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const res = yield effects.call(Fetch.get, remoteUrl.GET_LIVESCREENSPUBLISH)
      if (res && res.result) {
        yield effects.put({ type: 'changeState', payload: { loading: false, publishList: res.result } })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('获取已发布大屏列表失败')
      }
    },

    // 添加大屏
    *addLiveScreen({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const res = yield effects.call(Fetch.post, remoteUrl.ADD_LIVESCREEN, payload)
      if (res && res.result) {
        message.success('添加成功')
        yield effects.put({ type: 'queryList' })
        yield effects.put({ type: 'changeState', payload: { addModalVisible: false } })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('添加失败')
      }
    },

    // 更新大屏
    *updateLiveScreen({ payload, cb }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id, values } = payload
      const livescreen = { id, ...values }
      const res = yield effects.call(Fetch.post, remoteUrl.UPDATE_LIVESCREEN, { livescreen })
      if (res && res.result) {
        yield effects.put({ type: 'queryList' })
        yield effects.put({ type: 'changeState', payload: { editLiveScreenVisible: false } })
        cb && cb()
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('获取大屏列表失败')
      }
    },

    // 移入回收站
    *recycleLiveScreen({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id, isPublish } = payload
      const res = yield effects.call(Fetch.delete, `${remoteUrl.RECYCLE_LIVESCREEN}/${id}`, { isPublish })
      if (res && res.result) {
        yield effects.put({ type: isPublish ? 'queryPublishList' : 'queryList' })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('获取大屏列表失败')
      }
    },

    // 移出回收站
    *reductionLiveScreen({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id, isPublish } = payload
      const res = yield effects.call(Fetch.put, `${remoteUrl.REDUCTION_LIVESCREEN}/${id}`, { isPublish })
      if (res && res.result) {
        yield effects.put({ type: isPublish ? 'queryPublishList' : 'queryList' })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('获取大屏列表失败')
      }
    },
    
    // 删除一个大屏
    *removeLiveScreen({ payload, cb }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id } = payload
      const res = yield effects.call(Fetch.delete, `${remoteUrl.DELETE_LIVESCREEN}/${id}`)
      if (res && res.result) {
        yield effects.put({ type: 'queryList' })
        cb && cb()
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('删除大屏失败')
      }
    }, // 删除一个大屏

    *removeLiveScreenPublish({ payload, cb }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id } = payload
      const res = yield effects.call(Fetch.delete, `${remoteUrl.DELETE_LIVESCREENPUBLISH}/${id}`)
      if (res && res.result) {
        yield effects.put({ type: 'queryPublishList' })
        cb && cb()
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('删除大屏失败')
      }
    },

    *cleanRecycle ({ payload, cb }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const res = yield effects.call(Fetch.post, `${remoteUrl.CLEAN_RECYCLE_LIVESCREEN}`)
      if (res && res.result) {
        yield effects.put({ type: 'queryPublishList' })
        yield effects.put({ type: 'queryList' })
        cb && cb()
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('删除大屏失败')
      }
    },


    // 复制一个大屏
    *copyLiveScreen({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id } = payload
      const res = yield effects.call(Fetch.post, `${remoteUrl.COPY_LIVESCREEN}/${id}`)
      if (res && res.result) {
        yield effects.put({ type: 'queryList' })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: false } })
        message.error('获取大屏列表失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'queryList', payload: {} })
      dispatch({ type: 'queryPublishList', payload: {} })
    }
  }
})
