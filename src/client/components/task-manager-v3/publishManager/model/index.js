import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import moment from 'moment'
import { recvJSON } from '../../../../common/fetch-utils'
import C2Q from 'cron-to-quartz'

export const namespace = 'taskV3PublishModel'

export default (props) => ({
  namespace,
  state: {
    taskList: []
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
    *fetchWaitingExamine( {payload}, { call, put }) {
      
      let status = _.get(payload, 'status', '1')
      let url = '/app/task-v3/get-task-publish-list'
      let res = yield call(Fetch.post, url, { status })
      if (res.success) {
        yield put({ type: 'changeState', payload: { taskList: res.result } })
      }
    },
    *saveTaskNodeInfo({ payload }, { call, select, put }) {
      const { taskId, projectId, flowId, status, cronInfo, executeParamsObj, notifyWarnObj, cb1, cb2 } = payload

      if (status === 3) {
        return yield put({
          type: 'examine',
          payload: {
            id: taskId,
            status,
            cb1,
            cb2
          }
        })
      }
      const { flowPriority, idealExecutorIds } = executeParamsObj
      const { emailAlertType, successEmails } = notifyWarnObj
      let url = '/app/task-schedule-v3/schedule?action=scheduleCronFlow'

      const executeIds = idealExecutorIds ? [idealExecutorIds] : []
      let params = {
        'projectId': Number(taskId),
        'flowId': flowId,
        'cronExpression': C2Q.getQuartz(cronInfo.cronExpression)[0].join(' '),
        'scheduleTime': moment(cronInfo.taskStartTime).locale('en').format('hh,mm,A,Z').replace('+', ' '),
        'scheduleDate': moment(cronInfo.taskStartTime).format('MM/DD/YYYY'),
        'info': {
          ...cronInfo,
          'selectedPeriod': cronInfo.period
        },
        'failureEmailsOverride': successEmails.length && (emailAlertType === 'on_failed' || emailAlertType === 'on_all') ? true : false,
        'successEmailsOverride': successEmails.length && (emailAlertType === 'on_success' || emailAlertType === 'on_all') ? true : false,
        'flowOverride[useExecutorList]': JSON.stringify(executeIds),
        'flowOverride[flowPriority]': flowPriority + '',
        'endSchedTime': cronInfo.taskEndTime ? +moment(cronInfo.taskEndTime) : +moment().add(10, 'y'),
        'startSchedTime': +moment(cronInfo.taskStartTime),
        'executeUser': _.get(window.sugo, 'user.id', 'azkban')
      }

      if (successEmails.length) {
        if (emailAlertType === 'on_all') {
          params.successEmails = successEmails
          params.failureEmails = successEmails
        }
        if (emailAlertType === 'on_success') {
          params.successEmails = successEmails
        }
        if (emailAlertType === 'on_failed') {
          params.failureEmails = successEmails
        }
      }

      let res = yield call(Fetch.post, url, null ,{
        ...recvJSON,
        body: JSON.stringify(params)
      })
      if (typeof res === 'string') res = JSON.parse(res)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'examine',
          payload: {
            id: taskId,
            status,
            cb1,
            cb2
          }
        })
      } else {
        cb2('执行失败' + res.message)
      }
    },
    *examine( { payload: { id, status, cb1, cb2 }}, { call, put }) {
      let url = '/app/task-v3/examine-task'
      let res = yield call(Fetch.put, url, {id, status} )
      if (res.success) {
        cb1('审批成功')
        yield put({ type: 'fetchWaitingExamine' })
        return
      }
      cb2('审批失败')
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname } = history.getCurrentLocation()
      if (pathname === '/console/new-task-schedule/publish-manager') {
        dispatch({ type: 'fetchWaitingExamine', payload: {  } })
      }
    }
  }
})
