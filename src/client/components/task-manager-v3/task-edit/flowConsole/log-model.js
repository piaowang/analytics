import Fetch from '../../../../common/fetch-final'
import { message } from 'antd'
import { toQueryParams, tryJsonParse } from '../../../../../common/sugo-utils'
import _ from 'lodash'
import moment from 'moment'

export const namespace = 'console-execute-manage-v3'
export default opt => ({
  namespace: namespace + opt.taskId,
  state: {
    searchStartTime: '',
    searchEndTime: '',
    searchStatus: '',
    //0:正在执行 1：执行历史
    pageStatus: 1,
    historyList: [],
    totalNum: 0,
    pageIndex: 1,
    pageSize: 10,
    pList: [],
    userList: []
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
    *queryAllUser ({ payload }, { call, put }) {
      let url = '/app/user/get'
      const response = yield call(Fetch.get, url, payload)
      const { result = [] } = response
      if (result && result.length) {
        yield put({
          type: 'changeState',
          payload: {
            userList: result
          }
        })
      }
    },
    *queryAllTaskId ({ payload }, { call, put }) {
      let url = ''
      if (payload && payload.type === 'group') {
        url = '/app/task-schedule-v3/get-all-group-task'
      } else {
        url = '/app/task-schedule-v3/get-all-task'
      }
      
      const response = yield call(Fetch.get, url, payload)
      const { result = [], success } = response
      if (success) {
        yield put({
          type: 'changeState',
          payload: {
            pList: result
          }
        })
      }
    },
    /**
     * 获取执行历史
     * @param {*} param0 
     * @param {*} param1 
     */
    *queryHistoryTask({ payload }, { call, put }) {
      const { page = 1, size = 10, type = 'project', taskId, begin, end, orderby = 'end_time', order = 'desc' } = payload
      if(!taskId) {
        return 
      }
      let url = '/app/task-schedule-v3/history'
      let params = {
        page,
        size,
        projectId: taskId,
        begin: moment(begin).format('MM/DD/YYYY HH:mm'),
        end: moment(end).format('MM/DD/YYYY HH:mm'),
        orderby,
        order,
        type
      }

      params = _.pickBy(params, _.identity)
      params = toQueryParams(params)
      const res = yield call(Fetch.get, `${url}?action=fetchAllHistory&${params}`, null)
      let runningList =  []
      if (page === 1) {
        let runningFlowsurl = `/app/task-schedule-v3/history?action=getRunningFlows&type=${type}&projectId=${taskId}`
        let runningFlowsurlRes = yield call(Fetch.get, runningFlowsurl, null)
        if (runningFlowsurlRes && runningFlowsurlRes.status && runningFlowsurlRes.status === 'success') {
          runningList =  runningFlowsurlRes.runningFlows
        }
      }

      if (_.get(res, 'status', '') === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            historyList: [ ...runningList, ...res.historyFlows],
            pageStatus: 1,
            totalNum: res.totalNum + runningList.length,
            pageIndex: page,
            pageSize: res.historyFlows.length + runningList.length
          }
        })
      } else {
        message.error('获取失败!')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'queryAllUser'})
      dispatch({ 
        type: 'queryAllTaskId',
        payload: {
          type: opt.taskType
        }})
      dispatch({
        type: 'queryHistoryTask',
        payload: {
          taskId: opt.taskId,
          type: opt.taskType,
          begin: moment().add(-7, 'd').startOf('d').format('YYYY-MM-DD HH:mm'),
          end: moment().endOf('d').format('YYYY-MM-DD HH:mm')
        }
      })
    }
  }
}) 
