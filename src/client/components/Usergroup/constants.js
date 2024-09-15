import {checkPermission} from '../../common/permission-control'
import DruidColumnType from '../../../common/druid-column-type'
import _ from 'lodash'
import {ISOTimeFormatStr} from '../../common/metric-formatter-factory'
import moment from 'moment'
import React from 'react'
import {compressUrlQuery} from '../../../common/sugo-utils'
import {getInsightUrlByUserGroup} from '../../common/usergroup-helper'
import flatMenusType from '../../../common/flatMenus.js'
import UserGroupExporter from './usergroup-exporter'
import PublishUserGroupDataApiSettingsModal from '../DataAPI/publish-usergroup-data-api-modal'
import { getNewFlatMenus } from '../../../common';

const {cdn, menus, enableNewMenu} = window.sugo
let flatMenus = getNewFlatMenus(menus)

export const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

export const dsSettingPath = '/console/project/datasource-settings'
export const canViewInsight = true
export const canSetDataSource = checkPermission(dsSettingPath)

const hasDataAPIEntryInMenu = enableNewMenu
? _.includes(flatMenusType(window.sugo.menus), '/console/data-api')
: _.some(window.sugo.menus, m => {
  return _.some(m.children, c => c.path === '/console/data-api')
})
const canCreateDataAPI = checkPermission('post:/app/data-apis')


const {
  analyticDefaultTime = '-1 day',
  show_newest_data_at_first = true
} = window.sugo

export const links = [
  {
    title: '多维分析',
    icon: 'sugo-analysis',
    url: '/console/analytic',
    asyncUrl: (ug, mainTimeDimName) => {
      let {id: ugId, druid_datasource_id} = ug
      let {groupby} = ug.params
      let baseFilters = mainTimeDimName
        ? [{ col: mainTimeDimName, op: 'in', eq: analyticDefaultTime, _willChange: show_newest_data_at_first }]
        : []
      let hashInfo = {
        'selectedDataSourceId': druid_datasource_id,
        'timezone': 'Asia/Shanghai',
        'autoReloadInterval': 0,
        'tempMetricDict': {},
        'localMetricDict': {},
        'vizType': 'table',
        'filters': [
          ...baseFilters,
          {'col': groupby, 'op': 'lookupin', 'eq': ugId}
        ],
        'dimensions': [],
        'metrics': [],
        'dimensionExtraSettingDict': {},
        'pinningDims': []
      }
      return `/console/analytic#${compressUrlQuery(hashInfo)}`
    }
  },
  {
    title: '行为分析',
    icon: 'sugo-user-action',
    url: '',
    children: [
      {
        title: '路径分析',
        icon: 'sugo-path',
        url: '/console/path-analysis'
      }, {
        title: '留存分析',
        icon: 'sugo-retention',
        url: '/console/retention'
      }, {
        title: '漏斗分析',
        icon: 'sugo-filter',
        url: '/console/funnel'
      }, {
        title: '事件分析',
        icon: 'sugo-note',
        url: '/console/user-action-analytics'
      }
    ].filter(({url}) => checkPermission(`get:${url}`) && _.some(flatMenus, p => p === url))
  },
  {
    title: '画像',
    icon: 'sugo-user-portrait',
    url: '/console/tag-macroscopic'
  },
  {
    title: '用户列表',
    icon: 'sugo-user-list',
    url: '/console/usergroup',
    asyncUrl: getInsightUrlByUserGroup
  },
  {
    title: '导出',
    icon: 'sugo-download1',
    url: '',
    linkDomMapper: function UserGroupExportBtn(linkDom, ug, idx) {
      let style = _.get(linkDom, 'props.style') || {}
      let title = _.get(linkDom, 'props.title') || ''
      return (
        <UserGroupExporter userGroup={ug} key={idx}>
          {({loadingCsvData}) => {
            return loadingCsvData
              ? (
                <a
                  style={style}
                  className={`ug-thumb-link ug-thumb-link${idx} pointer elli pointer`}
                  title={title}
                >
                  <span className="ug-thumb-link-text">{title}</span>
                  {/* <Icon type="loading" className="ug-thumb-link-icon font20" /> */}
                </a>
              )
              : linkDom
          }}
        </UserGroupExporter>
      )
    }
  },
  !hasDataAPIEntryInMenu || !canCreateDataAPI ? null : {
    title: '发布 API',
    icon: 'api',
    url: '',
    linkDomMapper: function UserGroupPublishDataApiBtn(linkDom, ug, idx) {
      return (
        <PublishUserGroupDataApiSettingsModal
          key={idx || '-1'}
          userGroupId={ug.id}
          userGroupOpenWith={_.get(ug, 'params.openWith')}
        >
          {linkDom}
        </PublishUserGroupDataApiSettingsModal>
      )
    }
  }
].filter(conf => {
  if (!conf) {
    return false
  }
  let {url, children} = conf
  return !_.isEmpty(children) || !url || checkPermission(`get:${url}`) && _.some(flatMenus, p => p === url)
})

export const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}

export const formItemLayout1 = {
  labelCol: { span: 3 },
  wrapperCol: { span: 12 }
}

export const relationTextMap = {
  or: '或者',
  and: '并且'
}

export const formulaPool = {
  str: [
    {
      name: 'lucene_count',
      title: '计数'
    }
  ],
  num: [
    {
      name: 'lucene_doubleSum',
      title: '合计(sum)'
    },
    {
      name: 'lucene_doubleMax',
      title: '最大值(max)'
    },
    {
      name: 'lucene_doubleMin',
      title: '最小值(min)'
    }
  ]
}


export const defaultDate = '-1 months'
export const timeStampFormat = 'YYYY-MM-DD HH:mm:ss'
export const ToStampTime = str => {
  return moment(str).format(timeStampFormat)
}
export const ToISOTime = str => {
  return moment(str).utc().format(ISOTimeFormatStr)
}

//字符类型
export const actionPool = {
  str: ['in', 'not in', '=', '≠'],
  num: ['>', '=', '<', '>=', '<=', 'between'],
  date: ['in']
}

export const valueActionPool = {
  str: ['=', '≠'],
  num: ['>', '=', '<', '>=', '<='],
  date: ['in']
}

export const arrayActionPool = {
  str: ['in', 'not in'],
  num: ['between'],
  date: ['in']
}

export const onloadingValue = '__loading'

//判断是否数值类型维度
export const isDateDim = dim => {
  return dim.type === DruidColumnType.Date
}

//判断是否日期类型维度
export const isNumberDim = dim => {
  let {Int, Float, Double} = DruidColumnType
  return [Int, Float, Double].includes(dim.type)
}

export function bool(value, action) {
  if(value === '' || typeof value === 'undefined') return false
  if(_.isArray(value) && !value.length) return false
  if(action === 'between') {
    if (
      !_.isArray(value) ||
      value.length !== 2 ||
      !_.isNumber(value[0]) ||
      !_.isNumber(value[1]) ||
      value[0] > value[1]
    ) return false
  }
  return true
}

export const modelType = [
  {id: 'rfm', name: 'RFM模型', key: 0},
  {id: 'life_cycle', name: '用户生命周期模型', key: 1},
  {id: 'value_slice', name: '用户价值分层模型', key: 2}
]

export const modelTypeMap = {
  'rfm': 0,
  'life_cycle': 1,
  'value_slice': 2
}

export const lifeCycleTitle = ['引入期', '发展期', '成熟期', '衰退期', '流失期']

export const valueSliceTitle = ['A类高价值', 'B类一般价值', 'C类低价值']
