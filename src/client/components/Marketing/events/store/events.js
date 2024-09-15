/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-21 10:29:31
 * @description 营销事件saga-model
 */
import _ from 'lodash'
import { META as meta } from 'redux-saga-model-loading'
import * as modelsServbice from 'client/services/marketing/models'
import * as eventsService from 'client/services/marketing/events'
import { decompressUrlQuery, immutateUpdate } from 'common/sugo-utils'
import { message } from 'antd'
import { browserHistory } from 'react-router'

/**
 * @description marketingEvents
 */
export const namespace = 'marketingEvents'

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
    //生命周期的用户群
    lcSegment: []
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
        // message.error('保存失败')
        return
      }
      message.success('保存成功')
      browserHistory.push('/console/marketing-events')
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
    *fetchTreeLevels({ paylod: { selected_values, editMode, id } }, { call, put }) {
      const { result: treeLevels } = yield call(modelsServbice.getModelsTreeLevels)
      let editRecord = {}
      if (editMode) { // 编辑模式
        const { result } = yield call(eventsService.findById, id)
        editRecord = result
      }

      yield put({ 
        type: 'checkIsLifeCycleScene',
        payload: {
          model_id: selected_values.split('|')[0],
          scene_id: selected_values.split('|')[1]
        }
      })
      yield put({
        type: 'change',
        payload: {
          selected_values,
          treeLevels,
          editRecord
        }
      })
    },
    /**
     * @description 删除事件记录
     * @param {any} { payload: id }
     * @param {any} { call, put, select } 
     */
    *remove({ payload: id }, { call, put, select }) {
      const { page, pageSize } = yield select(state => state.marketingEvents)
      const res = yield call(eventsService.remove, id)
      if (!res || !res.success) {
        return
      }
      message.success('删除事件成功')
      yield put({
        type: 'fetch',
        payload: {
          page,
          pageSize
        },
        meta
      })
    },
    *checkIsLifeCycleScene({payload: { model_id, scene_id }}, { call, put }) {
      yield put({
        type: 'change',
        payload: {
          lcSegment: []
        }
      })
      const { result } = yield call(eventsService.checkIsLifeCycleScene, { model_id, scene_id })
      if (!_.isEmpty(result)) yield put({
        type: 'change',
        payload: {
          lcSegment: [result]
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname, query: { _sv, id } } = history.getCurrentLocation()
      if (_.startsWith(pathname, '/console/marketing-events/new')) {
        dispatch({
          type: 'fetchTreeLevels',
          paylod: {
            selected_values: decompressUrlQuery(_sv),
            editMode: !!id,
            id
          }
        })
      } else if(pathname === '/console/marketing-events') {
        dispatch({
          type: 'fetch',
          payload: {
            page: 1,
            pageSize: 10,
            loadTreeLevels: true
          },
          meta
        })
      }
    }
  }
}
