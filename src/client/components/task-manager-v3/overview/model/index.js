// 任务调度管理
import Fetch from 'client/common/fetch-final'
import moment from 'moment'
import * as constants from './../../constants'

export const namespace = 'dbConnectCenterManagerModel'

export default () => ({
  namespace,
  state: {
    allInfo: [], //明细表格的数据
    selectedProjectId: '', //当前选中的项目id，空表示查询全部
    selectedType: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.OFFLINE, //项目类型，离线开发/实时开发
    selectedGroup: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT, //类型(工作流project   工作流组group) 默认project
    execTimes: [], //执行时长top10
    failedTimes: [], //执行失败top10
    projectList: [{ id: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.ALL, name: '全部' }], //所有的项目列表
    offLineStatistics: [], //离线数据总览统计,工作流
    offLineStatisticGroups: [], //离线数据总览统计,工作流
    realTimeStatistics: [], //实时数据总览统计
    selectedTime: 12, //查询的是最近多少个小时的数据,默认十二个小时
    taskGroups: null, //选中的工作流组,初始化为null是为了跟返回空数组的时候区分
    tasks: null //选中的工作流，初始化为null是为了跟返回空数组的时候区分
  },
  reducers: {
    // 返回的数组key是英文的，需要转化为中文
    changeColumnName(state, { payload }) {
      const objectKeyName = Object.keys(payload)[0]
      // 防止出现负数以及小数
      return {
        ...state,
        [objectKeyName]: [
          {
            name: '排队中',
            value: Math.floor(Math.abs(payload[objectKeyName].queued))
          },
          {
            name: '待运行',
            value: Math.floor(Math.abs(payload[objectKeyName].ready))
          },
          {
            name: '运行中',
            value: Math.floor(Math.abs(payload[objectKeyName].running))
          },
          {
            name: '终止中',
            value: Math.floor(Math.abs(payload[objectKeyName].killing))
          },
          {
            name: '停止',
            value: Math.floor(Math.abs(payload[objectKeyName].killed))
          },
          {
            name: '成功',
            value: Math.floor(Math.abs(payload[objectKeyName].success))
          },
          {
            name: '失败',
            value: Math.floor(Math.abs(payload[objectKeyName].failed))
          },
          {
            name: '已取消',
            value: Math.floor(Math.abs(payload[objectKeyName].cancelled))
          }
        ]
      }
    },
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    //查询所有的项目
    *getProjectList({ }, { call, put }) {
      let url = '/app/task-schedule-v3/get-project'
      const response = yield call(Fetch.get, url)
      const { result = [], success } = response
      if (success) {
        result.unshift({ name: '全部', id: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.ALL })
        yield put({
          type: 'changeState',
          payload: {
            projectList: result
          }
        })
      }
    },
    //根据项目id去获取所有的工作流/工作流组的信息
    *getAllTasksByProjectId({ payload }, { select, call, put }) {
      let url = '/app/task-v3/get-all-tasks-projectId'
      const response = yield call(Fetch.get, url, payload)
      const {
        result: { taskGroups = [], tasks = [] },
        success
      } = response
      if (success) {
        yield put({
          type: 'changeState',
          payload: {
            taskGroups,
            tasks
          }
        })
      }
    },

    //离线任务总览统计
    // 默认查询最近12个小时，工作流，全部的
    *getOffLineDataByProjectId({ payload }, { select, call, put }) {
      const { projectIds = '', selectedTime = 12, isGroup = false } = payload
      let url = `/app/task-schedule-v3/history?action=fetchTaskStatistics&projectIds=${projectIds}&type=offline&end=${moment().format(
        'MM/DD/YYYY HH:mm'
      )}:59&begin=${moment().subtract('hours', selectedTime).format('MM/DD/YYYY HH:mm')}:00&type=${isGroup ? 'group' : 'flow'}`
      const response = yield call(Fetch.get, url)
      const { counts = [] } = response
      let keyName = isGroup ? 'offLineStatisticGroups' : 'offLineStatistics'
      yield put({
        type: 'changeColumnName',
        payload: {
          [keyName]: counts
        }
      })
    },

    //任务时长top10/任务失败top10,默认12个小时，工作流，无工作流id
    *getDataTopByProjectIds({ payload }, { select, call, put }) {
      const { projectIds = '', selectedTime = 12, selectedGroup = constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT } = payload
      let url = `/app/task-schedule-v3/history?action=fetchTopExecRecord&projectIds=${projectIds}&type=${selectedGroup}&order=desc&end=${moment().format(
        'MM/DD/YYYY HH:mm'
      )}:59&begin=${moment().subtract('hours', selectedTime).format('MM/DD/YYYY HH:mm')}:00`
      const response = yield call(Fetch.get, url)
      const { allInfo, failedTimes = [], execTime = [] } = response
      // 返回的数据没有success，所以不做success判定
      yield put({
        type: 'changeState',
        // 防止时间出现负数等
        payload: {
          allInfo: allInfo,
          failedTimes: failedTimes.map(e => ({ ...e, value: e.times, show: e.times, name: e.showName })),
          execTimes: execTime.map(e => ({ ...e, value: (e.endTime - e.submitTime) / 1000, show: (e.endTime - e.submitTime) / 1000, times: (e.endTime - e.submitTime) / 1000, name: e.showName }))
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getProjectList' })
    }
  }
})
