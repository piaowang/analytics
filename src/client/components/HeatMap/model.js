import Fetch from '../../common/fetch-final'
import { message } from 'antd'
import _ from 'lodash'
import { AccessDataType, AccessDataOriginalType } from '../../../common/constants'
import { APP_TYPE } from '../Track2/constants'

export const namespace = 'heatMap'

export const pageSize = 12
export default {
  namespace,
  state: {
    appType: undefined,
    heatMapList: [],
    pageIndex: 1,
    searchKey: '',
    loading: false,
    hasMore: true,
    tokens: [],
    showImportHeatmap: false,
    oldProjectId: ''
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
    // watchChangeProject: [
    //   function* (action, effects) {
    //     while (true) {
    //       const res = yield effects.takeLatest('sagaCommon/changeState')
    //       if (window.location.pathname !== '/console/heat-map') {
    //         console.log(`222222222222222222222222222222`, action)
    //         return
    //       }
    //       const { projectCurrent } = res.payload
    //       if (projectCurrent.access_type === AccessDataType.SDK) {
    //         yield effects.put({ type: 'queryHeatMapList', payload: { projectCurrent } })
    //       } else {
    //         yield effects.put({ type: 'changeState', payload: { showAccessTypeTip: true } })
    //       }
    //     }
    //   },
    //   { type: 'watcher' }
    // ],

    *queryHeatMapList(action, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      let { projectCurrent, pageIndex = 1, appType, searchKey } = action.payload
      if (!projectCurrent) {
        let sagaCommon = yield effects.select(state => state['sagaCommon'])
        projectCurrent = sagaCommon.projectCurrent
      }
      let { id: projectId, datasource_id } = projectCurrent
      let { searchKey: stateSearchKey, appType: stateApptype = APP_TYPE.android, heatMapList, tokens, oldProjectId } = yield effects.select(state => state[namespace])
      appType = appType || stateApptype
      searchKey = pageIndex === 1 ? searchKey : stateSearchKey
      if (!tokens.length || oldProjectId !== _.get(projectCurrent, 'id', '')) {
        const resTokens = yield effects.call(Fetch.get, '/app/project/tables', { project_id: projectId })
        tokens = _.get(resTokens, 'result.model', [])
          .filter(p => p.access_type === AccessDataOriginalType.Android || p.access_type === AccessDataOriginalType.Ios)
          .map(p => ({ id: p.id, name: p.name === 'Ios' ? 'iOS接入' : p.name, access_type: p.access_type === AccessDataOriginalType.Android ? 'android' : 'ios', datasource_id, project_id: projectId }))
      }
      const res = yield effects.call(Fetch.get,
        '/app/sdk/heat-map/list',
        { project_id: projectId, pageSize, pageIndex, searchKey, app_type: appType })
      if (res.success) {
        const { heatMapList: resList } = res.result
        yield effects.put({
          type: 'changeState',
          payload: {
            hasMore: pageIndex === 1,
            tokens,
            heatMapList: pageIndex === 1 ? resList : _.concat(heatMapList, resList),
            pageIndex,
            heatMapsCount: heatMapList.count,
            searchKey,
            loading: false,
            appType,
            oldProjectId: _.get(projectCurrent, 'id', '')
          }
        })
      } else {
        message.error('获取热图数据失败')
        yield effects.put({ type: 'changeState', payload: { loading: false, appType } })
      }
    },

    *deleteHeatMap(action, effects) {
      const { id } = action.payload
      const res = yield effects.call(Fetch.get, '/app/sdk/heat-map/delete', { id })
      if (res.success) {
        yield effects.put({ type: 'queryHeatMapList', payload: {} })
      } else {
        message.error('获取热图数据失败')
      }
    },

    *importHeatMap(action, effects) {
      const { heatmaps, appType, projectId } = action.payload
      const res = yield effects.call(Fetch.post, '/app/sdk/heat-map/import', null, { body: JSON.stringify({ heatmaps, appType, projectId }) })
      if (res.success) {
        yield effects.put({ type: 'changeState', payload: { showImportHeatmap: false } })
        yield effects.put({ type: 'queryHeatMapList', payload: {} })
      } else {
        message.error('获取热图数据失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname } = history.getCurrentLocation()
      // 可以做异步加载数据处理
      if (pathname.includes('/console/heat-map')) {
        dispatch({ type: 'queryHeatMapList', payload: {} })
      }
    }
  }
}

