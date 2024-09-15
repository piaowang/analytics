import { message } from 'antd'
import _ from 'lodash'
import { fetch, save, cancelAuthorize } from '../../../services/live-screen/role'

export let namespace = 'livescreenAuthorizationManager'

export const pageSize = 12
export default () => ({
  namespace,
  state: {
    // TODO create State
    editVisible: false,
    selectType: -1,
    selectTab: '',
    list: [],
    editId: '',
    searchName: '',
    searchStatus: undefined,
    empowerMeList: [],
    authorizeList: [],
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
    // 查询授权
    *queryList({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { searchName, searchStatus } = _.isEmpty(payload) ? yield effects.select(state => state[namespace]) : payload
      const res = yield effects.call(fetch)
      if (res && res.success) {
        let { empowerMe, authorize } = res.result
        if (searchName || searchStatus) {
          empowerMe = empowerMe.filter(p => {
            return (!searchName || _.includes(p.livescreen_name, searchName))
              && (searchStatus === undefined || p.status === searchStatus)
          })
          authorize = authorize.filter(p => {
            return (!searchName || _.includes(p.livescreen_name, searchName))
              && (searchStatus  === undefined || p.status === searchStatus)
          })
        }
        yield effects.put({ type: 'changeState', payload: { loading: false, empowerMeList: empowerMe, authorizeList: authorize, searchName, searchStatus } })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: true } })
        message.error('获取大屏列表失败')
      }
    },

    // 更新授权
    *updateAuthorization({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { writeRoles, readRoles, livescreenId } = payload
      const res = yield effects.call(save, writeRoles, readRoles, livescreenId)
      if (res && res.result) { 
        message.success('更新成功')
        yield effects.put({ type: 'queryList' })
        yield effects.put({ type: 'changeState', payload: { editVisible: false } })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: true } })
        message.error('更新失败')
      }
    },

    // 更新授权
    *cancelAuthorization({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { livescreenId } = payload
      const res = yield effects.call(cancelAuthorize, livescreenId)
      if (res && res.result) {
        message.success('撤销成功')
        yield effects.put({ type: 'queryList' })
      } else {
        message.error('撤销失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'queryList', payload: {} })
    }
  }
})
