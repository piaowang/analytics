
// http://pm.sugoio.com/zentao/task-view-125.html
// SDK 项目默认指标
import {EMPTY_VALUE_OR_NULL} from '../../common/constants'

export const SDK_DEFAULT_METRICS = [
  {
    'title': '点击量',
    'formula': '$main.filter($event_type.in(["点击"])).count()'
  },
  {
    'title': '平均点击量',
    'formula': '($main.filter($event_type.in(["点击"])).count()).divide($main.filter($session_id.isnt("").and($session_id.isnt(null))).countDistinct($session_id))'
  },
  {
    'title': '人均点击量',
    'formula': '($main.filter($event_type.in(["点击"])).count()).divide($main.filter($distinct_id.isnt("").and($distinct_id.isnt(null))).countDistinct($distinct_id))'
  },
  {
    'title': '平均使用时长',
    'formula': '($main.sum($duration)).divide($main.filter($session_id.isnt("").and($session_id.isnt(null))).countDistinct($session_id))'
  },
  {
    'title': '人均使用时长',
    'formula': '($main.sum($duration)).divide($main.filter($distinct_id.isnt("").and($distinct_id.isnt(null))).countDistinct($distinct_id))'
  },
  {
    'title': '使用时长',
    'formula': '$main.sum($duration)'
  },
  {
    'title': '访问次数',
    'formula': '$main.filter($session_id.isnt("").and($session_id.isnt(null))).countDistinct($session_id)'
  },
  {
    'title': '访客数',
    'formula': '$main.filter($distinct_id.isnt("").and($distinct_id.isnt(null))).countDistinct($distinct_id)'
  }
]

