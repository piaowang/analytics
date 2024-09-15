import Fetch from '../../common/fetch-final'
import { message } from 'antd'
import _ from 'lodash'
// import { AccessDataType } from '../../../common/constants'
import { getHeatMapFilters, getHeatMapPointData, TEMP_METRIC, HEATMAP_TYPE } from '../../common/sdk-calc-point-position'
import { APP_TYPE, Relation_Field } from '../../common/sdk-calc-point-position'

export const namespace = 'heatMapInfo'
const customMetrics = [
  { name: TEMP_METRIC, formula: '$main.count()', dimName: 'distinct_id', dimParams: {} }
]
export default {
  namespace,
  state: {
    heatMapId: '',
    appType: undefined,
    timeRange: '-7 days',
    heatMapInfo: {},
    loadingEvents: false,
    selectViewMode: HEATMAP_TYPE.HYBRID,
    showPointGroup: false,
    showDataInHeatPanel: true,
    userGroupId: '',
    dimensionFilters: [],
    showSaveModal: false,
    saving: false,
    hasMore: true
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
    // watchChangeProject: [
    //   function* (action, effects) {
    //     while (true) {
    //       const res = yield effects.takeLatest('sagaCommon/changeState')
    //       if (window.location.pathname.indexOf('/console/heat-map/') !== 0) {
    //         console.log('11111111111111111', action)
    //         return
    //       }
    //       const { projectCurrent } = res.payload
    //       if (projectCurrent.access_type === AccessDataType.SDK ) {
    //         yield effects.put({ type: 'queryHeatMapData', payload: { projectCurrent } })
    //       } else {
    //         yield effects.put({ type: 'changeState', payload: { showAccessTypeTip: true } })
    //       }
    //     }
    //   },
    //   { type: 'watcher' }
    // ],

    *queryHeatMapData(action, effects) {
      let { selectViewMode = HEATMAP_TYPE.HYBRID, projectCurrent, heatMapId, sliceId } = action.payload
      yield effects.put({ type: 'changeState', payload: { loadingEvents: true } })
      if (!projectCurrent || _.isEmpty(projectCurrent)) {
        yield effects.take('sagaCommon/changeState')
        let sagaCommon = yield effects.select(state => state['sagaCommon'])
        projectCurrent = sagaCommon.projectCurrent
      }
      let { datasource_id: datasourceId } = projectCurrent
      let {
        timeRange,
        dimensionFilters = [],
        userGroupId,
        showPointGroup,
        heatMapInfo,
        heatMapId: stateHeatMapId
      } = yield effects.select(state => state[namespace])
      let newFilters = dimensionFilters
      heatMapId = heatMapId || stateHeatMapId

      // 获取单图配置信息
      if (_.isEmpty(heatMapInfo) && sliceId) {
        const res = yield effects.call(Fetch.get, `/app/slices/get/slices/${sliceId}`)
        heatMapInfo = {
          ...res.params.chartExtraSettings,
          ...res.params,
          params: {
            ..._.get(res, 'params.chartExtraSettings.img_style', {}),
            filters: res.params.filters.filter(p => p.col && p.col !== 'event_name'&& p.col !== '__time' && p.op !== 'lookupin') //排除事件名筛选和用户组筛选
          },
          screenshot_id: _.get(res, 'params.chartExtraSettings.screenshot_id', '')
        }
        timeRange = _.get(res.params.filters.find(p => p.col === '__time'), 'eq', timeRange)
        userGroupId = _.get(res.params.filters.find(p => p.op === 'lookupin'), 'eq', '')
        newFilters = _.get(heatMapInfo, 'params.filters', [])
        const resScreenshot = yield effects.call(Fetch.get, '/app/sdk/get/event-screenshot-draft', { screenshot_id: heatMapInfo.screenshot_id })
        if (resScreenshot.result) {
          heatMapInfo.screenshot = resScreenshot.result
        }
      }
      // 获取热图配置信息
      if (_.isEmpty(heatMapInfo) && heatMapId) {
        const res = yield effects.call(Fetch.get,
          `/app/sdk/heat-map/get/${heatMapId}`)
        if (!res.success) {
          message.error('获取热图数据失败')
          return
        }
        heatMapInfo = res.result
        newFilters = _.get(heatMapInfo, 'params.filters', [])
      }
      heatMapInfo = _.cloneDeep(heatMapInfo)
      const { events = [], event_groups = [], points = [] } = heatMapInfo
      // 清空点击数
      heatMapInfo.events = events.map(p => ({ ...p, clicks: 0, clicksProportion: 0 }))
      heatMapInfo.event_groups = event_groups.map(p => ({ ...p, clicks: 0, clicksProportion: 0 }))
      heatMapInfo.heatmap_points = []

      // if (selectViewMode === ViewMode.event && !events.length && !event_groups.length) {
      //   yield effects.put({ type: 'changeState', payload: { loadingEvents: false, heatMapInfo, selectViewMode, dimensionFilters: newFilters } })
      //   return
      // }

      //获取坐标和事件的条件和维度
      const { filters: eventFilters, dimensions: eventDimensions } = getHeatMapFilters(heatMapInfo,
        HEATMAP_TYPE.EVENT,
        timeRange,
        newFilters,
        userGroupId,
        _.get(heatMapInfo, 'params.relation_type', Relation_Field.eventId))

      const { filters: pointFilters, dimensions: pointDimensions } = getHeatMapFilters(heatMapInfo,
        HEATMAP_TYPE.GRID,
        timeRange,
        newFilters,
        userGroupId,
        _.get(heatMapInfo, 'params.relation_type', Relation_Field.eventId))
      
      // 获取坐标和事件的数据
      if (datasourceId) {
        const baseQueryConfig = {
          druid_datasource_id: datasourceId,
          timezone: 'Asia/Shanghai',
          granularity: 'P1D',
          dimensionExtraSettings: [{ limit: 999 }],
          customMetrics,
          splitType: 'groupBy',
          queryEngine: 'tindex'
        }
        let resEvent = []
        if (events.length || event_groups.length) {
          resEvent = yield effects.call(Fetch.post, '/app/slices/query-druid', {
            ...baseQueryConfig,
            filters: eventFilters,
            dimensions: eventDimensions,
            dimensionExtraSettingDict: { [eventDimensions[0]]: { limit: 999 } }
          })
        }
        resEvent = _.get(resEvent, '0.resultSet', [])
        let resPoint = yield effects.call(Fetch.post, '/app/slices/query-druid', {
          ...baseQueryConfig,
          filters: pointFilters,
          dimensions: pointDimensions,
          dimensionExtraSettingDict: { [pointDimensions[0]]: { limit: 999 } }
        })
        resPoint = _.get(resPoint, '0.resultSet', [])
        if (!resPoint.length && !resEvent.length) {
          yield effects.put({ type: 'changeState', payload: { loadingEvents: false, heatMapInfo, selectViewMode, dimensionFilters: newFilters, timeRange, userGroupId  } })
          return
        }

        // 合并事件和坐标数据
        const {
          events: dataEvents,
          eventGroups
        } = getHeatMapPointData(resEvent, {
          ...heatMapInfo,
          show_point_group: showPointGroup,
          relation_type: _.get(heatMapInfo, 'params.relation_type', Relation_Field.eventId)
        })

        const {
          points: dataPoints,
          pointsGroups
        } = getHeatMapPointData(resPoint, {
          ...heatMapInfo,
          show_point_group: showPointGroup,
          showAllPoint: true
        })
        heatMapInfo = {
          ...heatMapInfo,
          events: dataEvents,
          event_groups: eventGroups,
          points: pointsGroups,
          heatmap_points: dataPoints
        }
      }
      yield effects.put({ type: 'changeState', payload: { heatMapInfo, loadingEvents: false, selectViewMode, dimensionFilters: newFilters, timeRange, userGroupId } })
    },

    *saveSlice(action, effects) {
      yield effects.put({ type: 'changeState', payload: { saving: true } })
      let { heatMapInfo, selectViewMode, timeRange, dimensionFilters, userGroupId, showPointGroup } = yield effects.select(state => state[namespace])
      const { slice } = action.payload
      const { filters, dimensions } = getHeatMapFilters(heatMapInfo, selectViewMode, timeRange, dimensionFilters, userGroupId)
      const { events, event_groups, points, params: imgStyle, screenshot_id } = heatMapInfo
      let params
      // if (selectViewMode === ViewMode.hybrid || selectViewMode === ViewMode.event) {
      // } else {
      //   params = { points: points.map(p => _.omit(p, ['clicks', 'clicksProportion'])) } 
      // }
      params = {
        events: events.map(p => _.omit(p, ['clicks', 'clicksProportion'])),
        event_groups: event_groups.map(p => _.omit(p, ['clicks', 'clicksProportion'])),
        points: points.map(p => _.omit(p, ['clicks', 'clicksProportion'])),
        viewMode: selectViewMode
      }

      const res = yield effects.call(Fetch.post, '/app/slices/create/slices', {
        ...slice,
        params: {
          filters,
          chartExtraSettings: {
            ...params,
            img_style: imgStyle,
            screenshot_id
          },
          dimensions,
          metrics: [TEMP_METRIC],
          customMetrics,
          vizType: 'sdk_heat_map',
          splitType: 'groupBy',
          dimensionExtraSettingDict: { [dimensions[0]]: { limit: 999 } }
        }
      })
      if (res && res.code === 0) {
        message.success('保存成功')
      } else {
        message.error('保存失败')
      }
      yield effects.put({ type: 'changeState', payload: { saving: false } })
    }
  }
}

