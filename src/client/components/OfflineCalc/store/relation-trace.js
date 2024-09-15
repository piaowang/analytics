
import Fetch from 'client/common/fetch-final'
import {TagTypeEnum, OfflineCalcTargetType, OfflineCalcChartType} from '../../../../common/constants'
import {dictBy} from '../../../../common/sugo-utils'
import _ from 'lodash'

export default {
  namespace: 'offlineCalcRelationTrace',
  state: {
    formulaTree: {},
    dimIdNameDict: {},
    rootPoint: {},
    treeData: {},
    influenceTree: [],
    offlineCalcDataSources: []
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *init({ payload }, {call, put}) {

      yield put({
        type: 'chagne',
        payload: {
          formulaTree: {},
          dimIdNameDict: {},
          rootPoint: {},
          treeData: {},
          influenceTree: [],
          offlineCalcDataSources: []
        }
      })

      let { pathname, query } = payload
      let search = pathname.split('/')
      let { targetType, chartType } = query
      let id = search[search.length - 1]

      let apiSet = {
        [OfflineCalcChartType.relation]: {
          method: 'get',
          api: '/app/offline-calc/get-relationship'
        },
        [OfflineCalcChartType.influence]: {
          method: 'get',
          api: '/app/offline-calc/get-influenceship'
        }
      }

      let method = apiSet[chartType].method
      let api = apiSet[chartType].api
      let { result } = yield call(Fetch[method], api, { id, targetType })

      if (!_.isEmpty(result) && chartType === OfflineCalcChartType.relation) {
        const { formulaTree, rootPoint } = result
        yield put({
          type: 'change',
          payload: {
            formulaTree,
            rootPoint
          }
        })
      }

      if (!_.isEmpty(result) && chartType === OfflineCalcChartType.influence) {
        const { influenceTree, rootPoint } = result
        yield put({
          type: 'change',
          payload: {
            influenceTree,
            rootPoint
          }
        })
      }

      let { result: indicesList} = yield call (Fetch.get, '/app/offline-calc/indices', { created_by: window.sugo.user.id })
      let { result: datasource } = yield call(Fetch.get, '/app/offline-calc/data-sources')

      yield put({
        type: 'change',
        payload: {
          indicesIdDict: dictBy(indicesList, o => o.id),
          dsIdDict: _.keyBy(datasource, 'id')
        }
      })

    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query } = history.getCurrentLocation()

      if (pathname.includes('/console/offline-calc/relation-trace')) {
        dispatch({ type: 'init', payload: {
          pathname,
          query
        } })
      }
    }
  }
}
