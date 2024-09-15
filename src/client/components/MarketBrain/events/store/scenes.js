/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:18
 * @description 智能营销-营销模型界面model
 */
import { message } from 'antd'
import * as scenesService from 'client/services/market-brain/scenes'
import * as eventsService from 'client/services/market-brain/events'
import _ from 'lodash'
import { MARKETING_EVENT_STATUS } from 'common/constants'
import { immutateUpdate } from 'common/sugo-utils'

/**
 * 营销模型saga-model
 */
export const namespace = 'marketBrainScenes'

export default {
  namespace,
  state: {
    scenePopVisible: false,
    selected_model_id: null, // 当前选中model
    editModel: {},
    list: [], // 营销场景列表
    expandedRows: {  // 展开场景行
    // [key]: {
      // expanded, 是否已展开
      // events 事件列表
    // }
    }
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    },
    changeEventOpenedCounter(state, { payload: { type, scene_id, key = 'opened_total' } }) {
      const { list } = state
      const idx = _.findIndex(list, m => m.id === scene_id)
      return {
        ...state,
        list: immutateUpdate(list, idx, m => {
          switch (type) {
            case 'INCREMENT':
              m[key] = Number(m[key]) + 1
              break
            case 'DECREMENT':
              m[key] = Math.max(Number(m[key]) - 1, 0)
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
    /**
     * @description 获取场景列表
     * @param {any} { payload: model_id }
     * @param {any} { call, put } 
     */
    *fetch({ payload: model_id }, { call, put }) {
      const { result, success } = yield call(scenesService.fetch, { model_id })
      if (success) {
        yield put({
          type: 'change',
          payload: {
            selected_model_id: model_id,
            list: result
          }
        })
      }
    },

    /**
     * @description 新增、修改
     * @param {any} { payload }
     * @param {any} { call, put }
     */
    *save({ payload: { id, values } }, { call, select, put }) {
      const model_id = yield select(state => state.marketBrainScenes.selected_model_id)
      let res
      values.model_id = model_id
      let shuldUpdatedCounter = false
      if (id) {
        const list = yield select(state => state.marketBrainScenes.list)
        const currentScene = _.find(list, o => o.id === id)
        if (currentScene.status !== values.status) { // 如果未更新状态则不需要更新左侧菜单数量
          shuldUpdatedCounter = true
        }
        values.statusHasModified = true
        res = yield call(scenesService.update, id, values)

        // 事件启用状态
        const expandedRows = yield select(state => state.marketBrainScenes.expandedRows)
        const events = _.get(expandedRows[id], 'events', [])
        for (let i = 0; i < events.length; i ++) {
          // 更新左侧菜单启用事件数
          let event = events[i]
          const type = event.tactics_status === MARKETING_EVENT_STATUS.OPEN ? 'DECREMENT' : 'INCREMENT'
          const tactics_status = event.tactics_status === MARKETING_EVENT_STATUS.OPEN ? 0 : 1
          yield put({
            type: 'marketBrainModels/changeSelectedCounter',
            payload: {
              type,
              model_id: event.model_id,
              propKey: 'event_total'
            }
          })
          // 更新场景列表的启用事件数
          yield put({
            type: 'changeEventOpenedCounter',
            payload: {
              type,
              scene_id: event.scene_id
            }
          })
          yield put({
            type: 'change',
            payload: {
              expandedRows: {
                ...expandedRows,
                ...immutateUpdate(expandedRows, [event.scene_id, 'events', i], o => ({ ...o, tactics_status }))
              }
            }
          })
        }

      } else {
        shuldUpdatedCounter = values.status === MARKETING_EVENT_STATUS.OPEN
        res = yield call(scenesService.create, values)
      }
      // 更新左侧菜单启用场景数
      if (shuldUpdatedCounter) {
        const type = values.status === MARKETING_EVENT_STATUS.OPEN ? 'INCREMENT' : 'DECREMENT'
        yield put({
          type: 'marketBrainModels/changeSelectedCounter',
          payload: {
            type,
            model_id,
            propKey: 'scene_total'
          }
        })
      }
      const opt = id ? '修改' : '新增'
      if (!res || !res.success) {
        // message.error(`${opt}场景失败`)
        return
      }
      const payload = {
        scenePopVisible: false
      }
      if (id) {
        const expandedRows = yield select(state => state.marketBrainScenes.expandedRows)
        expandedRows[id].visible = false
        payload.expandedRows = expandedRows
      }
      yield put.resolve({
        type: 'change',
        payload
      })
      message.success(`${opt}场景成功`)
      yield put({ type: 'fetch', payload: model_id })
    },
    /** 删除场景记录 */
    *remove({ payload: id }, { call, put, select }) {
      const model_id = yield select(state => state.marketBrainScenes.selected_model_id)
      const { success } = yield call(scenesService.remove, id, model_id)
      if (!success) {
        // message.success('删除场景失败')
        return
      }
      // 更新左侧菜单启用场景数
      yield put({
        type: 'marketBrainModels/changeSelectedCounter',
        payload: {
          type: 'DECREMENT',
          model_id,
          propKey: 'scene_total'
        }
      })
      message.success('删除场景成功')
      yield put({ type: 'fetch', payload: model_id })
    },

    /**
     * @description 获取事件列表
     * @param {any} { payload }
     * @param {any} { call, put, select, take } 
     * @returns 
     */
    *fetchEvents({ payload }, { call, put, select }) {
      const oldExpandedRows = yield select(state => state.marketBrainScenes.expandedRows)
      const res = yield call(eventsService.fetch, payload)
      let expandedRows = _.clone(oldExpandedRows)
      expandedRows[payload.scene_id].events = res.result.rows || []
      expandedRows[payload.scene_id].loading = false
      yield put({
        type: 'change',
        payload: {
          expandedRows
        }
      })
    },
    /**
     * @description 启用/停用营销事件
     * @param {any} { payload }
     * @param {any} { call, put, select } 
     */
    * updateEvent({ payload }, { call, put, select }) {
      const { propkey, event } = payload
      const tactics_status = event.tactics_status === MARKETING_EVENT_STATUS.OPEN ? 0 : 1
      const type = event.tactics_status === MARKETING_EVENT_STATUS.OPEN ? 'DECREMENT' : 'INCREMENT'
      // 更新事件状态
      const res = yield call(eventsService.update, event.id, {
        ..._.omit(event, 'id'),
        tactics_status
      })
      if (!res.success) {
        // message.error('操作失败：' + res.message)
        return
      }
      // 更新左侧菜单启用事件数
      yield put({
        type: 'marketBrainModels/changeSelectedCounter',
        payload: {
          type,
          model_id: event.model_id,
          propKey: propkey
        }
      })
      // 更新场景列表的启用事件数
      yield put({
        type: 'changeEventOpenedCounter',
        payload: {
          type,
          scene_id: event.scene_id
        }
      })
      // 事件启用状态
      const expandedRows = yield select(state => state.marketBrainScenes.expandedRows)
      const events = expandedRows[event.scene_id].events
      const idx = _.findIndex(events, o => o.id === event.id)
      yield put({
        type: 'change',
        payload: {
          expandedRows: {
            ...expandedRows,
            ...immutateUpdate(expandedRows, [event.scene_id, 'events', idx], o => ({ ...o, tactics_status }))
          }
        }
      })
    }
  }
}
