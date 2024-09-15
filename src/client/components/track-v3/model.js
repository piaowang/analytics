/**
 * cratedBy xujun at 2020/07/08
 * 埋点数据交互的model
 */

import { message } from 'antd'
import _ from 'lodash'
import {
  getTrackEventsDraft,
  delTrackEventsDraft,
  saveTrackEventsDraft,
  getPageInfoDraft,
  delPageInfoDraft,
  savePageInfoDraft,
  deployEvent,
  getAppVersionList,
  copyEvents,
  getDimensionList,
  getEventSreenshot,
  getAutoTrackEvents,
  saveAutoTrackEvents,
  delAutoTrackEvent
} from '../../services/sdk'
import { APP_TRACK_TYPE, APP_TYPE } from './constants'

export const namespace = 'trackEventV3'

export const pageSize = 12
export default (props) => ({
  namespace,
  state: {
    loading: false,       // 页面加载
    pageLoading: false,   // page页面load
    eventLoading: false,  // 事件类型loading
    trackEventMap: {},    // 事件埋点map信息 (可视化埋点数据或全埋点圈选数据)
    similarEventMap: {},  // 同类埋点map信息
    crossPageEventArr: [],// 全局埋点集合信息 
    dimensions: [],       // 维度信息
    pageMap: {},          // 页面map信息
    appVersions: [],     // appVersion列表
    eventCopyModalVisible: false// 是否显示复制埋点
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
     * 获取草稿的事件列表
     * @param {*} action 
     * @param {*} effects 
     */
    *getTrackEventList(action, effects) {
      const { token, appVersion, showEventCopy = false } = action.payload
      const { trackType = APP_TRACK_TYPE.track } = props.location.query
      const res = yield effects.call(getTrackEventsDraft, token, appVersion)
      if (!res?.data?.length && trackType === APP_TRACK_TYPE.track && showEventCopy) {
        yield effects.put({
          type: 'changeState',
          payload: { eventCopyModalVisible: true }
        })
      }
      if (res?.data) {
        const trackEventMap = _.keyBy(res.data, p => {
          if (p.event_path_type === APP_TYPE.h5) {
            try {
              const { path } = JSON.parse(p.event_path)
              return `${p.page}::${path}::0`
            } catch (e) {
              console.log('----------h5内容转换错误')
              return `${p.page}::${p.event_path}`
            }
          }
          return p.event_path
            ? p.event_id
            : `${p.sugo_autotrack_page_path}::${p.sugo_autotrack_path}::${p.sugo_autotrack_position}`
        })
        yield effects.put({ type: 'changeState', payload: { trackEventMap } })
        return
      }
      message.error('数据获取失败')
    },

    /**
     * 保存埋点信息
     * @param {*} action 
     * @param {*} effects 
     */
    *saveEvent({ payload, callback }, effects) {
      const { token, appVersion, events } = payload
      const res = yield effects.call(saveTrackEventsDraft, token, appVersion, events)
      if (res?.result?.success) {
        yield effects.put({
          type: 'getTrackEventList',
          payload: { token, appVersion }
        })
        callback && callback()
        return message.success('事件保存成功')
      }
      message.error('事件保存失败')
    },

    /**
     * 删除埋点信息
     * @param {*} action 
     * @param {*} effects 
     */
    *deleteEvent({ payload, callback }, effects) {
      const { token, appVersion, event } = payload
      const events = [{ ...event, opt: 'delete' }]
      const res = yield effects.call(delTrackEventsDraft, token, appVersion, events)
      if (res?.result?.success) {
        yield effects.put({
          type: 'getTrackEventList',
          payload: { token, appVersion }
        })
        callback && callback()
        message.success('事件删除成功')
        return
      }
      message.error('事件删除失败')
    },

    /**
     * 获取页面信息
     * @param {*} action 
     * @param {*} effects 
     */
    *getPageList(action, effects) {
      const { token, appVersion } = action.payload
      const res = yield effects.call(getPageInfoDraft, token, appVersion)
      if (res?.result) {
        const pageMap = _.keyBy(res.result, p => p.page)
        yield effects.put({
          type: 'changeState',
          payload: { pageMap }
        })
        return
      }
      message.error('数据获取失败')
    },

    /**
     * 保存页面信息
     * @param {*} action
     * @param {*} effects
     */
    *savePage(action, effects) {
      const { pageInfos, token, appVersion } = action.payload
      const res = yield effects.call(savePageInfoDraft, pageInfos, token, appVersion)
      if (res?.result?.rows) {
        yield effects.put({
          type: 'getPageList',
          payload: { token, appVersion }
        })
        return message.success('保存成功')
      }
      message.error('数据获取失败')
    },

    /**
     * 删除页面信息
     * @param {*} action 
     * @param {*} effects 
     */
    *deletePage(action, effects) {
      const { pageInfoId, token, appVersion } = action.payload
      const res = yield effects.call(delPageInfoDraft, pageInfoId)
      if (res?.result) {
        message.success('页面信息删除成功')
        yield effects.put({
          type: 'getPageList',
          payload: { token, appVersion }
        })
        return
      }
      message.error('页面信息删除失败')
    },

    /**
     * 部署埋点信息
     * @param {*} action 
     * @param {*} effects 
     */
    *deployTrackEvent(action, effects) {
      const { token, appVersion } = action.payload
      const res = yield effects.call(deployEvent, token, appVersion)
      if (res?.result?.success) {
        return message.success('部署成功')
      }
      message.error('部署失败')
    },

    /**
     * 已埋点版本信息
     * @param {*} action 
     * @param {*} effects 
     */
    *getAppVersionList(action, effects) {
      const { token } = action.payload
      const res = yield effects.call(getAppVersionList, token)
      if (res?.rows) {
        yield effects.put({
          type: 'changeState',
          payload: { appVersions: res?.rows }
        })
        return
      }
      message.error('获取版本集合信息错误')
    },
    /**
     * 复制已埋点版本信息
     * @param {*} action 
     * @param {*} effects 
     */
    *copyAppVersion({ payload }, effects) {
      const { token, appVersion, copyVersion } = payload
      const res = yield effects.call(copyEvents, token, appVersion, copyVersion)
      if (res?.result) {
        yield effects.put({
          type: 'changeState',
          payload: { eventCopyModalVisible: false }
        })
        yield effects.put({
          type: 'getTrackEventList',
          payload: { token, appVersion }
        })
        yield effects.put({
          type: 'getPageList',
          payload: { token, appVersion }
        })
        return
      }
      message.error('复制版本信息失败')
    },
    /**
     * 获取维度信息
     * @param {*} action 
     * @param {*} effects 
     */
    *getDimensions(action, effects) {
      const { token } = action.payload
      const res = yield effects.call(getDimensionList, token)
      if (res?.result) {
        yield effects.put({
          type: 'changeState',
          payload: { dimensions: res?.result }
        })
        return
      }
      message.error('获取维度信息失败')
    },
    /**
     * 获取截图信息
     * @param {*} action 
     * @param {*} effects 
     */
    *getEventSreenshot({ payload, callback }, effects) {
      const { token, appVersion, screenshotId } = payload
      const res = yield effects.call(getEventSreenshot, token, appVersion, screenshotId)
      if (res?.result) {
        callback && callback(res?.result)
        return
      }
      message.error('获取事件截图信息失败')
    },
    /**
     * 获取全埋点圈选事件列表
     * @param {*} action 
     * @param {*} effects 
     */
    *getAutoTrackEventList(action, effects) {
      const { token } = action.payload
      const res = yield effects.call(getAutoTrackEvents, token)
      if (res?.result?.data) {
        const trackEventMap = _.keyBy(res.result.data, p => {
          return `${p.sugo_autotrack_page_path}::${p.sugo_autotrack_path}::${p.sugo_autotrack_position}`
        })
        yield effects.put({ type: 'changeState', payload: { trackEventMap } })
        return
      }
      message.error('数据获取失败')
    },
    /**
    * 保存埋点信息
    * @param {*} action 
    * @param {*} effects 
    */
    *saveAutoEvent({ payload, callback }, effects) {
      const { token, events } = payload
      const res = yield effects.call(saveAutoTrackEvents, token, events)
      if (res?.result?.success) {
        yield effects.put({
          type: 'getAutoTrackEventList',
          payload: { token }
        })
        callback && callback()
        return message.success('事件保存成功')
      }
      message.error('事件保存失败')
    },

    /**
     * 删除全埋点圈选信息
     * @param {*} action 
     * @param {*} effects 
     */
    *deleteAutoEvent({ payload }, effects) {
      const { token, event } = payload
      const res = yield effects.call(delAutoTrackEvent, token, event?.id, event?.screenshot_id, true)
      if (res?.result?.success) {
        yield effects.put({
          type: 'getAutoTrackEventList',
          payload: { token }
        })
        message.success('事件删除成功')
        return
      }
      message.error('事件删除失败')
    }
  }
})
