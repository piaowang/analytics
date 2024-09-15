import { getHeatMapFilters, convertWebHeatMapData, TEMP_METRIC, Relation_Field, HEATMAP_TYPE } from 'client/common/sdk-calc-point-position'
import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { HEATMAP_VIEW_TYPE, RESOLUTION } from './constants'
import shortid from 'shortid'
import { message } from 'antd'
/** web热图数据状态 */
export const namespace = 'webHeatMap'

const callback = 'Callback'

const customMetrics = [
  { name: TEMP_METRIC, formula: '$main.count()', dimName: 'distinct_id', dimParams: {} }
]

/** 给子窗口发送消息 */
export const sendMessage2Iframe = (win, data, origin = '*') => {
  if (win) (
    win.postMessage(data, origin)
  )
}

/**
 * Web热图model
 */
export default {
  namespace,
  state: {
    viewType: HEATMAP_VIEW_TYPE.NORMAL,
    heatmapType: HEATMAP_TYPE.EVENT,
    heatMapWindow: null,
    currentUrl: '',
    staticUrl: '',
    userGroupId: '', // 分群id
    visiblePopoverKey: false,
    timeRange: '-7 days',
    dimensionFilters: [{ col: 'sugo_lib', op: 'in', eq: ['web'] }],
    heatMapInfo: {},
    dataEvents: [], // 事件热图数据列表
    loading: false,
    projectError: false,
    projectErrorInfo: {},
    resolution: RESOLUTION.WEB, // 站点浏览分辨率 web/mobile
    resolutionStyle: {
      width: '100%',
      height: '100%'
    },
    heatmap: {}, // 已圈选热图配置列表
    heatMapList: [],
    selectKey: '',
    shortUrl: '',
    visibleSaveModal: false,
    heatMapName: '',
    showSaveSliceModal: false,
    relationType: Relation_Field.eventId,
    pageName: '',
    showImportHeatmap: false,
    token: ''
  },
  reducers: {
    change(state, { payload }) {
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
    *getEditorEventGroups({ payload }, { call, select, put }) {
      const { heatMapWindow, heatMapList, selectKey, heatmap: oldHeatMap } = yield select(state => state[namespace])
      const { type, viewType, heatmapType, pathname } = payload
      const heatmap = selectKey ? heatMapList.find(p => p.id === selectKey) : oldHeatMap
      yield put({
        type: 'change',
        payload: {
          heatmap
        }
      })
      if (type === 'getEditorEventGroups') {
        sendMessage2Iframe(heatMapWindow, {
          type: `${type}${callback}`, // getEditorEventGroupsCallback
          payload: {
            viewType,
            heatmapType,
            list: _.isEmpty(heatmap) ? [] : [heatmap]
          }
        })
      }
    },

    /**
    * @description 事件列表选择
    * @param {any} { payload }
    * @param {any} { call, select }
    */
    *selectHeatMapItem({ payload }, { call, select, put }) {
      const { heatMapWindow, heatMapList, heatmapType, selectKey: oldSelectKey, viewType: oldViewType } = yield select(state => state[namespace])
      const { selectKey, viewType } = payload

      if (!selectKey) {
        return
      }

      const heatmap = heatMapList.find(p => p.id === selectKey)

      if (_.isEmpty(heatmap)) {
        return
      }

      let data = {}
      let list = []
      if (oldSelectKey === selectKey) {
        data = {
          heatmap: {},
          selectKey: '',
          heatMapName: '',
          dimensionFilters: [],
          userGroupId: '',
          relationType: Relation_Field.eventId
        }
      } else {
        list = [heatmap]
        data = {
          heatmap,
          selectKey,
          currentUrl: _.get(heatmap, 'params.url', ''),
          viewType,
          heatMapName: heatmap.name,
          dimensionFilters: _.get(heatmap, 'params.filters', []),
          userGroupId: _.get(heatmap, 'params.userGroupId', ''),
          relationType: _.get(heatmap, 'params.relation_type', Relation_Field.eventId),
          timeRange: _.get(heatmap, 'params.timeRange', '-7 days')
        }
      }

      yield put({
        type: 'change',
        payload: data
      })
      sendMessage2Iframe(heatMapWindow, {
        type: `getEditorEventGroups${callback}`, // getEditorEventGroupsCallback
        payload: {
          viewType,
          heatmapType,
          list
        }
      })
    },

    /**
     * @description 删除事件热图圈选记录（方法名固定与sdk保持一致）
     * @param {any} { payload }
     * @param {any} { select, call } 
     */
    *removeEventGroup({ payload }, { select, call, put }) {
      const { heatMapWindow, heatmap } = yield select(state => state[namespace])
      const { id, viewType, heatmapType, type } = payload
      let newHeatMapData = _.cloneDeep(heatmap)
      if (heatmapType === HEATMAP_TYPE.EVENT) {
        newHeatMapData = { ...newHeatMapData, event_groups: newHeatMapData.event_groups.filter(p => p.id !== id) }
      } else {
        newHeatMapData = { ...newHeatMapData, points: newHeatMapData.points.filter(p => p.id !== id) }
      }

      yield put({ type: 'change', payload: { heatmap: newHeatMapData } })
      sendMessage2Iframe(heatMapWindow, {
        type: `${type}${callback}`, // removeEventGroupCallback
        payload: {
          viewType,
          heatmapType,
          id,
          success: true
        }
      })
    },
    /**
     * @description 查询事件名称列表（可搜索）（方法名固定与sdk保持一致）
     * @param {any} { payload }
     * @param {any} { select, call }
     */
    *getEventNames({ payload }, { select, call }) {
      const { heatMapWindow } = yield select(state => state[namespace])
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      const { query, type, viewType, heatmapType } = payload
      const { datasource_id: datasourceId } = projectCurrent
      const result = yield call(Fetch.post, '/app/slices/query-druid', {
        druid_datasource_id: datasourceId,
        timezone: 'Asia/Shanghai',
        dimensions: ['event_name'],
        granularity: 'P1D',
        filters: query ? [{ 'col': 'event_name', 'op': 'startsWith', 'eq': [query] }] : [],
        dimensionExtraSettings: [{ 'sortCol': 'count', 'sortDirect': 'desc', 'limit': 10 }],
        customMetrics: [{ 'name': 'count', 'formula': '1' }],
        groupByAlgorithm: 'topN',
        queryEngine: 'tindex'
      })
      const resultSet = _.get(result, '0.resultSet', [])
      sendMessage2Iframe(heatMapWindow, {
        type: `${type}${callback}`, // getEventNamesCallback
        payload: {
          viewType,
          heatmapType,
          list: resultSet
        }
      })
    },
    /**
     * @description 获取热图数据（方法名固定与sdk保持一致）
     * @param {any} { payload }
     * @param {any} { select, call, put, take } 
     */
    *getHeatmapData({ payload }, { select, call, put, take }) {
      const {
        timeRange,
        userGroupId,
        dimensionFilters,
        // heatMapInfo: stateHeatMapInfo,
        heatMapWindow,
        resolutionStyle,
        resolution,
        relationType
      } = yield select(state => state[namespace])
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      const { type, app_type = 'web', pathname: page_path, queryRelativeTime = timeRange, viewType, heatmapType } = payload
      const { datasource_id: datasourceId } = projectCurrent
      // 查询已圈选的配置
      yield put({
        type: 'getEditorEventGroups',
        payload: {
          type: 'getList',
          page_path,
          viewType,
          heatmapType,
          pathname: page_path
        }
      })
      const { payload: { heatmap = {} } } = yield take('change') // 等待getEditorEventGroups执行完
      const heatMapInfo = {
        page_path,
        app_type
      }

      const baseQuerConfig = {
        druid_datasource_id: datasourceId,
        timezone: 'Asia/Shanghai',
        granularity: 'P1D',
        dimensionExtraSettings: [{ limit: 999 }],
        customMetrics,
        splitType: 'groupBy',
        queryEngine: 'tindex'
      }

      //***************** 获取事件数据 *************************
      const { filters, dimensions } = getHeatMapFilters(heatMapInfo, HEATMAP_TYPE.EVENT, queryRelativeTime, dimensionFilters, userGroupId)
      const result = yield call(Fetch.post, '/app/slices/query-druid', {
        ...baseQuerConfig,
        filters,
        dimensions,
        dimensionExtraSettingDict: { [dimensions[0]]: { limit: 999 } }
      })
      const data = _.get(result, '0.resultSet', [])

      //***************** 获取事件数据 *************************
      const { filters:pointFilters, dimensions:pointDimensions } = getHeatMapFilters(heatMapInfo, HEATMAP_TYPE.GRID, queryRelativeTime, dimensionFilters, userGroupId)
      const pointResult = yield call(Fetch.post, '/app/slices/query-druid', {
        ...baseQuerConfig,
        filters:pointFilters,
        dimensions:pointDimensions,
        dimensionExtraSettingDict: { [pointDimensions[0]]: { limit: 999 } }
      })
      const pointData = _.get(pointResult, '0.resultSet', [])
     
      //***************** 转换为sdk渲染数据格式 *************************
      const { events = [], eventGroups = [] } = convertWebHeatMapData({
        data,
        heatmap, // 已圈选热图分组配置列表
        heatmapType: HEATMAP_TYPE.EVENT,
        viewType: HEATMAP_VIEW_TYPE.HEATMAP
      })
      const { points = [], pointsGroups = [] } = convertWebHeatMapData({
        data:pointData,
        heatmap, // 已圈选热图分组配置列表
        heatmapType: HEATMAP_TYPE.GRID,
        viewType: HEATMAP_VIEW_TYPE.HEATMAP
      })

      // console.log(events, points, eventGroups, pointsGroups, '==========conv-----------')
      const list = events.concat(eventGroups, points, pointsGroups)
      // if (heatmapType === HEATMAP_TYPE.HYBRID) {
      //   list = _.concat(events, eventGroups) events.concat(eventGroups) 
      // }
      // isEventHeatmap ? events.concat(eventGroups) : points.concat(pointsGroups)
      // 发送数据给iframe子窗口
      sendMessage2Iframe(heatMapWindow, {
        type: `${type}${callback}`, // getHeatmapDataCallback
        payload: {
          heatmapType,
          viewType,
          list,
          resolutionStyle,
          resolution,
          relationType
        }
      })
    },
    *changeWindowLocation({ payload }, { put, select }) {
      const { staticUrl } = yield select(state => state[namespace])
      const { token } = payload
      // 子窗口路径变化同步输入框地址值
      yield put({
        type: 'change',
        payload: {
          currentUrl: staticUrl,
          token
        }
      })
    },

    /**
     * 保存热图信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *saveHeatMapData({ payload }, { call, select, put }) {
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      const { timeRange, heatmap, dimensionFilters, heatMapList, currentUrl, heatMapName, selectKey, userGroupId, relationType, shortUrl, token } = yield select(state => state[namespace])
      const data = {
        ...heatmap,
        app_type: 'web',
        page_path: shortUrl,
        app_version: '0',
        project_id: projectCurrent.id,
        name: heatMapName,
        params: {
          filters: dimensionFilters.filter(p => p.col !== '__time'),
          url: currentUrl,
          userGroupId,
          relation_type: relationType,
          timeRange
        },
        appid: token
      }
      const res = yield call(Fetch.post, '/app/sdk/heat-map/save', data)
      if (!res.success) {
        message.error('保存失败')
        return
      }

      message.success('保存成功')
      yield put({ type: 'change', payload: {  heatMapList: [...heatMapList.filter(p => p.id !== selectKey), res.result], selectKey: '', visibleSaveModal: false } })
    },
    /**
     * 获取热图列表
     * @param {*} param0 
     * @param {*} param1 
     */
    *getHeatMapList({ payload }, { call, select, put }) {
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      if (!projectCurrent.id) {
        return
      }
      const res = yield call(Fetch.get, '/app/sdk/heat-map/list', { project_id: projectCurrent.id, pageSize: 9999, pageIndex: 1, app_type: 'web' })
      if (res.success) {
        yield put({ type: 'change', payload: { heatMapList: res.result.heatMapList } })
      }
    },

    *getHeatMapList({ payload }, { call, select, put }) {
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      if (!projectCurrent.id) {
        return
      }
      const res = yield call(Fetch.get, '/app/sdk/heat-map/list', { project_id: projectCurrent.id, pageSize: 9999, pageIndex: 1, app_type: 'web' })
      if (res.success) {
        yield put({ type: 'change', payload: { heatMapList: res.result.heatMapList } })
      }
    },
    /**
     * 删除热图
     * @param {*} param0 
     * @param {*} param1 
     */
    *deleteHeatMap({ payload }, { call, put, select }) {
      const { id } = payload
      const { heatMapList } = yield select(state => state[namespace])
      const res = yield call(Fetch.get, '/app/sdk/heat-map/delete', { id })
      if (res.success) {
        message.success('删除成功')
        yield put({ type: 'change', payload: { heatMapList: heatMapList.filter(p => p.id !== id) } })
      } else {
        message.error('删除失败')
      }
    },

    /**
    * @description 暂存热图数据
    * @param {any} { payload }
    * @param {any} { call, select }
    */
    *saveEventGroups({ payload }, { put, select }) {
      const { heatMapWindow, heatmap, relationType, dimensionFilters, userGroupId } = yield select(state => state[namespace])
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      const { viewType, heatmapType, event_names, name, points = {}, type, app_type = 'web', pathname: page_path } = payload
      let { event_groups: eventGroups = [], points: eventPoints = [] } = heatmap.page_path === page_path ? _.cloneDeep(heatmap) : {}
      if (event_names) {
        eventGroups.push({ event_path: name, event_names, id: shortid() })
      }
      if (!_.isEmpty(points)) {
        eventPoints.push({ ...points, id: shortid() })
      }

      let newHeatMapData = {
        ...heatmap,
        app_type,
        page_path,
        app_version: '0',
        project_id: projectCurrent.id,
        event_groups: eventGroups,
        points: eventPoints,
        params: {
          ...heatmap.params,
          relation_type: relationType,
          filters: dimensionFilters,
          userGroupId: userGroupId
        }
      }

      yield put({ type: 'change', payload: { heatmap: newHeatMapData } })
      sendMessage2Iframe(heatMapWindow, {
        type: `${type}${callback}`, // saveEventGroupsCallback
        payload: {
          viewType,
          heatmapType,
          list: [newHeatMapData],
          success: true
        }
      })
    },


    *clearHeatMap({ payload }, { put, select, call }) {
      const { heatMapWindow, viewType, heatmapType } = yield select(state => state[namespace])
      yield put({ type: 'change', payload: { heatmap: {}, selectKey: '' } })
      sendMessage2Iframe(heatMapWindow, {
        type: `removeEventGroup${callback}`, // saveEventGroupsCallback
        payload: {
          viewType,
          heatmapType,
          clear: true
        }
      })
    },

    *saveSlice({ payload }, { put, select, call }) {
      let { heatmap, timeRange, dimensionFilters, userGroupId, relationType, currentUrl, shortUrl } = yield select(state => state[namespace])
      const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
      const { slice } = payload
      // const { filters } = getHeatMapFilters(heatmap, false, timeRange, dimensionFilters, userGroupId)
      const res = yield call(Fetch.post, '/app/slices/create/slices', {
        ...slice,
        params: {
          ..._.pick(heatmap, ['events', 'points', 'page_path', 'event_groups']),
          app_type: 'web',
          page_path: shortUrl,
          app_version: '0',
          project_id: projectCurrent.id,
          params: {
            ...heatmap.params,
            userGroupId,
            filters: dimensionFilters,
            timeRange,
            relation_type: relationType,
            url: currentUrl
          },
          vizType: 'link'
        }
      })
      if (res) {
        message.success('保存成功')
      }
    },

    *syncPageInfo({ payload }, { put, select, call }) {
      const { pathname, pageName } = payload
      let { relationType, dimensionFilters, heatmap } = yield select(state => state[namespace])
      let newFilter = _.cloneDeep(dimensionFilters)
      if (!heatmap.id) {
        newFilter = newFilter.filter(p => p.col !== 'path_name' && p.col !== 'page_name')
        if (pageName || relationType === Relation_Field.eventId) {
          newFilter.push({ col: relationType === Relation_Field.eventId ? 'path_name' : 'page_name', op: 'in', eq: [relationType === Relation_Field.eventId ? pathname : pageName] })
        }
      }
      yield put({ type: 'change', payload: { shortUrl: pathname, pageName, dimensionFilters: newFilter } })
    },

    *getSliceInfo({ payload }, { put, select, call }) {
      const { id } = payload
      const res = yield call(Fetch.get, '/app/slices/get/slices/' + id, {})

      const heatmap = res.params
      const viewType = HEATMAP_VIEW_TYPE.HEATMAP
      const heatmapType = HEATMAP_TYPE.EVENT
      const data = {
        heatmap: heatmap,
        selectKey: '',
        currentUrl: _.get(heatmap, 'params.url', ''),
        viewType,
        heatMapName: '',
        heatmapType,
        dimensionFilters: _.get(heatmap, 'params.filters', []),
        userGroupId: _.get(heatmap, 'params.userGroupId', ''),
        relationType: _.get(heatmap, 'params.relation_type', Relation_Field.eventId),
        timeRange: _.get(heatmap, 'params.timeRange', '-7 days')
      }

      yield put({
        type: 'change',
        payload: data
      })
    },
    
    *importHeatMap(action, effects) {
      const { heatmaps, appType, projectId } = action.payload
      const res = yield effects.call(Fetch.post, '/app/sdk/heat-map/import', null, { body: JSON.stringify({ heatmaps, appType, projectId }) })
      if (res.success) {
        yield effects.put({ type: 'change', payload: { showImportHeatmap: false } })
        yield effects.put({ type: 'getHeatMapList', payload: {} })
      } else {
        message.error('获取热图数据失败')
      }
    }
  }
}
