
import _ from 'lodash'
import trackService from '../../../models/track/resource'
import { utils } from 'next-reader'
import { APP_TYPE } from '../constants'
import DruidQuery from '../../../models/druid-query/resource'
import { getScreenShot } from '../trackOpertion2'
import { message } from 'antd'
import { getHeatMapFilters, getHeatMapPointData, TEMP_METRIC, HEATMAP_TYPE } from '../../../common/sdk-calc-point-position'
import Fetch from '../../../common/fetch-final'

const Action = {
  getTrackEvents: utils.short_id(),
  getHeatMapData: utils.short_id(),
  change: utils.short_id(),
  saveHeatMap: utils.short_id(),
  getHeatMapScreenshot: utils.short_id(),
  getHeatMapList: utils.short_id(),
  removeHeatMap: utils.short_id(),
  getPageInfo: utils.short_id()
}

const def = {
  iosViewMap: {},
  iosMainView: {},
  currentActivity: {},            //当前页面容器ID
  imgUrl: '',                     //图片Url
  currentUrl: '',                 //页面url
  snapshot: {},                   //当前设备回传信息
  currentImageHash: '',           //当前显示的图片哈希
  appType: '',                    //埋点类型
  deviceInfo: {},                 //是设备信息
  appVersion: null,               //app版本
  iosContent: null,
  saving: false,
  token: '',                        //token
  webViewHashCode: '',              //当前显示的webviewhashcode
  appMultiViews: [],                 //当前页面所有webview元素
  xwalkScreenshots: {},
  isHeatMap: false,
  heatMapData: {},
  datasourceId: '',
  heatMapTimeVisible: false,
  editPageInfo: {},             //当前修改的页面信息
  events: [],
  eventGroups: [],
  displayList: [],
  trackEventMap: {},
  projectId: '',
  screenshotId: '',
  selectEventPath: '',
  isVisualization: true, //noBuried
  pointParams: [],
  pointInfo: {},
  showPointGroup: false,
  showDataInHeatPanel: true,
  previewHeatMap: false,
  eventGroupPosition: {},
  selectPoint: false,
  heatMapList: [], //热图列表
  selectHeatMapKey: '',
  pageMap: {} //页面信息
}

