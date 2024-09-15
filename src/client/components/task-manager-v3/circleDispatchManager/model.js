
import { message } from 'antd'
import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import C2Q from 'cron-to-quartz'
import moment from 'moment'
import { TASK_SCHEDULE_STATUS } from 'common/constants'

export const namespace = 'taskV3ScheduleManager'

export default () => ({
  namespace,
  state: {
    taskList: [],
    taskGrouplist: [],
    taskProjectList: [],
    queryPamrams: { status: TASK_SCHEDULE_STATUS.all, taskName: '', taskProjectId: '' }
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
    *getTaskProjectList({ payload }, { put, call }) {
      const url = '/app/task-schedule-v3/get-project'
      const res = yield call(Fetch.get, url, {})
      if (res?.success) {
        yield put({
          type: 'changeState',
          payload: { taskProjectList: res?.result }
        })
        return
      }
      message.error('获取数据失败')
    },

    *getTaskList({ payload }, { put, call, select }) {
      const { queryPamrams } = yield select(state => state[namespace])
      const url = '/app/task-v3/get-schedule-task'
      const res = yield call(Fetch.get, url, queryPamrams)
      if (res?.success) {
        yield put({
          type: 'changeState',
          payload: { taskList: res?.result }
        })
        return
      }
      message.error('获取数据失败')
    },

    *getTaskGroupList({ payload }, { put, call, select }) {
      const { queryPamrams } = yield select(state => state[namespace])
      const url = '/app/task-v3/get-schedule-task-group'
      const res = yield call(Fetch.get, url, queryPamrams)
      if (res?.success) {
        yield put({
          type: 'changeState',
          payload: { taskGrouplist: res?.result }
        })
        return
      }
      message.error('获取数据失败')
    },

    *cancelAudit({ payload }, { put, call }) {
      const { isTaskGroup, items } = payload
      const { scheduleIds, idAndProjectId } = getScheduleIds(items)
      const url = `/app/task-v3/bulk-cancel-project-task${isTaskGroup ? 'group' : ''}`
      const res = yield call(Fetch.post, url, {
        scheduleIds,
        idAndProjectId
      })
      if (res?.success) {
        yield put({
          type: !isTaskGroup ? 'getTaskList' : 'getTaskGroupList',
          payload: {}
        })
        return
      }
      return message.error('取消失败')
    },


    *pauseAudit({ payload, callback }, { put, call }) {
      const { isTaskGroup, items } = payload
      const { scheduleIds, idAndProjectId } = getScheduleIds(items)
      if (_.isEmpty(scheduleIds)) {
        return message.error('选项不能为空')
      }
      const url = `/app/task-v3/bulk-pause-project-task${isTaskGroup ? 'group' : ''}`
      const res = yield call(Fetch.post, url, {
        scheduleIds,
        idAndProjectId
      })
      if (res?.success) {
        yield put({
          type: !isTaskGroup ? 'getTaskList' : 'getTaskGroupList',
          payload: {}
        })
        callback && callback()
        return
      }
      return message.error('暂停失败')
    },

    *saveCornInfo({ payload, callback }, { put, call }) {
      const { isTaskGroup, items, setting } = payload
      const { cronInfo } = setting

      let data = []
      let ids = []
      data = items.map(item => {
        ids.push({ id: item.id, others: item.setting })
        return {
          projectId: item.id.toString(),
          flowId: item.name,
          'executeUser': window.sugo.user.id,
          // ...handleOtherParams(item?.setting || {})
        }
      })

      let params = {
        data,
        type: 'project',
        cronExpression: C2Q.getQuartz(cronInfo.cronExpression)[0].join(' '),
        scheduleTime: moment(cronInfo.taskStartTime)
          .locale('en')
          .format('hh,mm,A,Z')
          .replace('+', ' '),
        scheduleDate: moment(cronInfo.taskStartTime).format('MM/DD/YYYY'),
        info: {
          ...cronInfo,
          selectedPeriod: cronInfo.period
        }
      }
      const url = isTaskGroup ? '/app/task-v3/bulk-set-group-schedule' : '/app/task-v3/bulk-set-schedule'
      const res = yield call(Fetch.post, url, { params, cronInfo, ids })
      if (!res.success) {
        return message.error(res.message || '设置失败')
      }
      message.success('设置成功')
      yield put({
        type: !isTaskGroup ? 'getTaskList' : 'getTaskGroupList',
        payload: {}
      })
      callback && callback()
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getTaskProjectList', payload: {} })
      dispatch({ type: 'getTaskList', payload: {} })
      dispatch({ type: 'getTaskGroupList', payload: {} })
    }
  }
})

/**
 * 生成调度信息配置
 * @param {*} record 
 */
function handleOtherParams(record) {
  const { notifyWarnObj = {}, executeParamsObj = {} } = record
  const { emailAlertType, successEmails = [] } = notifyWarnObj
  const { flowPriority, idealExecutorIds } = executeParamsObj
  const executeIds = idealExecutorIds ? [idealExecutorIds] : []
  if (!successEmails.length) {
    return {
      failureEmailsOverride: false,
      successEmailsOverride: false,
      'flowOverride[useExecutorList]': JSON.stringify(executeIds),
      'flowOverride[flowPriority]': flowPriority.toString()
    }
  }

  const successSend = _.includes(['on_success', 'on_all'], emailAlertType)
  const failureSend = _.includes(['on_failed', 'on_all'], emailAlertType)
  let res = {
    failureEmailsOverride: failureSend,
    successEmailsOverride: successSend,
    'flowOverride[useExecutorList]': JSON.stringify(executeIds),
    'flowOverride[flowPriority]': flowPriority.toString()
  }

  if (failureSend) {
    res.failureEmails = successEmails
  }
  if (successSend) {
    res.successEmails = successEmails
  }

  return res
}


const getScheduleIds = (items) => {
  let scheduleIds = []
  let idAndProjectId = []
  scheduleIds = items.map(i => {
    idAndProjectId.push({
      id: i.id,
      task_project_id: i.taskProjectId
    })
    return i.scheduleInfo.scheduleId
  })
  return { scheduleIds, idAndProjectId }
}
