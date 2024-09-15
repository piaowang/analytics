import Fetch from '../../common/fetch-final'
import { message } from 'antd'
import { sendJSON, recvJSON } from '../../common/fetch-utils'

import _ from 'lodash'

export const namespace = 'businessLineManagement'


export const pageSize = 12
export default () => ({
  namespace,
  state: {
    dataSource: []
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
    *delete({ payload: data ,resetDataCallback, successCallback}, { select, call, put }) {
      let url
      let params = {
        ...data
      }
      url = '/app/businesslinemanage/delete'

      let res = yield call(Fetch.post, url, params)
      if (res&&res.code === 200) {
        message.success('操作成功')
        yield put({
          type: 'list',
          payload:null,
          callback:resetDataCallback
        })
        successCallback()
      } else {
        message.success('操作失败，请重试')
      }
    },
    /**
     * 获取表信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *list({ payload, callback }, { call, select, put }) {
      let info = []
      let url = '/app/businesslinemanage/list'
      let res = yield call(Fetch.get, url, null)
      if (res&&res.code === 200) {
        info = res.result
        callback(info)
      } else {
        message.error('获取数据库表信息失败!')
        yield put({
          type: 'changeState', payload: {
            dataSource: []
          }
        })
      }
      yield put({
        type: 'changeState',
        payload: {
          dataSource: info
        }
      })
      if (_.isFunction(callback)) {
        callback(info)
      }
    },

    *save({ payload: data,resetDataCallback, successCallback }, { select, call, put }) {
      let url
      let params = {
        ...data
      }
      url = '/app/businesslinemanage/create'

      let res = yield call(Fetch.post, url, params)
      if (res&&res.code === 200) {
        message.success('操作成功')
        yield put({
          type: 'list',
          payload:null,
          callback:resetDataCallback
        })
        successCallback()
      } else {
        message.success('操作失败，请重试')
      }
      
    },

    *update({ payload: data,resetDataCallback, successCallback }, { select, call, put }) {
      let url
      let params = {
        ...data
      }
      url = '/app/businesslinemanage/update'

      let res = yield call(Fetch.post, url, params)
      if (res&&res.code === 200) {
        message.success('操作成功')
        yield put({
          type: 'list',
          payload:null,
          callback:resetDataCallback
        })
        successCallback()
      } else {
        message.success('操作失败，请重试')
      }
      
    }
  }
})