const Actions = {
  //获取已部署事件列表
  async getTrackEvents(state, done) {
    let { token, appVersion } = state
    let { result } = await trackService.eventList({ token, app_version: appVersion })
    let trackEventMap = {}
    if (result && result.length) {
      result.map(p => {
        let eventKey = [p.page, p.event_path].join('::')
        trackEventMap[eventKey] = p
        if (p.event_path_type === APP_TYPE.h5) {
          if (p.similar) {
            // 兼容老数据 当同类选中 但没有:nth-child(n) 就判定为历史数据 生成新规则
            const similarPath = p.similar_path
              ? p.similar_path
              : p.event_path.replace(/:nth-child\([0-9]*\)/g, ':nth-child(n)')
            trackEventMap[eventKey].similar_path = p.similar_path || similarPath
          }
        }
      })
    }
    done({ trackEventMap })
  },

  async getHeatMapData(payload, state, done) {
    const { isVisualization = true, dimFilters = [], heatMapQueryTimeRange } = payload
    const { appType, currentActivity, editPageInfo, datasourceId, showPointGroup, trackEventMap, pointParams } = state
    const { events, eventGroups } = getEvnets(state)
    let { page: pagePath, isH5 } = editPageInfo
    pagePath = isH5 ? pagePath : currentActivity
    const { filters, dimensions } = getHeatMapFilters({ events, eventGroups, app_type: appType, points: pointParams, page_path: pagePath }, isVisualization || showPointGroup ? HEATMAP_TYPE.EVENT : HEATMAP_TYPE.GRID, heatMapQueryTimeRange, dimFilters, '')

    const res = await DruidQuery.query({
      druid_datasource_id: datasourceId,
      timezone: 'Asia/Shanghai',
      granularity: 'P1D',
      filters,
      dimensions,
      splitType: 'groupBy',
      queryEngine: 'tindex',
      customMetrics: [{ name: TEMP_METRIC, formula: '$main.count()', dimName: 'distinct_id', dimParams: {} }],
      dimensionExtraSettings: [{ limit: 999 }]
    })
    let result = _.get(res, 'result.0.resultSet', [])
    const heatMapData = getHeatMapPointData(result, {
      event_groups: eventGroups,
      events,
      dimensions,
      points: pointParams,
      show_point_group: showPointGroup,
      showAllPoint: true
    })
    const eventIdMap = _.keyBy(_.values(trackEventMap), 'event_id')
    done({ isVisualization, heatMapData, trackEventMap: _.keyBy(eventIdMap, p => [p.page, p.event_path].join('::')), previewHeatMap: true })
  },
  async saveHeatMap(store, state, payload, done) {
    let {
      token: appid,
      appVersion: app_version,
      editPageInfo,
      projectId: project_id,
      imgUrl,
      iosContent,
      appType: app_type,
      pointParams,
      currentActivity,
      snapshot,
      heatMapList,
      selectHeatMapKey
    } = state
    let { name, params } = payload
    let { page: pagePath, isH5 } = editPageInfo
    pagePath = (isH5 ? currentActivity + '::' : '') + pagePath
    let { events, eventGroups } = getEvnets(state)
    let screenshotWidth = 0
    let screenshotHeight = 0
    if (app_type === APP_TYPE.android) {
      const width = _.get(snapshot, 'activities.0.serialized_objects.objects.0.width')
      const height = _.get(snapshot, 'activities.0.serialized_objects.objects.0.height')
      const scale = _.get(snapshot, 'activities.0.scale')
      screenshotWidth = width * scale
      screenshotHeight = height * scale
    } else {
      screenshotWidth = iosContent.uiScreenWidth
      screenshotHeight = iosContent.uiScreenHeight
    }
    // if (!events.length && !eventGroups.length) {
    //   message.error('热图没有事件,保存失败')
    //   done({})
    //   return 
    // }
    //过滤屏幕外的事件
    events = events.filter(p => {
      const { top, left, height, width } = p.position
      return height > 0 && width > 0 && top + height > 0 && top < screenshotHeight && left + width > 0 && left < screenshotWidth
    })
    eventGroups = eventGroups.filter(p => {
      const { top, left, height, width } = p.position
      return height > 0 && width > 0 && top + height > 0 && top < screenshotHeight && left + width > 0 && left < screenshotWidth
    })
    const screenshot = await getScreenShot(imgUrl, { position: { screenshotWidth } })
    const data = {
      id: selectHeatMapKey,
      appid,
      app_version,
      page_path: editPageInfo.page,
      events,
      event_groups: eventGroups,
      project_id,
      name,
      app_type,
      points: pointParams.map(p => ({ position: p.position, point: p.point })),
      params
    }
    let result = await trackService.saveHeatMap({ ...data, screenshot })
    if (result.success) {
      const { screenshotId } = result.result
      store.screenShotMap[screenshotId] = screenshot
      done({
        eventGroups: [],
        pointParams: [],
        events: [],
        displayList: [],
        selectEventPath: '',
        heatMapList: [...heatMapList.filter(p => p.id !== selectHeatMapKey), result.result]
      })
      message.success('保存成功')
      return
    }
    message.error('保存失败')
    done({})
  },
  async getHeatMapScreenshot(store, payload, done) {
    let { screenshotId } = payload
    if (!store.screenShotMap[screenshotId]) {
      const res = await trackService.eventScreenshot({ screenshot_id: screenshotId })
      store.screenShotMap[screenshotId] = res.result
      if (res.result) {
        done({})
        return
      }
    }
    done({})
  },

  async getHeatMapList(payload, done) {
    let { projectId, searchKey, appType } = payload
    const res = await Fetch.get('/app/sdk/heat-map/list', { project_id: projectId, pageSize: 100, pageIndex: 1, searchKey, app_type: appType })
    if (res.success) {
      done({ heatMapList: res.result.heatMapList })
      return
    } else {
      message.error('查询失败')
      done({})
      return
    }
  },

  async removeHeatMap(payload, done) {
    let { id } = payload
    const res = await Fetch.get('/app/sdk/heat-map/delete', { id })
    if (res.success) {
      message.success('删除成功')
      done({})
      return
    } else {
      message.error('删除失败')
      done({})
      return
    }
  },
  /**
  * 获取页面信息列表
  *
  * @param {any} query
  * @returns
  */
  async getPageInfo(state, done) {
    let { token, appVersion } = state
    const res = await trackService.getPageInfo({ token, app_version: appVersion })
    if (res.success) {
      let pageMap = _.keyBy(res.result,  p => p.page)
      done({ pageMap })
    } else {
      message.error('获取页面信息列表是失败')
      done({})
    }
  }
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.getTrackEvents:
      return Actions.getTrackEvents(state, done)
    case Action.getPageInfo:
      return Actions.getPageInfo(state, done)
    case Action.getHeatMapData:
      return Actions.getHeatMapData(action.payload, state, done)
    case Action.saveHeatMap:
      return Actions.saveHeatMap(this.store, state, action.payload, done)
    case Action.getHeatMapScreenshot:
      return Actions.getHeatMapScreenshot(this.store, action.payload, done)
    case Action.getHeatMapList:
      return Actions.getHeatMapList(action.payload, done)
    case Action.removeHeatMap:
      return Actions.removeHeatMap(action.payload, done)
    case Action.default:
      return def
    case Action.change:
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...def }
}

