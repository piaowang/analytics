import { message } from 'antd'
import Fetch from '../../../common/fetch-final'
import _ from 'lodash'

// export const namespace = 'share-manager'
const modelUrl = '/app/share-manager/'

export default (props) => ({
  namespace:props.namespace,
  state: {
    tableData: {rows: [], count: 0 },
    isShowEditModal: false,
    shareInfo: {}
  },
  reducers: {
    changeState(state, {payload }) {
      return {...state, ...payload }
    }
  },
  sagas: {
    *getTableData({payload = {}}, {call, put }) {
      const {result: {rows = [], count = 0 }, success } = yield call(Fetch.get, `${modelUrl}getShareList`, payload)
      if(success) {
        const res = rows.map( o => (
          _.omit({...o, screen_title: _.get(o,'SugoLiveScreen.title')} , ['SugoLiveScreen'])
        ))
        yield put({
          type: 'changeState',
          payload: {tableData: {rows: res, count }}
        })
        return
      }
      return message.error('获取分享列表失败')
    },
    *getShareById({payload = {}}, {call, put }) {
      const {result, success } = yield call(Fetch.get, `${modelUrl}getShareById`, payload)
      if(success) {
        return  yield put({
          type: 'changeState',
          payload: {shareInfo: result }
        })
      }
      return message.error('获取分享信息失败')
    },
    *saveShareInfo({payload = {}, callback }, {call, put}) {
      const { success } = yield call(Fetch.post, `${modelUrl}saveShareInfo`, payload)
      if(success) {
        callback && callback()
        return  message.success('保存成功')
      }
      return message.error('获取分享信息失败')
    },
    *cancelShare({payload = {}, callback}, {call, put}) {
      const { success } = yield call(Fetch.get, `${modelUrl}cancelShare`, payload)
      if(success) {
        callback && callback()
        return  message.success('取消分享成功')
      }
      return message.error('取消分享失败')
    },
    *deleteShare({payload = {}, callback}, {call, put}) {
      const { success } = yield call(Fetch.get, `${modelUrl}deleteShare`, payload)
      if(success) {
        callback && callback()
        return  message.success('删除成功')
      }
      return message.error('删除失败')
    }
  }
})
