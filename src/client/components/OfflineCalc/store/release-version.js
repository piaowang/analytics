
import Fetch from 'client/common/fetch-final'
import {TagTypeEnum, OfflineCalcTargetType} from '../../../../common/constants'
import {dictBy} from '../../../../common/sugo-utils'
import _ from 'lodash'

export default {
  namespace: 'offlineCalcReleaseVersion',
  state: {
    offlineCalcCurrentItem: [],
    offlineCalcDataSources: [],
    offlineCalcIndices: [],
    historyVersion: [],
    reviewerList: [],
    tags: [],
    dimIdNameDict: {},
    modalVisible: false,
    modalTitle: '',
    version: '',
    comment: '',
    reviewResult: '',
    releaseTargetType: '',
    errorMessage: ''
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    },
    initReview(state, { payload }) {
      const { target, target_type, history} = payload
      return {
        ...state,
        offlineCalcCurrentItem: target,
        releaseTargetType: target_type,
        historyVersion: history
      }
    }
  },
  sagas: {
    *init({ payload }, {call, put}) {
      yield put({
        type: 'change',
        payload: {
          offlineCalcCurrentItem: [],
          offlineCalcDataSources: [],
          offlineCalcIndices: [],
          historyVersion: [],
          reviewerList: [],
          dimIdNameDict: {},
          modalVisible: false,
          modalTitle: '',
          version: '',
          comment: '',
          reviewResult: '',
          releaseTargetType: '',
          errorMessage: ''
        }
      })

      let { pathname, query } = payload
      let search = pathname.split('/')
      let id = search[search.length - 1]
      let targetType = query.targetType

      let historyRes = []

      let apiSet = {
        [OfflineCalcTargetType.Indices]: {
          method: 'get',
          api: '/app/offline-calc/indices'
        },
        [OfflineCalcTargetType.IndicesModel]: {
          method: 'get',
          api: '/app/offline-calc/models'
        }
      }

      //审核版本页面 审核操作
      if (targetType + '' === OfflineCalcTargetType.Reviewer || targetType + '' === OfflineCalcTargetType.DelReviewer) {
        let { result: reviewResult } = yield call(Fetch.post, '/app/offline-calc/preview', { id })
        if (!_.isEmpty(reviewResult)) {
          yield put({
            type: 'initReview',
            payload: reviewResult
          })
        }
      } else {
        //各功能页面提审操作
        let method = apiSet[targetType + ''].method
        let api = apiSet[targetType + ''].api
        let { result, success, message } = yield call(Fetch.get, '/app/offline-calc/can-review', { id, targetType })

        if (!success) {
          yield put({
            type: 'change',
            payload: {
              errorMessage: message
            }
          })
          return 
        }

        if (!_.isEmpty(result)) {

          if (result[0].belongs_id) {
            let { result: history} = yield call(Fetch[method], api, { id: result[0].belongs_id })
            historyRes = history
          }

          yield put({
            type: 'change',
            payload: {
              offlineCalcCurrentItem: result,
              historyVersion: historyRes
            }
          })
        }
      }

      let tagRes = yield call(Fetch.get, '/app/tag/get/all', {type: TagTypeEnum.offline_calc_dimension})

      let { result: indicesList } = yield call(Fetch.get, '/app/offline-calc/indices', { created_by: window.sugo.user.id } )
      yield put({
        type: 'change',
        payload: {
          tags: _.get(tagRes, 'data', []),
          offlineCalcIndices: indicesList
        }
      })

      let { result: dsRes } = yield call(Fetch.get, '/app/offline-calc/data-sources')
      if (!_.isEmpty(dsRes)) {
        yield put({
          type: 'change',
          payload: {
            offlineCalcDataSources: dsRes
          }
        })
      }
    },
    *submit({ payload }, { call, put }) {
      const { id, targetType, version ,comment, handleSuccess, handleFail } = payload
      let { success, message } = yield call(Fetch.post, '/app/offline-calc/version-histories', { id, targetType, version ,comment })
      if (success) {
        return handleSuccess(targetType)
      }
      handleFail(message)
    },
    *submitReview({ payload }, { call, put }) {
      const { id, comment, reviewResult, handleFail, handleSuccess } = payload
      let { success, message } = (yield call(Fetch.post, '/app/offline-calc/confirm-review', { id, comment, reviewResult })) || {}
      if (success) {
        return handleSuccess(OfflineCalcTargetType.Reviewer)
      }
      if (message) {
        handleFail(message)
      }
    },
    *delReview({ payload }, { call, put }) {
      const { handleSuccess, id, reviewResult } = payload
      let { success, message } = yield call(Fetch.post, '/app/offline-calc/handle-review-del', { id, reviewResult })
      if (success) {
        handleSuccess(OfflineCalcTargetType.DelReviewer)
      }

    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query } = history.getCurrentLocation()

      if (pathname.includes('/console/offline-calc/release-version')) {
        dispatch({ type: 'init', payload: {
          pathname,
          query
        } })
      }
    }
  }
}
