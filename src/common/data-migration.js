// 迁移单图数据结构

// 旧的数据结构
/*
let old = {
  'relativeTime': 'custom',
  'since': '2016-01-01',
  'until': '2017-01-01',

  'metrics': [ 'GSSB_B_total', 'BDBZ_hyperlog', 'SJJNSE_sum', 'SRE_SUM' ],
  'viz_type': 'dist_bar',
  'timezone': 'Asia/Shanghai',

  'groupby': [ 'CJXM' ],

  'dimensions': [ 'BDBZ' ],

  'granularity': 'P1D',

  'flt_col_1': 'nation',
  'flt_op_1': 'in',
  'flt_eq_1': 'xiaomi,Xiaomi,Letv,HUAWEI,Huawei,Meizu,OPPO,coolpad,vivo',

  'limit': '25',

  'dimensionExtraSettings': [
    {
      'sortCol': 'wuxianjiRT_total',
      'sortDirect': 'desc',
      'limit': 50,
      'dimension': 'Nation'
    }
  ],
  'filters': [
    {
      'col': 'City',
      'op': 'not in',
      'eq': [
        '重庆市'
      ]
    }
  ],
  'orders': [
    {
      'col': 'Nation',
      'sort': 'desc'
    }
  ]
}

// 新的数据结构，实际上是 json 格式
let new0 = {
  vizType: 'dist_bar',
  timezone: 'Asia/Shanghai',
  dimensions: [ 'BDBZ' ],
  metrics: [ 'GSSB_B_total', 'BDBZ_hyperlog', 'SJJNSE_sum', 'SRE_SUM' ],

  filters: [
    {
      col: '__time',
      op: 'in',
      eq: '-6 days' // ['2016-10-01', '2017-01-01']
    },
    {
      'col': 'City',
      'op': 'not in',
      'eq': [ '重庆市' ]
    },
    {
      col: 'age',
      op: 'in',
      eq: [10, 20],
      type: 'number'
    }
  ],

  dimensionExtraSettingDict: {
    __time: {
      sortCol: 'wuxianjiRT_total',
      sortDirect: 'desc',
      limit: 50,
      granularity: 'P1D' // 数值的话是数字
    }
  },

  chartExtraSettings: {
    a: 'b'
  }
}
*/

import _ from 'lodash'


function readFilterConfig(params) {
  if (params.filters) {
    return params.filters
  }
  // 旧版过滤器，转成新版的数据结构
  // { flt_col_1: 'state', flt_op_1: 'in', flt_eq_1: 'other', ... } -> [{ col: 'state', op: 'in', eq: 'other' }, ...]
  let _filterParams = _.keys(params).filter(p => _.startsWith(p, 'flt_'))
      .map(fltKey => {
        let m = fltKey.match(/^flt_([^_]+)_(\d+)$/)
        return {col: m[1], index: m[2], eq: params[fltKey]}
      }),
    _filterGroupsByIndex = _.mapValues(_.groupBy(_filterParams, p => p.index), val => {
      return val.reduce((prev, curr) => {
        prev[curr.col] = curr.eq
        return prev
      }, {})
    })
  return _.keys(_filterGroupsByIndex).sort((a, b) => a - b)
    .map(k => _filterGroupsByIndex['' + k]).filter(o => o['op'])
}

