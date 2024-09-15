import Fetch from '../../../common/fetch-final'
import _ from 'lodash'

export const namespace = 'tagDataManage'

export default opt => ({
  namespace,
  state: {
    historyData: [],
    historyCount: 0,
    pageSize: 10,
    pageIndex: 1,
    clearConfig: 0,
    oldClearConfig: 0,
    configVisible: false
  },
  reducers: {
    setList(state, { payload }) {
      const { data, count, pageIndex, searchKey } = payload
      return {
        ...state,
        historyData: data,
        historyCount: count,
        pageIndex,
        searchKey
      }
    },
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *getList(action, effects) {
      let { projectId, pageIndex, searchKey } = action.payload
      if(!projectId) {
        let { projectCurrent } = yield effects.select(state => _.get(state, ['sagaCommon'], {}))
        projectId = projectCurrent.id
      }
      const res = yield Fetch.get('/app/tag-hql/import-history/' + projectId, { pageSize: 10, pageIndex, searchKey })
      yield effects.put({ type: 'setList', payload: { data: res.result.rows, pageIndex, count: res.result.count, searchKey } })
    },
    *deleteHistory(action, effects) {
      const { id } = action.payload
      yield effects.call(Fetch.get, '/app/tag-hql/delete-history/' + id)
      yield effects.put({ type: 'getList', payload:action.payload })
      // this.sagas[tag-data-manage/getList](action, effects)
    },
    *getConfig(action, effects) {
      const res = yield effects.call(Fetch.get, '/app/tag-hql/clear-config/get')
      const clearConfig = _.get(res, 'result.value', '1')
      yield effects.put({ type: 'changeState', payload: { clearConfig, oldClearConfig: clearConfig } })
    },
    *saveConfig(action, effects) {
      const { clearConfig } = action.payload
      yield effects.call(Fetch.post, '/app/tag-hql/clear-config/set', { clearConfig })
      yield effects.put({ type: 'changeState', payload: { clearConfig, configVisible: false, oldClearConfig: clearConfig } })
    },
    *change(action, effects) {
      yield effects.put({ type: 'changeState', payload: action.payload })
    }
  },
  subscriptions: {
    init(params) {
      const { dispatch, history } = params
      const { pathname } = history.getCurrentLocation()
      if (pathname === '/console/tag-data-manage') { // 可以做异步加载数据处理
        dispatch({
          type: 'getList',
          payload: { projectId: _.get(opt, 'projectCurrent.id', ''), pageIndex: 1 }
        })
        dispatch({ type: 'getConfig' })
      }
    }
  }
})
