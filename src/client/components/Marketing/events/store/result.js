import * as marketingEventsServices from 'client/services/marketing/events.js'
import _ from 'lodash'
import moment from 'moment'

/**
 *活动分组
 */
export default {
  namespace: 'marketingEventResult',
  state: {
    resGroup: [],
    eventInfo: {},
    lastRes: {},
    initDate: [],
    selectedMetric: ['target_total', 'revisit_total']
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
    *fetch({ payload }, { put, call, select }) {
      const { id } = payload
      const { result, success } = yield call(marketingEventsServices.getResult, id)
      if (success) {
        const { eventInfo, lastRes, resGroup } = result
        let since = _.get(resGroup,'[0].send_time', moment().add(-1,'d').startOf('d').toISOString())
        let until = _.get(resGroup, `[${resGroup.length - 1}].send_time`, moment().add(-1,'d').endOf('d').toISOString())
        yield put({
          type: 'change', 
          payload: { eventInfo, lastRes, resGroup, initDate: [moment(since), moment(until)] }
        })
      }
    },
    *getResultByDate({ payload }, { put, call }) {
      const { id, timeRange } = payload
      const { result, success } = yield call(marketingEventsServices.getResultByDate, id, timeRange)
      if (success) {
        yield put({
          type: 'change',
          payload: {
            resGroup: result
          }
        })
      }
    },
    *save({ payload }, { call, select, put }) {

    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, search, query } = history.getCurrentLocation()
      const id = _.get(query,'id', '')
      if (pathname.includes('/console/marketing-events') && id) {
        dispatch({type: 'fetch', payload: { id }})
      }
    }
  }
}
