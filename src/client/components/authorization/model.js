import { message } from 'antd'
import _ from 'lodash'
import { get, save } from '../../services/authorization'

export const namespace = 'livescreenAuthorization'

export const pageSize = 12
export default opt => ({
  namespace,
  state: {
    // TODO create State
    list: []
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
    // 更新授权
    *updateAuthorization({ payload, cb }, effects) {
      const { writeRoles, readRoles } = payload
      const res = yield effects.call(save, writeRoles, readRoles, opt.modelType, opt.modelId )
      if (res && res.success) {
        message.success('授权成功')
        cb && cb()
      } else {
        message.error('授权失败')
      }
    },
    *getAuthorization({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const res = yield effects.call(get, opt.modelType, opt.modelId )
      if (res && res.success) {
        yield effects.put({ type: 'changeState', payload: { list: res.result || [] } })
      } else {
        message.error('获取失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getAuthorization', payload: {} })
    }
  }
})