export {
  Action
}


function getEvnets(state) {
  let {
    editPageInfo,
    eventGroups,
    displayList,
    iosContent,
    trackEventMap,
    viewMap,
    currentActivity,
    webViewHashCode
  } = state
  let { page: pagePath, isH5 } = editPageInfo
  pagePath = (isH5 ? currentActivity + '::' : '') + pagePath
  //暂时不处理多webview
  let eventPositions = []
  if (iosContent) {
    const htmlNodes = _.get(iosContent, `cachedObjects.${webViewHashCode}.htmlNodes`, [])
    eventPositions = htmlNodes.length ? htmlNodes : _.values(iosContent.pathMap)
  } else {
    const htmlNodes = _.get(viewMap, `${webViewHashCode}.htmlNodes`, [])
    eventPositions = htmlNodes.length ? htmlNodes : _.values(viewMap)
  }
  eventPositions = _.keyBy(eventPositions, p => p.path || p.eventPath)

  let events = _.values(trackEventMap).map(p => {
    if (p.page !== pagePath || displayList.includes(p.event_path)) {
      return false
    }
    const path = webViewHashCode ? JSON.parse(p.event_path).path : p.event_path
    let position = _.get(eventPositions, [path, 'position'])
    if (!position) {
      return false
    }
    return {
      event_id: p.event_id,
      position: {
        width: position.width,
        height: position.height,
        left: _.isUndefined(position.left) ? position.x : position.left,
        top: _.isUndefined(position.top) ? position.y : position.top
      },
      event_name: p.event_name
    }
  }).filter(_.identity)

  eventGroups = _.values(eventGroups).map(p => {
    if (displayList.includes(p.event_path)) {
      return false
    }
    let position = _.get(eventPositions, [p.event_path, 'position'])
    if (!position) {
      return false
    }
    return {
      ...p,
      position: {
        width: position.width,
        height: position.height,
        left: position.left || position.x,
        top: position.top || position.y
      }
    }
  }).filter(_.identity)
  return {
    events,
    eventGroups
  }
}
