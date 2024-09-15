import Fetch from '../../../common/fetch-final'
import { message } from 'antd'
import { TASK_TREE_TYPE, TASK_ACTION_TYPE } from '../constants'
import C2Q from 'cron-to-quartz'
import { toQueryParams, tryJsonParse } from '../../../../common/sugo-utils'

export const namespace = 'schedule-manager'

export const taskTreeNamespance = `taskScheduleTree_${TASK_TREE_TYPE.scheduleHandle.name}`
/**
 * 测试数据
 */

export default {
  namespace,
  state: {
    cancleSchedulePopwindow: false,
    data: {},
    showEidtScheduleInfo: false,
    search_taskName: '',
    search_editTime: '',
    search_firstExecuteTime: '',
    search_nextExectuteTime: '',
    scheduleInfo: {},
    executors: [],
    executorIds: '',
    cronInfo: {
      unitType: '0',
      period: 'day',
      cronExpression: '0 0 * * *',
      taskStartTime: moment().format('YYYY-MM-DD HH:mm')
    }
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
    /**
     * 获取执行器信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *getScheduleExecutors({ payload }, { call, select, put }) {
      let url = '/app/task-schedule/executors?action=getActiveExecutors'
      let res = yield call(Fetch.get, url, null)
      if (res && res.activeExecutors) {
        yield put({
          type: 'changeState',
          payload: {
            executors: res.activeExecutors
          }
        })
      } else {
        message.error('获取执行器信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },

    *cancleScheduleTask({ payload }, { select, call, put }) {
      let url = '/app/new-task-schedule/schedule'
      let params = toQueryParams({
        action: 'removeSched',
        scheduleId: payload.scheduleId
      })
      let res = yield call(Fetch.post, `${url}?${params}`, null)
      if (res && res.status && res.status === 'success') {
        message.success('取消成功')
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: { taskTreeType: TASK_TREE_TYPE.scheduleHandle.name } })
      } else {
        message.error('取消失败')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getScheduleExecutors', payload: {} })
    }
  }
}

