import { message } from 'antd'
import _ from 'lodash'
import { del, cancel, getSendList, getExamineList, examine } from '../../services/examine'

export const namespace = 'sugoExamine'
export const pageSize = 12
export default opt => ({
  namespace,
  state: {
    // TODO create State
    editVisible: false,
    selectTab: 'send',
    list: [],
    searchName: undefined,
    searchStatus:  undefined,
    editInfo: {},
    examineVisible: false
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
    // 查询列表
    *queryList({ payload }, effects) {
      const { searchName, searchStatus, selectTab: stateSelectTab } = yield effects.select(state => state[namespace])
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const selectTab = _.get(payload, 'selectTab', stateSelectTab)
      const { modelType } = opt
      const res = yield effects.call(selectTab === 'send' ? getSendList : getExamineList, modelType)
      if (res && res.success) {
        const list = res.result.filter(p => (!searchName || _.includes(p.model_name, searchName)) && ((!searchStatus&&searchStatus!==0) || p.status === searchStatus))
        yield effects.put({ type: 'changeState', payload: { loading: false, list, examineVisible: false, selectTab } })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: true } })
        message.error('获取授权列表报错')
      }
    },

    // 取消审核
    *cancel({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id } = payload
      const res = yield effects.call(cancel, id)
      if (res && res.result) {
        message.success('操作成功')
        yield effects.put({ type: 'queryList' })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: true } })
        message.error('取消失败')
      }
    },
    *delete({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id } = payload
      const res = yield effects.call(del, id)
      if (res && res.result) {
        message.success('操作成功')
        yield effects.put({ type: 'queryList' })
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: true } })
        message.error('删除失败')
      }
    },

    // 审核操作
    *examine({ payload }, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      const { id, examineStatus, message: msg } = payload
      const res = yield effects.call(examine, id, examineStatus, msg)
      if (res && res.result) {
        message.success('操作成功', yield effects.put({ type: 'queryList' }))
      } else {
        yield effects.put({ type: 'changeState', payload: { loading: true } })
        message.error('审核操作处理失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'queryList', payload: {} })
    }
  }
})
