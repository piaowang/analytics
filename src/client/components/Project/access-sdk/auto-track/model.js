import { TEMP_METRIC } from 'client/common/sdk-calc-point-position'
import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import DruidQuery from '../../../../models/druid-query/resource'
import trackService from '../../../../models/auto-track/resource'
import { immutateUpdate } from '~/src/common/sugo-utils'

export const namespace = 'sdkAutoTrack'

export default props => ({
  namespace,
  state: {
    screenShotUrl: '',
    list: [],
    loading: false,
    showEventInfo: false,
    selectId: '',
    viewModel: '',
    title: '',
    entry: '',
    screenshotMap: {}
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
    * @description 获取已圈选的事件热图列表
    * @param {any} { payload }
    * @param {any} { call, select }
    */
    *getEventList({ payload }, { call, put }) {
      yield put({
        type: 'changeState',
        payload: { loading: true }
      })
      let token = _.get(props, 'analysis.id', '')
      let datasourceId = _.get(props, 'project.datasource_id', '')
      const res = yield call(Fetch.get, '/app/sdk-auto-track/get/track-events', { token, app_version: 0 })
      if (res && res.result && res.result.data) {
        // TODO 接入分类学查询字段不一样
        // if ()
        const autotrackPath = res.result.data.map(p => p.sugo_autotrack_path)
        const autotrackPagePath = res.result.data.map(p => p.sugo_autotrack_page_path)
        let data = {}
        const statusData = yield call(DruidQuery.query, {
          druid_datasource_id: datasourceId,
          timezone: 'Asia/Shanghai',
          granularity: 'P1D',
          filters: [{
            col: 'sugo_autotrack_path',
            'op': 'in',
            'eq': autotrackPath,
            'type': 'string'
          }, {
            col: 'sugo_autotrack_page_path',
            'op': 'in',
            'eq': autotrackPagePath,
            'type': 'string'
          }, {
            col: 'token',
            op: 'in',
            eq: [token],
            dateStringComparingFormat: null
          }, {
            col: '__time',
            op: 'in',
            eq: '-7 days',
            dateStringComparingFormat: null
          }],
          dimensions: ['sugo_autotrack_path'],
          splitType: 'groupBy',
          queryEngine: 'tindex',
          customMetrics: [{ name: TEMP_METRIC, formula: '$main.count()', dimName: 'distinct_id', dimParams: {} }],
          dimensionExtraSettings: [{ sortCol: 'sugo_autotrack_path', sortDirect: 'asc', limit: 100 }]
        })
        if (_.get(statusData, 'result.0.resultSet.length')) {
          data = _.reduce(_.get(statusData, 'result.0.resultSet'), (r, v) => {
            r[v.sugo_autotrack_path] = v[TEMP_METRIC]
            return r
          }, {})
        }
        yield put({
          type: 'changeState',
          payload: {
            list: res.result.data.map(p => {
              return {
                ...p,
                status: _.get(data, [p.sugo_autotrack_path], 0) ? true : false
              }
            }),
            loading: false
          }
        })
      } else {
        message.warn('获取事件列表失败')
        yield put({
          type: 'changeState',
          payload: { loading: false }
        })
      }
    },
    *getEventData({ payload }, { call, put, select }) {
      let token = _.get(props, 'analysis.id', '')
      let datasourceId = _.get(props, 'project.datasource_id', '')
      const { autotrackPath, id, autotrackPagePath } = payload
      const { list } = yield select(state => state[namespace])
      let index = _.findIndex(list, p => p.id === id)
      if (index < 0 || _.get(list, [index, 'eventData', 'length'])) {
        return
      }
      const res = yield call(DruidQuery.query, {
        druid_datasource_id: datasourceId,
        timezone: 'Asia/Shanghai',
        granularity: 'P1D',
        filters: [{
          col: 'sugo_autotrack_path',
          'op': 'in',
          'eq': [autotrackPath],
          'type': 'string'
        }, {
          col: 'sugo_autotrack_page_path',
          'op': 'in',
          'eq': [autotrackPagePath],
          'type': 'string'
        }, {
          col: 'token',
          op: 'in',
          eq: [token],
          dateStringComparingFormat: null
        }, {
          col: '__time',
          op: 'in',
          eq: '-7 days',
          dateStringComparingFormat: null
        }],
        dimensions: ['__time'],
        splitType: 'groupBy',
        queryEngine: 'tindex',
        customMetrics: [{ name: TEMP_METRIC, formula: '$main.count()', dimName: 'distinct_id', dimParams: {} }],
        dimensionExtraSettings: [{ sortCol: '__time', sortDirect: 'asc', limit: 10 }]
      })
      if (res && _.get(res, 'result.0.resultSet.length')) {

        const newList = immutateUpdate(list, `[${index}].eventData`, () => _.get(res, 'result.0.resultSet'))
        yield put({
          type: 'changeState',
          payload: { list: newList, loading: false }
        })
      } else {
        // message.warn('获取数据失败')
        yield put({
          type: 'changeState',
          payload: { loading: false }
        })
      }
    },
    /**
    * 保存事件
    *
    * @param {any} data
    * @returns
    */
    *saveEvent({ payload }, { call, select, put }) {
      const { list, selectId } = yield select(state => state[namespace])
      let editEventInfo = list.find(p => p.id === selectId) || {}
      const { event_name, event_memo } = payload
      editEventInfo = {
        ..._.omit(editEventInfo, ['eventData']),
        event_name,
        event_memo,
        opt: 'update'
      }

      const res = yield call(trackService.saveEvent, { token: editEventInfo.appid, events: [editEventInfo] })

      if (res.success) {
        yield put({
          type: 'changeState',
          payload: { showEventInfo: false }
        })
        yield put({ type: 'getEventList', payload: {} })
        message.success('保存成功')
      } else {
        message.warn('保存失败')
      }
    },
    /**
    * 保存事件
    *
    * @param {any} data
    * @returns
    */
    *deleteEvent({ payload }, { call, put }) {
      let token = _.get(props, 'analysis.id', '')
      const { id, screenshot_id } = payload
      const res = yield call(trackService.delEvent, {
        token,
        id,
        screenshot_id,
        isMobile: true
      })
      if (res.success) {
        yield put({ type: 'getEventList', payload: {} })
        message.success('删除成功')
      } else {
        message.warn('删除失败')
      }
    },
    /**
     * 获取截图信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *getScreenshot({ payload }, { call, put, select }) {
      const { screenshotMap } = yield select(state => state[namespace])
      let { screenshotId, id } = payload
      if (_.get(screenshotMap, screenshotId, '')) {
        return
      }
      const res = yield call(trackService.eventScreenshot, { screenshot_id: screenshotId })
      if (res && _.get(res, 'result')) {
        const newList = immutateUpdate(screenshotMap, screenshotId, () => res.result)
        yield put({
          type: 'changeState',
          payload: { screenshotMap: newList, loading: false }
        })
      } else {
        yield put({
          type: 'changeState',
          payload: { loading: false }
        })
        message.warn('获取截图信息错误')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getEventList', payload: {} })
    }
  }
})