export function doMigration(params) {
  // groupby 转换为 dimensions
  if (!params.dimensions && params.groupby) {
    params = Object.assign({}, params, { dimensions: params.groupby })
  }

  // 应用单图的限制
  if (params.viz_type === 'pie') {
    params = Object.assign({}, params, {
      dimensions: _.take(params.dimensions, 1),
      metrics: _.take(params.metrics, 1)
    })
  } else if (params.viz_type === 'dist_bar') {
    params = Object.assign({}, params, {
      dimensions: _.take(params.dimensions, 1)
    })
  }

  // 创建一个新对象 (放弃不需要的属性)
  let keeped = _.pick(params, ['timezone', 'dimensions', 'metrics', 'customMetrics'])

  keeped.vizType = params.vizType || params.viz_type

  // 从最旧版转换成第二版
  let filters = readFilterConfig(params)

  // eq 用逗号分隔的改为用数组
  filters = filters.map(flt => {
    if (flt.col !== '__time' && flt.type !== 'number' && !_.isArray(flt.eq)) {
      return Object.assign({}, flt, {eq: _.isString(flt.eq) ? flt.eq.split(/,/) : []})
    }
    return flt
  }).filter(flt => _.isArray(flt.eq) ? flt.eq.filter(_.identity).length !== 0 : flt.eq)

  // filters 加入时间筛选
  filters = [{
    col: '__time',
    op: 'in',
    eq: params.relativeTime === 'custom' ? [params.since, params.until] : params.relativeTime
  }].concat(filters)

  keeped.filters = filters

  let dimensionExtraSettings = params.dimensionExtraSettings

  // 先生成旧版的 dimensionExtraSettings
  if (params.vizType === 'pie') {
    dimensionExtraSettings = _.defaultsDeep([{sortCol: params.metrics[0], sortDirect: 'desc'}], dimensionExtraSettings)
  } else if (!dimensionExtraSettings) {
    // 兼容旧版的排序和 limit: 找到旧版的第一个指标排序
    // [{col: 'xxx', sort: 'asc'}, {...}]
    let orderDict = _.keyBy(params.orders || [], 'col')

    let firstSortingTerm = _.find(params.metrics, m => orderDict[m])
    if (!firstSortingTerm) {
      firstSortingTerm = _.find(params.dimensions, d => orderDict[d])
    }

    if (!firstSortingTerm) {
      firstSortingTerm = _.first(params.metrics)
    }

    dimensionExtraSettings = params.dimensions.map(() => {
      return ({
        sortCol: firstSortingTerm,
        sortDirect: orderDict[firstSortingTerm] ? orderDict[firstSortingTerm].sort : 'desc',
        limit: params.limit
      })
    })
  }

  // 转换成新版的 dimensionExtraSettingDict
  let dimensionExtraSettingDict = _.zip(params.dimensions, dimensionExtraSettings).reduce((prev, [dim, setting], i) => {
    if (!dim || !setting) {
      return prev
    }
    if (dim === '__time') {
      setting = Object.assign({}, setting, {
        granularity: params.granularity && _.startsWith(params.granularity, 'P') ? params.granularity : 'P1D'
      })
    }
    if (i === 0 && params.limit) {
      setting = Object.assign({}, setting, {
        limit: params.limit * 1
      })
    }
    prev[dim] = _.pick(setting, ['sortCol', 'sortDirect', 'limit', 'type', 'granularity'])
    return prev
  }, {})

  keeped.dimensionExtraSettingDict = dimensionExtraSettingDict
  return keeped
}

/*
(function test1() {
  let params = {
    "metrics": [
      "wuxianjiRT_total",
      "wjx_rt_liulanshu",
      "wxj_rt_startup_total",
      "wxj_rt_visit_count"
    ],
    "dimensionExtraSettings": [
      {
        "sortCol": "wuxianjiRT_total",
        "sortDirect": "desc",
        "limit": 50,
        "dimension": "Nation"
      },
      {
        "sortCol": "wuxianjiRT_total",
        "sortDirect": "desc",
        "limit": 5,
        "dimension": "Province"
      }
    ],
    "dimensions": [
      "Nation",
      "Province"
    ],
    "viz_type": "table",
    "relativeTime": "-1 weeks",
    "timezone": "Asia/Shanghai",
    "since": "",
    "filters": [
      {
        "col": "City",
        "op": "not in",
        "eq": [
          "重庆市"
        ]
      }
    ],
    "until": ""
  }
  let new0 = doMigration(params)
  console.log(JSON.stringify(new0, null, 2))
})()*/