// 需要翻译单图名称到实际单图 id
export const SDK_DEFAULT_DASHBOARDS = [
  {
    'dashboard_title': '用户产品偏好',
    'position_json': [
      { 'h': 10, 'i': '用户偏好品牌占比', 'w': 4, 'x': 0, 'y': 0, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户停留时间的分布情况', 'w': 4, 'x': 8, 'y': 0, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '最受欢迎的手机型号TOP10', 'w': 4, 'x': 4, 'y': 0, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '点击事件统计', 'w': 4, 'x': 0, 'y': 10, 'minH': 3, 'minW': 3, 'moved': false, 'static': false }
    ]
    // 'datasource_id': 'Syxcn5NWyQ',
    // 'created_by': 'H1MQc_yn0G',
    // 'company_id': 'rkmqO1hCf',
    // 'role_id': 'B1x7cdyhAM'
  },
  {
    'dashboard_title': '用户属性',
    'position_json': [
      { 'h': 10, 'i': '各个省份的用户分布情况', 'w': 4, 'x': 0, 'y': 0, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户操作系统的排名', 'w': 4, 'x': 4, 'y': 0, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户使用浏览器的情况', 'w': 4, 'x': 8, 'y': 0, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户使用的设备分辨率情况', 'w': 4, 'x': 0, 'y': 10, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户的使用设备型号情况', 'w': 4, 'x': 4, 'y': 10, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户使用运营商的占比分布情况', 'w': 4, 'x': 8, 'y': 10, 'minH': 3, 'minW': 3, 'moved': false, 'static': false },
      { 'h': 10, 'i': '用户区域分布（散点地图）', 'w': 4, 'x': 0, 'y': 20, 'minH': 3, 'minW': 3, 'moved': false, 'static': false }
    ]
  }
]

// 需要翻译 metrics/sortCol title 到实际的 name
export const SDK_DEFAULT_SLICES = [
  // 用户产品偏好看板
  {
    // 'id': 'Sk5V-fBx7',
    // 'druid_datasource_id': 'Syxcn5NWyQ',
    // 'created_by': 'H1MQc_yn0G',
    'slice_name': '最受欢迎的手机型号TOP10',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ EMPTY_VALUE_OR_NULL ],
          'op': 'not in',
          'col': 'device_model',
          'type': 'string',
          'containsNull': true
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'balance_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'device_model' ],
      'dimensionExtraSettingDict': {
        'device_model': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户偏好品牌占比',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ EMPTY_VALUE_OR_NULL ],
          'op': 'not in',
          'col': 'device_brand',
          'type': 'string',
          'containsNull': true
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'pie',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'device_brand' ],
      'dimensionExtraSettingDict': {
        'device_brand': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户停留时间的分布情况',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ 0, 1528 ],
          'op': 'in',
          'col': 'duration',
          'type': 'number'
        },
        {
          'eq': [ 'APP停留' ],
          'op': 'in',
          'col': 'event_name',
          'type': 'string',
          'containsNull': false
        }
      ],
      'metrics': [ '总记录数' ],
      'vizType': 'horizontal_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'duration' ],
      'pinningDims': [ 'event_name' ],
      'dimensionExtraSettingDict': {
        'duration': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc',
          'granularity': 10
        }
      }
    }
  },
  {
    'slice_name': '点击事件统计',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ '点击' ],
          'op': 'in',
          'col': 'event_type',
          'type': 'string'
        }
      ],
      'metrics': [ '总记录数' ],
      'vizType': 'dist_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'event_name' ],
      'dimensionExtraSettingDict': {
        'event_name': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  // 用户属性看板
  {
    'slice_name': '各个省份的用户分布情况',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'map',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'sugo_province' ],
      'dimensionExtraSettingDict': {
        'sugo_province': {
          'limit': 50,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户的使用设备型号情况',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ EMPTY_VALUE_OR_NULL ],
          'op': 'not in',
          'col': 'device_model',
          'type': 'string',
          'containsNull': true
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'horizontal_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'device_model' ],
      'dimensionExtraSettingDict': {
        'device_model': {
          'limit': 10,
          'sortCol': '访客数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户使用的设备分辨率情况',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ 160 ],
          'op': 'not nullOrEmpty',
          'col': 'screen_dpi',
          'type': 'number'
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'horizontal_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'screen_dpi' ],
      'dimensionExtraSettingDict': {
        'screen_dpi': {
          'limit': 10,
          'sortCol': '访客数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户使用运营商的占比分布情况',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ EMPTY_VALUE_OR_NULL ],
          'op': 'not in',
          'col': 'carrier',
          'type': 'string',
          'containsNull': true
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'pie',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'carrier' ],
      'dimensionExtraSettingDict': {
        'carrier': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户使用浏览器的情况',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        },
        {
          'eq': [ EMPTY_VALUE_OR_NULL ],
          'op': 'not in',
          'col': 'browser',
          'type': 'string',
          'containsNull': true
        },
        {
          'eq': [ EMPTY_VALUE_OR_NULL ],
          'op': 'not in',
          'col': 'browser_version',
          'type': 'string',
          'containsNull': true,
          'isLegendFilter': true
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'multi_dim_stacked_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        'browser_version',
        'browser'
      ],
      'dimensionExtraSettingDict': {
        'browser': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        },
        'browser_version': {
          'limit': 10,
          'sortCol': '总记录数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户区域分布（散点地图）',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'scatter_map',
      'timezone': 'Asia/Shanghai',
      'dimensions': [
        'sugo_province',
        'sugo_city'
      ],
      'chartExtraSettings': { 'mapName': 'china' },
      'dimensionExtraSettingDict': {
        'sugo_city': {
          'limit': 10,
          'sortCol': '访客数',
          'sortDirect': 'desc'
        },
        'sugo_province': {
          'limit': 100,
          'sortCol': '访客数',
          'sortDirect': 'desc'
        }
      }
    }
  },
  {
    'slice_name': '用户操作系统的排名',
    'params': {
      'filters': [
        {
          'eq': '-3 days',
          'op': 'in',
          'col': '__time',
          'dateStringComparingFormat': null
        }
      ],
      'metrics': [ '访客数' ],
      'vizType': 'dist_bar',
      'timezone': 'Asia/Shanghai',
      'dimensions': [ 'system_name' ],
      'dimensionExtraSettingDict': {
        'system_name': {
          'limit': 10,
          'sortCol': '访客数',
          'sortDirect': 'desc'
        }
      }
    }
  }
]
