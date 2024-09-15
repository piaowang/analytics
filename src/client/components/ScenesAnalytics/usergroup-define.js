import _ from 'lodash'
import moment from 'moment'
import {
  convertDateType,
  isRelative
} from '../../../common/param-transform'
import {
  immutateUpdate, immutateUpdates
} from '../../../common/sugo-utils'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

const distinctIdDimName = 'distinct_id'
const userIdDimName = 'cst_no'

function toAbsoluteTimeRange(during) {
  let relativeTime = isRelative(during) ? during : 'custom'
  let [since, until] = relativeTime === 'custom' ? during : convertDateType(relativeTime)
  return [since, until].map(i => moment(i).format('YYYY-MM-DD'))
}

export const generateMobileBankAppLifeCycleUserGroup = (datasourceCurrent, type) => {
  if (_.isEmpty(datasourceCurrent)) {
    return []
  }

  let slice = {
    ScenesBrowse: [{
      slice_name: '最近<%= times %>注册了手机银行，但未完成手机银行App安装的客户',
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      changeTimeRange: function (sl, timeRange, timeRangeTitle) {
        let [since, until] = toAbsoluteTimeRange(timeRange)
        return immutateUpdates(sl,
          'params.customMetrics[0].formula', formula => formula.replace('$since', moment(since).valueOf()).replace('$until', moment(until).valueOf()),
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        customMetrics: [{
          name: 'regEventCount',
          formula: '$main.filter($since <= $__time and $__time < $until).filter($event_name == "客户注册").count()'
        },
        {
          name: 'appEventCount',
          formula: '$main.filter($sugo_lib == "android" or $sugo_lib == "Objective-C").count()'
        }
        ],
        filters: [{
          col: 'regEventCount',
          op: 'greaterThan',
          eq: 0
        },
        {
          col: 'appEventCount',
          op: 'lessThanOrEqual',
          eq: 0
        }
        ],
        dimensions: [userIdDimName]
      }
    }, {
      // TODO 没业务数据，先灰掉，不可用
      slice_name: '现存客户中没有注册手机银行的客户还有',
      disable: true,
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        customMetrics: [{
          name: 'regMobileBankEventCount',
          formula: '$main.filter($event_name == "登录注册").count()'
        }],
        filters: [{
          col: 'regMobileBankEventCount',
          op: 'lessThanOrEqual',
          eq: 0
        }],
        dimensions: [userIdDimName]
      }
    }, {
      slice_name: '最近<%= times %>使用活跃,但没有购买任何产品的客户有',
      timeRange: [{
        title: '1个月',
        value: '-30 days'
      }, {
        title: '3个月',
        value: '-90 days'
      }, {
        title: '6个月',
        value: '-180 days'
      }],
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'params.filters[0].eq', () => range,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        customMetrics: [
          // { name: 'eventCount', formula: '$main.count()' },
          {
            name: 'investCount',
            formula: '$main.filter($pro_sts == "交易成功").count()'
          }
        ],
        filters: [
          { col: '__time', op: 'in', eq: '-90 days' },
          // { col: 'eventCount', op: 'greaterThan', eq: 0 },
          { col: 'investCount', op: 'lessThanOrEqual', eq: 0 }
        ],
        dimensions: [userIdDimName]
      }
    }, {
      slice_name: '注册安装了手机银行APP,但最近<%= times %>内没有启动过的客户有',
      timeRange: [{
        title: '1个月',
        value: '-1 months'
      }, {
        title: '3个月',
        value: '-3 months'
      }, {
        title: '6个月',
        value: '-6 months'
      }],
      changeTimeRange: function (sl, timeRange, timeRangeTitle) {
        let [since, until] = toAbsoluteTimeRange(timeRange)
        return immutateUpdates(sl,
          'params.customMetrics[0].formula', formula => formula.replace('$since', moment(since).valueOf()).replace('$until', moment(until).valueOf()),
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        customMetrics: [{
          name: 'appEventCount',
          formula: '$main.filter($since <= $__time and $__time < $until).filter($sugo_lib == "android" or $sugo_lib == "Objective-C").count()'
        },
        {
          name: 'regEventCount',
          formula: '$main.filter($event_name == "客户注册").count()'
        }
        ],
        filters: [{
          col: 'regEventCount',
          op: 'greaterThan',
          eq: 0
        },
        {
          col: 'appEventCount',
          op: 'lessThanOrEqual',
          eq: 0
        }
        ],
        dimensions: [userIdDimName]
      }
    }],
    financialBrowse: [{
      slice_name: '最近<%= times %>浏览理财产品页面，但在这<%= times %>内没有产生购买的客户',
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      productRange:[
        {
          title:'全部',
          value: ''
        },
        {
          title:'幸福存',
          value: '幸福存'
        },
        {
          title:'金荷花',
          value: '金荷花'
        }
      ],
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'params.filters[0].eq', () => range,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      changeProductRange: function (sl, prodVal) {
        return immutateUpdates(sl, 'params.filters[1].eq', () => [prodVal].filter(_.identity))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        customMetrics: [
          {
            name: 'browserProductPageEventCount',
            formula: '$main.filter($event_type == "浏览").count()'
          },
          {
            name: 'investCount',
            formula: '$main.filter($pro_sts == "交易成功").count()'
          }
        ],
        filters: [
          { col: '__time', op: 'in', eq: '-7 days' },
          { col: 'page_name', op: 'startsWith', eq: [] },
          { col: 'page_name', op: 'endsWith', eq: ['详情'] },
          { col: 'browserProductPageEventCount', op: 'greaterThan', eq: 0 },
          { col: 'investCount', op: 'lessThanOrEqual', eq: 0 }
        ],
        dimensions: [userIdDimName]
      }
    },
    {
      // TODO 数据无法获取，先灰掉
      slice_name: '最近<%= times %>存款账户有大笔进账的客户有',
      disable: true,
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      params: {
        withGlobalMetrics: false,
        customMetrics: [{
          name: 'regEventCount',
          formula: '$main.filter($event_name == "登录注册").count()'
        },
        {
          name: 'nonAppEventCount',
          formula: '$main.filter($sugo_lib != "android" and $sugo_lib != "Objective-C").count()'
        }
        ],
        filters: [
          // { col: '__time', op: 'in', eq: '-7 days' },
          {
            col: '__time',
            op: 'in',
            eq: '-7 days'
          },
          {
            col: 'regEventCount',
            op: 'greaterThan',
            eq: 0
          },
          {
            col: 'nonAppEventCount',
            op: 'lessThanOrEqual',
            eq: 0
          }
        ],
        dimensions: [userIdDimName]
      }
    },
    {
      // TODO 数据无法获取，先灰掉
      slice_name: '最近<%= times %>有理财产品到期的客户有',
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      disable:true,
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      params: {
        withGlobalMetrics: false,
        customMetrics: [{
          name: 'regEventCount',
          formula: '$main.filter($event_name == "登录注册").count()'
        },
        {
          name: 'nonAppEventCount',
          formula: '$main.filter($sugo_lib != "android" and $sugo_lib != "Objective-C").count()'
        }
        ],
        filters: [
          // { col: '__time', op: 'in', eq: '-7 days' },
          {
            col: '__time',
            op: 'in',
            eq: '-7 days'
          },
          {
            col: 'regEventCount',
            op: 'greaterThan',
            eq: 0
          },
          {
            col: 'nonAppEventCount',
            op: 'lessThanOrEqual',
            eq: 0
          }
        ],
        dimensions: [userIdDimName]
      }
    },
    {
      slice_name: '最近<%= times %>填写了风险评估,但未产生购买的客户有',
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      productRange:[
        {
          title:'全部',
          'value':'allProduct'
        },
        {
          title:'辛福存',
          'value':'happySave'
        },
        {
          title:'金荷花',
          value:'goldLotus'
        }
      ],
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'params.filters[0].eq', () => range,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        customMetrics: [{
          name: 'accessRiskAssessmentEventCount',
          formula: '$main.filter($event_name == "提交成功" and $page_name == "风险评估结果").count()'
        },
        {
          name: 'investCount',
          formula: '$main.filter($pro_sts == "交易成功").count()'
        }
        ],
        filters: [
          { col: '__time', op: 'in', eq: '-7 days' },
          { col: 'accessRiskAssessmentEventCount', op: 'greaterThan', eq: 0 },
          { col: 'investCount', op: 'lessThanOrEqual', eq: 0 }
        ],
        dimensions: [userIdDimName]
      }
    }],
    loanBrowse: [{
      slice_name: '最近<%= times %>浏览贷款产品的客户有',
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'params.filters[0].eq', () => range,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        filters: [
          { col: '__time', op: 'in', eq: '-7 days' },
          { col: 'page_name', op: 'in', eq: ['遂心贷'] },
          { col: 'event_type', op: 'in', eq: ['浏览'] }
        ],
        dimensions: [userIdDimName]
      }
    }, {
      slice_name: '最近<%= times %>使用贷款计算器的客户有',
      timeRange: [{
        title: '七天',
        value: '-7 days'
      }, {
        title: '两周',
        value: '-14 days'
      }, {
        title: '一个月',
        value: '-30 days'
      }],
      changeTimeRange: function (sl, range, timeRangeTitle) {
        return immutateUpdates(sl,
          'params.filters[0].eq', () => range,
          'slice_name', titleTemp => _.template(titleTemp)({times: timeRangeTitle}))
      },
      druid_datasource_id: datasourceCurrent.id,
      dataSourceName: datasourceCurrent.name,
      params: {
        withGlobalMetrics: false,
        filters: [
          { col: '__time', op: 'in', eq: '-7 days' },
          { col: 'event_type', op: 'in', eq: ['点击'] },
          { col: 'event_name', op: 'in', eq: ['贷款计算器'] }
        ],
        dimensions: [userIdDimName]
      }
    }]
  }

  return slice[type]
}
