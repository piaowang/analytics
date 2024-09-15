import _ from 'lodash'
import { META as meta } from 'redux-saga-model-loading'
import * as modelsServbice from 'client/services/market-brain/models'
import * as eventsService from 'client/services/market-brain/events'
import { decompressUrlQuery, immutateUpdate } from 'common/sugo-utils'
import { message } from 'antd'

/**
 * @description marketBrainEvents
 */
export const namespace = 'marketBrainEvents'

export default {
  namespace,
  state: {
    editRecord: {}, // 修改记录
    rows: [],
    total: 0,
    page: 1,
    pageSize: 10,
    selected_values: undefined, // 所属模型&场景
    treeLevels: [],
    baseEvent: false
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
    *fetch({ payload }, { call, put }) {
      const { page, pageSize, loadTreeLevels }  = payload
      const { result: { rows, count: total } } = yield call(eventsService.fetch, payload)
      const values = {
        page,
        pageSize,
        rows,
        total
      }
      if (loadTreeLevels) {
        const { result } = yield call(modelsServbice.getModelsTreeLevels)
        values.treeLevels = result
      }
      yield put({
        type: 'change',
        payload: values
      })
    },
    *save({ payload: { id, values } }, { call }) {
      let res
      if (id) {
        res = yield call(eventsService.update, id, values)
      } else {
        res = yield call(eventsService.create, values)
      }
      if (!res.success) {
        message.error('保存失败')
        return
      }
      message.success('保存成功')
    },
    *saveEffect({ payload: { id, values }}, { call, put, select }) {
      const res = yield call(eventsService.update, id, values)
      if (!res.success) {
        return
      }
      const rows = yield select(state => state[namespace].rows)
      const idx = _.findIndex(rows, m => m.id === id)
      yield put({
        type: 'change',
        payload: {
          rows: immutateUpdate(rows, idx, o => {
            return {
              ...o,
              project_id: values.project_id
            }
          })
        }
      })
      message.success('设置成功')
    },
    /**
     * @description 查询所有模型&场景
     * @param {any} { call, put }
     */
    *fetchTreeLevels({ paylod: { selected_values, editMode, id, baseEvent } }, { call, put }) {
      const { result: treeLevels } = yield call(modelsServbice.getModelsTreeLevels)
      let editRecord = {}
      if (editMode) { // 编辑模式
        const { result } = yield call(eventsService.findById, id)
        editRecord = result
      }
      yield put({
        type: 'change',
        payload: {
          selected_values,
          treeLevels,
          baseEvent,
          editRecord
        }
      })
    },
    /**
     * @description 删除事件记录
     * @param {any} { payload: id }
     * @param {any} { call, put, select } 
     */
    *remove({ payload: { id, belongs = 0 } }, { call, put, select }) {
      const { page, pageSize } = yield select(state => state.marketBrainEvents)
      const res = yield call(eventsService.remove, id)
      if (!res || !res.success) {
        return
      }
      message.success('删除事件成功')
      //TODO 删成功了需要根据页面拉数据
      yield put({
        type: 'fetch',
        payload: {
          page,
          pageSize,
          belongs
        },
        meta
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query: { _sv, id, baseEvent = false } } = history.getCurrentLocation()

      if (_.startsWith(pathname, '/console/market-brain-events/new') || _.startsWith(pathname, '/console/market-brain-acts/new')) {
        dispatch({
          type: 'fetchTreeLevels',
          paylod: {
            selected_values: decompressUrlQuery(_sv),
            editMode: !!id,
            baseEvent,
            id
          }
        })
      } else if(pathname === '/console/market-brain-events') {
        dispatch({
          type: 'fetch',
          payload: {
            page: 1,
            pageSize: 10,
            loadTreeLevels: true,
            belongs: 0
          },
          meta
        })
      }

      if (pathname === '/console/market-brain-acts') {
        dispatch({
          type: 'fetch',
          payload: {
            page: 1,
            pageSize: 10,
            loadTreeLevels: true,
            belongs: 1
          },
          meta
        })
      }
    }
  }
}
