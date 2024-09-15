import _ from 'lodash'
import deepCopy from '../../../common/deep-copy'
import {getUsergroupByBuiltinId, isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {convertDateType, isRelative} from '../../../common/param-transform'
import {transformBuiltinUserGroups} from '../../../common/druid-query-utils'
import toSliceFilter from 'common/project-filter2slice-filter'
import {tabMap} from './constants'

export const createPathAnalysisQuery = (pathAnalytic, args) => {
  /*
  {
    "dataSource": "com_SJLnjowGe_project_H1sSFD36g",
    "dimesion": {
      "sessionId": "SugoSessionId",
      "pageName": "Page",
      "date": "AccessTime"
    },
    "pages": [
      "蠢蠢欲动",
      "激情无限",
      "欲罢不能",
      "爷不行了"
    ],
    "homePage": "蠢蠢欲动",
    "startDate": "2017-01-01",
    "endDate": "2017-05-05"
  }{"commonMetric": ["UserID", "SessionID", "SystemVersion", "ClientDeviceModel", "ClientDeviceID"], "commonSession": "SessionID", "commonDimensions": ["EventScreen", "EventAction", "EventLabel"]}
  */
  
  let {
    params: {
      relativeTime,
      since,
      until,
      filters,
      pageTab,
      direction,
      groupby: userId,
      page: homePage,
      pages
    }
  } = pathAnalytic
  let {
    datasourceCurrent,
    usergroups,
    location: {
      query: {usergroup_id}
    }
  } = args
  let sessionId = _.get(
    datasourceCurrent,
    'params.commonSession'
  )
  let pageName = _.get(
    datasourceCurrent,
    'params.titleDimension'
  ) || 'EventScreen'
  let filters0 = deepCopy(
    toSliceFilter({filters})
  )
  let pages0 = pageTab === tabMap.all() ? [] : pages
  if (pages0.length) {
    filters0.push({
      col: pageName,
      op: 'in',
      eq: pages0
    })
  }
  filters0 = filters0.map(f => {
    if (
      f.col === pageName &&
      f.op === 'in' &&
      !f.eq.includes(homePage)
    ) {
      f.eq.push(homePage)
    }
    return f
  })
  
  if (usergroup_id && usergroup_id !== 'all') {
    let ug = isBuiltinUsergroupId(usergroup_id)
      ? getUsergroupByBuiltinId(usergroup_id, datasourceCurrent)
      : _.find(usergroups, { id: usergroup_id })
    if (ug) {
      let ugFilter = {
        op: 'lookupin',
        eq: usergroup_id,
        col: _.get(ug, 'params.groupby')
      }
      // 因为时间筛选没有传到 filters 所以后端进行转换时无法获得时间范围，内置分群的转换放到前端进行
      if (isBuiltinUsergroupId(usergroup_id)) {
        let timeRangeFlt = {col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}
        ugFilter = transformBuiltinUserGroups([ugFilter], timeRangeFlt, datasourceCurrent)[0]
      }
      filters0.push(ugFilter)
    }
  }
  let [startDate, endDate] = relativeTime !== 'custom'
    ? convertDateType(relativeTime)
    : [since, until]
  
  let q = {
    dataSource: datasourceCurrent.name,
    datasource_id: datasourceCurrent.id,
    dimension: {
      sessionId,
      pageName,
      userId,
      date: datasourceCurrent.params.isSDKProject
        ? 'event_time'
        : '__time'
    },
    homePage,
    pages: pages0,
    startDate,
    endDate,
    filters: filters0
  }
  return [q, direction]
}
