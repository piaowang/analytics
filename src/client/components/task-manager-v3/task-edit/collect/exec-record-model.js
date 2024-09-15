import _ from 'lodash'
import moment from 'moment'
import { message } from 'antd'

import Fetch from '../../../../common/fetch-final'
import { toQueryParams, tryJsonParse } from '../../../../../common/sugo-utils'
import { recvJSON } from '../../../../common/fetch-utils'

// 实时采集 - 执行记录 model
export const namespace = 'realtime-collect-execute-record'

export default props => ({
  namespace,
  state: {
    queryParams: {}, //执行列表查询参数
    recordList: [], // 执行记录列表数据
    total: 0, // 执行记录总数
    searchStartTime: '', // 开始时间
    searchEndTime: '', // 结束时间
    pageNum: 1, // 页码
    pageSize: 10, // 每页条数
    collectList: [], // 采集条数数据
    loading: false,
    collectTypes: [],
    lastErrorList: [],
    lastErrorType: [],
    streamLoadData: []
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
     * 获取执行记录列表
     * @param {*} param0
     * @param {*} param1
     */
    *queryExecRecord({ payload }, { call, put, select }) {
      const queryParams = yield select(state => state[namespace].queryParams || {})
      if (!payload) {
        payload = queryParams
      }
      const { page = 1, size = 10, type = 'project', begin, end, projectId } = payload
      let params = {
        ...queryParams,
        page,
        size,
        begin: moment(begin).format('MM/DD/YYYY HH:mm'),
        end: moment(end).format('MM/DD/YYYY HH:mm'),
        type,
        projectId
      }
      params = _.pickBy(params, _.identity)
      // 存储列表查询条件以便后面停止或重启操作后刷新列表
      yield put({
        type: 'changeState',
        payload: {
          queryParams: params,
          loading: true
        }
      })
      params = toQueryParams(params)
      // 执行历史
      const url = `/app/task-schedule-v3/history?action=fetchAllHistory&${params}`
      const res = yield call(Fetch.get, url, null)
      if (_.get(res, 'status', '') !== 'success') {
        return message.error('获取失败!')
      }
      const historyFlows = _.get(res, 'historyFlows', [])
      const rList = _.map(historyFlows, item => {
        const { first = {}, second = {} } = item
        return { ...first, ...second }
      }).filter(_.identity)
      if (page !== 1) {
        yield put({
          type: 'changeState',
          payload: {
            pageNum: page,
            pageSize: size,
            total: res.totalNum || 0,
            recordList: rList,
            loading: false
          }
        })
        return
      }
      let runningParams = {
        type,
        projectId: projectId || props.projectId
      }
      runningParams = _.pickBy(runningParams, _.identity)
      runningParams = toQueryParams(runningParams)
      // 正在执行
      const runningUrl = `/app/task-schedule-v3/history?action=getRunningFlows&${runningParams}`
      const res2 = yield call(Fetch.get, runningUrl, null)
      if (_.get(res2, 'status', '') !== 'success') {
        return message.error('获取失败!')
      }
      const runningFlows = _.get(res2, 'runningFlows', [])
      const rList2 = _.map(runningFlows, item => {
        const { first = {}, second = {} } = item
        return { ...first, ...second }
      }).filter(_.identity)
      yield put({
        type: 'changeState',
        payload: {
          pageNum: page,
          pageSize: size,
          total: res.totalNum + rList2.length || 0,
          recordList: [...rList2, ...rList],
          loading: false
        }
      })
    },
    /**
     * 根据执行ID请求jobId
     * @param {*} param0
     * @param {*} param1
     */
    *queryExecJobId({ payload }, { call, put }) {
      const { executionId, isRunning, cb } = payload
      if (!executionId) return message.error('缺少 executionId ')
      const url = `/app/task-schedule-v3/executor?execid=${executionId}&action=fetchexecflow`
      message.warning('正在请求...')
      const res = yield call(Fetch.get, url, null)
      if (_.isEmpty(res)) return message.error('请求失败')
      let jobId = _.get(res, 'nodes', []).find(p => p.type === 'realtimeCollect')?.id
      if (isRunning) {
        const runningNode = _.find(res.nodes, item => item.status === 'RUNNING') || {}
        jobId = runningNode.id
      }
      if (!jobId) return message.error('请求失败')
      message.success('请求成功')
      cb && cb(executionId, jobId)
    },
    /**
     * 请求概览采集条数
     * @param {*} param0
     * @param {*} param1
     */
    *queryCollect({ payload }, { call, put }) {
      const { projectId, executionId } = payload
      if (!projectId) return
      const url = `/app/task-schedule-v3/realtime?action=queryCollect&projectId=${projectId}&execId=${executionId}`
      const res = yield call(Fetch.get, url, null)
      if (res.status !== 'success') {
        yield put({
          type: 'changeState',
          payload: { collectList: [] }
        })
        return message.error(res.message)
      }
      const collectTypes = _.keys(res.result)
      const collectList = _.mapValues(res.result, p => {
        return _.reduce(
          p,
          (r, v, k) => {
            const data = _.keys(v).map(info => {
              let streamLoadResult = {}
              try {
                streamLoadResult = v[info].streamLoadResult
                _.forEach(streamLoadResult, (value, key) => {
                  streamLoadResult[key] = JSON.parse(value)
                })
              } catch (error) {
                console.log('streamLoadResult error')
              }
              return {
                ..._.get(v, [info, 'operatorCount'], {}),
                inputTable: k,
                outTable: info,
                FAIL: v[info].streamLoadCount.FAIL,
                LOADEDROWS: v[info].streamLoadCount.LOADEDROWS,
                SUCESS: v[info].streamLoadCount.SUCESS,
                streamLoadResult: streamLoadResult,
                lastUpdateTime: v[info].lastUpdateTime,
                status: v[info].status,
                dbType: v[info].dbType
              }
            })
            return [...r, ...data]
          },
          []
        )
      })

      yield put({
        type: 'changeState',
        payload: { collectList, collectTypes }
      })
    },
    /**
     * 查看最后报错信息
     * @param {*} param0
     * @param {*} param1
     */
    *queryLastErrorLog({ payload }, { call, put }) {
      const { executionId } = payload
      if (!executionId) return
      const url = `/app/task-schedule-v3/realtime?action=queryLastErrorLog&execId=${executionId}`
      const res = yield call(Fetch.get, url, null)
      if (res.status !== 'success') {
        yield put({
          type: 'changeState',
          payload: { lastErrorList: [] }
        })
        return message.error(res.message)
      }

      let lastErrorList = {}
      _.mapKeys(res.result, (value, key) => {
        _.mapKeys(value, (vv, vk) => {
          console.log(vv, vk)
          lastErrorList[`${key}.${vk}`] = vv
        })
      })
      const lastErrorTypes = _.keys(lastErrorList)

      yield put({
        type: 'changeState',
        payload: { lastErrorList, lastErrorTypes }
      })
    },
    /**
     * 停止执行
     * @param {*} param0
     * @param {*} param1
     */
    *cancelExec({ payload }, { call, put }) {
      const { executionId } = payload
      if (!executionId) return
      const url = `/app/task-schedule-v3/executor?action=cancelFlow`
      message.warning('停止中...')
      const res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ execid: executionId })
      })
      //刷新执行记录列表
      yield put.resolve({
        type: 'queryExecRecord'
      })
      // 刷新实时采集左侧树对应数据列表
      yield put.resolve({
        type: 'taskV3EditModel/getRealTimeCollectByProjectId',
        payload: {
          id: props.taskProjectId
        }
      })
      if (res.status !== 'success') {
        return message.error(res.message || res.error)
      }
      message.success('停止成功!')
    },
    /**
     * 重新启动
     * @param {*} param0
     * @param {*} param1
     */
    *restart({ payload }, { call, put }) {
      const { executionId } = payload
      if (!executionId) return
      const url = `/app/task-schedule-v3/executor?action=retryJob`
      message.warning('重新启动中...')

      const res = yield call(Fetch.post, url, null, {
        ...recvJSON,
        body: JSON.stringify({ execid: executionId })
      })
      //刷新执行记录列表
      yield put.resolve({
        type: 'queryExecRecord'
      })
      // 刷新实时采集左侧树对应数据列表
      yield put.resolve({
        type: 'taskV3EditModel/getRealTimeCollectByProjectId',
        payload: {
          id: props.taskProjectId
        }
      })
      if (res.status !== 'success' && res.status != 'restart success') {
        return message.error(res.message)
      }
      message.success('重新启动成功!')
    }
  },
  subscriptions: {}
})
