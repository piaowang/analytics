/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:18
 * @description 智能营销-营销模型界面model
 */
import { message } from 'antd'
import { META as meta } from 'redux-saga-model-loading'
import { immutateUpdate } from 'common/sugo-utils'
import _ from 'lodash'
import * as modelsService from 'client/services/marketing/models'
import { moveArrayPosition } from 'client/common/utils'

/**
 * 营销模型saga-model
 */
export const namespace = 'marketingModels'

export default {
  namespace,
  state: {
    modelModalVisible: false,
    loading: false,
    currentModel: {}, // 当前选中model
    editModel: {},
    models: [] // 营销模型列表
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    },
    /**
     * @description 更新共有3个启用场景，2个启用事件中的计数器
     * @param {any} state
     * @param {any} { payload: { type, model_id, propKey: [scene_total,event_total] } }
     * @returns
     */
    changeSelectedCounter(state, { payload: { type, model_id, propKey } }) {
      if (!propKey || !model_id) {
        throw new Error('propKey or model_id is empty')
      }
      const { models } = state
      const idx = _.findIndex(models, m => m.id === model_id)
      return {
        ...state,
        models: immutateUpdate(models, idx, m => {
          switch (type) {
            case 'INCREMENT':
              m[propKey] = Number(m[propKey]) + 1
              break
            case 'DECREMENT':
              m[propKey] = Math.max(Number(m[propKey]) - 1, 0)
              break
          }
          return {
            ...m
          }
        })
      }
    }
  },
  sagas: {
    *fetch({ payload }, { call, put, select }) {
      const { result, success } = yield call(modelsService.fetch, payload)
      if (success) {
        yield put({
          type: 'change',
          payload: {
            currentModel: result[0] || {},
            models: result
          }
        })
      }
    },
    /**
     * @description 新增、修改营销模型
     * @param {any} { payload }
     * @param {any} { call, put }
     */
    *save({ payload: { id, values } }, { call, put }) {
      let res
      if (id) {
        res = yield call(modelsService.update, id, values)
      } else {
        res = yield call(modelsService.create, values)
      }
      const opt = id ? '修改' : '新增'
      if (!res.success) {
        message.error(`${opt}模型失败`)
        return
      }
      message.success(`${opt}模型成功`)
      const payload = {
        modelModalVisible: false
      }
      if (id) {
        payload.currentModel = {
          id,
          ...values
        }
      }
      yield put({
        type: 'change',
        payload
      })
      yield put({ type: 'fetch', meta })
    },
    /** 删除营销模型 */
    *remove({ payload: id }, { call, put }) {
      const res = yield call(modelsService.remove, id)
      if (!res || !res.success) {
        return
      }
      yield put.resolve({ // 清空当前选中model
        type: 'change',
        payload: {
          currentModel: {}
        }
      })
      message.success('删除模型成功')
      yield put({ type: 'fetch', meta })
    },
    /** 更新营销模型排序 */
    *updateOrders({ payload: { type, idx, item } }, { call, put, select })  {
      const list = yield select(state => state.marketingModels.models)
      const models = moveArrayPosition(list, item, idx, type)
      yield call(modelsService.update, item.id, {
        module_orders: models.map(m => m.id)
      })
      yield put({
        type: 'change',
        payload: {
          models
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname } = history.getCurrentLocation()
      if (pathname.includes('/console/marketing-models')) {
        dispatch({ type: 'fetch', meta })
      }
    }
  }
}
