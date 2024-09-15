import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import moment from 'moment'
import { TASK_TREE_TYPE } from '../constants'
import C2Q from 'cron-to-quartz'
import { sendFormData, recvJSON } from '../../../common/fetch-utils'

export const namespace = 'alarmModel'
export const taskTreeNamespance = `taskScheduleTree_${TASK_TREE_TYPE.dataDevelop.name}`

export default props => ({
  namespace,
  state: {
    validForm: [],
    selectedKey: 'alarm',
    alarmInfo: {},
    viewType: 'alarm',
    idealExecutorIds: '',
    successEmails: [],
    cronInfo: props.cronInfo,
    flowPriority: 5,
    executeType: 1,
    apiAlertInfos: [],
    emailAlertType: 'on_all'
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
    *startTask({ payload }, { call, select, put }) {
      const { id, name, idealExecutorIds, successEmails, failureEmails, flowPriority, apiAlertInfos, hideModal } = payload
      const executeIds = idealExecutorIds ? [idealExecutorIds] : []
      let url = `/app/new-task-schedule/manager?ajax=fetchprojectflows&project=${name}`
      let res = yield call(Fetch.get, url, null)
      if (_.isEmpty(res.flows)) {
        message.warn('没有配置任务流程，请编辑。')
        return { status: 'fail' }
      }
      let executorParam = {
        project: name,
        projectId: id,
        apiAlertInfos: JSON.stringify(apiAlertInfos),
        'flowOverride[useExecutorList]': JSON.stringify(executeIds),
        'flowOverride[flowPriority]': flowPriority,
        failureEmailsOverride: !!failureEmails,
        successEmailsOverride: !!successEmails,
        failureEmails: failureEmails,
        successEmails: successEmails,
        flow: _.get(res, 'flows[0].flowId')
      }
      url = '/app/new-task-schedule/executor?ajax=executeFlow'
      const formData = new FormData()
      for (let x in executorParam) {
        formData.append(x, executorParam[x])
      }
      res = yield call(Fetch.post, url, null, { ...sendFormData, body: formData })
      if (res.status === 'error') {
        let errmsg = res.error
        if (res.error.match(/running/)) {
          errmsg = '任务正在执行中，请勿重复执行'
        }
        message.warn('执行任务失败,' + errmsg)
        return
      }
      yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: { taskTreeType: TASK_TREE_TYPE.dataDevelop.name } })
      hideModal && hideModal()
      message.success('执行成功')
    },
    /**
     * 修改保存Corn表达式和执行器
     * @param {*} param0 
     * @param {*} param1 
     */
    *saveScheduleCron({ payload }, { call, select, put }) {
      const { scheduleId, hideModal } = payload
      let { alarmInfo = {}, cronInfo } = yield select(state => state[namespace])
      const { id, name, idealExecutorIds, successEmails, failureEmails, flowPriority, apiAlertInfos } = alarmInfo
      const taskStartTime = cronInfo.taskStartTime ? moment(cronInfo.taskStartTime) : moment()
      const executeIds = idealExecutorIds ? [idealExecutorIds] : []
      const taskEndTime = cronInfo.taskEndTime ? moment(cronInfo.taskEndTime) : moment().add(10, 'y')
      let params = {
        ajax: 'scheduleCronFlow',
        projectName: name,
        projectId: id,
        flow: name,
        cronExpression: C2Q.getQuartz(cronInfo.cronExpression)[0].join(' '),
        scheduleTime: moment(cronInfo.taskStartTime).locale('en').format('hh,mm,A,Z'),
        scheduleDate: moment(cronInfo.taskStartTime).format('MM/DD/YYYY'),
        info: JSON.stringify(cronInfo),
        apiAlertInfos: JSON.stringify(apiAlertInfos),
        'flowOverride[useExecutorList]': JSON.stringify(executeIds),
        'flowOverride[flowPriority]': flowPriority,
        failureEmailsOverride: !!failureEmails,
        successEmailsOverride: !!successEmails,
        failureEmails: failureEmails,
        successEmails: successEmails,
        endSchedTime: moment(taskEndTime) + 0,
        startSchedTime: moment(taskStartTime) + 0,
        scheduleId
      }
      params = _.pickBy(params, _.identity)
      let url = '/app/new-task-schedule/schedule?ajax=scheduleCronFlow'
      const formData = new FormData()
      for (let x in params) {
        formData.append(x, params[x])
      }
      let res = yield call(Fetch.post, url, null, { ...sendFormData, body: formData })
      if (res && res.status && res.status === 'success') {
        yield put({ type: `${taskTreeNamespance}/getTaskTreeData`, payload: { taskTreeType: TASK_TREE_TYPE.dataDevelop.name } })
        hideModal && hideModal()
      } else if (res.message && res.message.indexOf('cannot be found in project') > 0) {
        message.error('缺少流程设置, 请编辑')
        yield put({ type: 'changeState', payload: { loading: false } })
      } else {
        message.error('保存失败')
      }
    },
    /**
     * 获取告警设置信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *getAlarmInfo({ payload }, { call, put }) {
      const { id, name } = payload
      let url = `/app/new-task-schedule/manager?ajax=fetchProjectExecSummary&project=${name}&flowId=${name}`
      let res = yield call(Fetch.post, url, null)
      if (res) {
        const { idealExecutorIds = [], apiAlertInfos, successEmails = [], failureEmails = [] } = res.lastExecInfo || {}
        let emailAlertType = 'on_all'
        if (successEmails.length && !failureEmails.length) {
          emailAlertType = 'on_success'
        } else if (!successEmails.length && failureEmails.length) {
          emailAlertType = 'on_failed'
        }
        yield put({
          type: 'changeState',
          payload: {
            idealExecutorIds: _.get(idealExecutorIds, '0', ''),
            executeType: _.get(idealExecutorIds, 'length', false) ? 2 : 1,
            apiAlertInfos: !apiAlertInfos || !apiAlertInfos.length
              ? [{ id: 0 }]
              : apiAlertInfos.map((p, i) => ({ ...p, id: i })),
            successEmails: (successEmails || []).join(','),
            emailAlertType
          }
        })
      } else {
        message.error('获取告警设置失败')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getDataDb', payload: {} })
      dispatch({ type: 'getScheduleExecutors', payload: {} })
    }
  }
})
