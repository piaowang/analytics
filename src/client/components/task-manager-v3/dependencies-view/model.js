
import { message } from 'antd'
import Fetch from 'client/common/fetch-final'
import _ from 'lodash'

export const namespace = 'taskV3DependenciesView'

export default () => ({
  namespace,
  state: {
    taskList: [],
    taskGroupList: [],
    taskProjectList: [],
    selectTaskProjectId: '',
    dependencies: [],
    loading: true
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
    // 获取有权限项目列表
    *getTaskProjectList({ payload }, { put, call }) {
      const url = '/app/task-schedule-v3/get-project'
      const res = yield call(Fetch.get, url, {})
      if (res?.success) {
        const selectTaskProjectId = _.get(res, 'result.0.id', '')
        if (selectTaskProjectId) {
          yield put({
            type: 'getTaskList',
            payload: { selectTaskProjectId }
          })
          yield put({
            type: 'changeState',
            payload: { taskProjectList: res?.result }
          })
          return
        }
        yield put({
          type: 'changeState',
          payload: { loading: false }
        })
        return
      }
      message.error('获取数据失败')
    },
    // 根据选择的项目获取工作流工作流组的
    *getTaskList({ payload }, { put, call }) {
      const { selectTaskProjectId } = payload
      let url = '/app/task-v3/get-schedule-task'
      const res = yield call(Fetch.get, url, { taskProjectId: selectTaskProjectId })
      if (!res?.success) {
        message.error('获取数据失败')
      }
      const taskList = res.result

      url = '/app/task-v3/get-schedule-task-group'
      const resGroup = yield call(Fetch.get, url, { taskProjectId: selectTaskProjectId })
      if (!resGroup?.success) {
        message.error('获取数据失败')
      }
      const taskGroupList = resGroup.result

      url = `/app/task-schedule-v3/manager?action=fetchDependentTreeByProjectIds&projectIds=${_.concat(taskList, taskGroupList).map(p => p.id).join(',')}`
      const resDeoendencies = yield call(Fetch.get, url, {})
      if (!resDeoendencies?.status === 'success') {
        message.error('获取数据失败')
      }

      yield put({
        type: 'changeState',
        payload: { taskList, taskGroupList, selectTaskProjectId, dependencies: resDeoendencies?.data }
      })
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getTaskProjectList', payload: {} })
    }
  }
})
