import {isCharDimension, isNumberDimension, isTimeDimension} from '../../common/druid-column-type'
import {dateFormatterGenerator, leanDateFormatterGenerator} from '../../src/client/common/date-format-util'
import * as d3 from 'd3'


export const propsA1 = {
  'style': {
    'height': '100%',
    'overflow': 'inherit'
  },
  'className': 'css-1g2da2x',
  'metricsFormatDict': {},
  'data': [
    {
      'x1': '直接访问',
      'x2_Group': [
        {
          'y1': 68,
          'y2': 63,
          'x2': '周一'
        }
      ]
    },
    {
      'x1': '邮件营销',
      'x2_Group': [
        {
          'y1': 59,
          'y2': 53,
          'x2': '周二'
        }
      ]
    },
    {
      'x1': '联盟广告',
      'x2_Group': [
        {
          'y1': 37,
          'y2': 15,
          'x2': '周三'
        }
      ]
    },
    {
      'x1': '视频广告',
      'x2_Group': [
        {
          'y1': 37,
          'y2': 78,
          'x2': '周四'
        }
      ]
    },
    {
      'x1': '搜索引擎',
      'x2_Group': [
        {
          'y1': 53,
          'y2': 77,
          'x2': '周五'
        }
      ]
    }
  ],
  'limit': 100,
  'dimensions': [
    'x1',
    'x2'
  ],
  'metrics': [
    'y1',
    'y2'
  ],
  'settings': {
    'head': {
      'show': true,
      'color': '#fff',
      'fontSize': '12px',
      'backgroundColor': 'rgba(0,0,0,0)'
    },
    'border': {
      'borderColor': '#fff',
      'borderStyle': 'solid',
      'borderTopWidth': '1',
      'borderLeftWidth': '1'
    },
    'content': {
      'color': '#fff',
      'fontSize': '12px',
      'backgroundColor': 'rgba(0,0,0,0)'
    },
    'scrolling': false
  },
  'isThumbnail': true,
  'showLegend': true,
  'dimensionExtraSettingDict': {},
  'translationDict': {},
  'setParams': {
    'metrics': [
      'y1',
      'y2'
    ],
    'dataPath': '',
    'accessData': 'x1,x2,y1,y2\n直接访问,周一,68,63\n邮件营销,周二,59,53\n联盟广告,周三,37,15\n视频广告,周四,37,78\n搜索引擎,周五,53,77',
    'dimensions': [
      'x1',
      'x2'
    ],
    'accessDataType': 'csv',
    'translationDict': {},
    'autoReloadInterval': 0
  },
  'queryInQueue': true,
  'accessData': 'x1,x2,y1,y2\n直接访问,周一,68,63\n邮件营销,周二,59,53\n联盟广告,周三,37,15\n视频广告,周四,37,78\n搜索引擎,周五,53,77',
  'pagination': false,
  'publicAccess': true,
  'cancelListener': null,
  'druidData': [
    {
      'x1': '直接访问',
      'x2_Group': [
        {
          'y1': 68,
          'y2': 63,
          'x2': '周一'
        }
      ]
    },
    {
      'x1': '邮件营销',
      'x2_Group': [
        {
          'y1': 59,
          'y2': 53,
          'x2': '周二'
        }
      ]
    },
    {
      'x1': '联盟广告',
      'x2_Group': [
        {
          'y1': 37,
          'y2': 15,
          'x2': '周三'
        }
      ]
    },
    {
      'x1': '视频广告',
      'x2_Group': [
        {
          'y1': 37,
          'y2': 78,
          'x2': '周四'
        }
      ]
    },
    {
      'x1': '搜索引擎',
      'x2_Group': [
        {
          'y1': 53,
          'y2': 77,
          'x2': '周五'
        }
      ]
    }
  ],
  'isFetchingDataSourceDimensions': false,
  'isSyncingDataSourceDimensions': false,
  'dataSourceDimensions': [],
  'dataSourceDimensionsBak': [],
  'isFetchingDataSourceMeasures': false,
  'isSyncingDataSourceMeasures': false,
  'dataSourceMeasures': [],
  'dataSourceMeasuresBak': [],
  'metricNameDict': {},
  'total': {},
  'spWidth': 1053,
  'spHeight': 823,
  dimensionColumnFormatterGen(dimension, opts) {
    const slice = {
      'params': {
        'dimensions': [
          'x1',
          'x2'
        ],
        'metrics': [
          'y1',
          'y2'
        ],
        'filters': [],
        'customMetrics': [
          {
            'name': 'y1'
          },
          {
            'name': 'y2'
          }
        ],
        'dimensionExtraSettingDict': {},
        'tempMetricDict': {},
        'autoReloadInterval': 0,
        'vizType': 'table',
        'chartExtraSettings': {
          'head': {
            'show': true,
            'color': '#fff',
            'fontSize': '12px',
            'backgroundColor': 'rgba(0,0,0,0)'
          },
          'border': {
            'borderColor': '#fff',
            'borderStyle': 'solid',
            'borderTopWidth': '1',
            'borderLeftWidth': '1'
          },
          'content': {
            'color': '#fff',
            'fontSize': '12px',
            'backgroundColor': 'rgba(0,0,0,0)'
          },
          'scrolling': false
        },
        'timezone': 'Asia/Shanghai',
        'dataPath': '',
        'accessData': 'x1,x2,y1,y2\n直接访问,周一,68,63\n邮件营销,周二,59,53\n联盟广告,周三,37,15\n视频广告,周四,37,78\n搜索引擎,周五,53,77',
        'accessDataType': 'csv',
        'translationDict': {}
      }
    }
    const dimNameDict = {}
    if (dimension in dimNameDict) {
      let pattern = _.get(slice, `params.dimensionExtraSettingDict.${dimension}.pattern`)
      if (isTimeDimension(dimNameDict[dimension])) {
        if (pattern) {
          return dateFormatterGenerator(pattern)
        }
        let {showComplete} = opts || {}
        let granularity = _.get(slice, `params.dimensionExtraSettingDict.${dimension}.granularity`) || 'P1D'
        return leanDateFormatterGenerator(granularity, showComplete)
      }
      if (isNumberDimension(dimNameDict[dimension]) && pattern) {
        return d3.format(pattern)
      }
    }
    // null 意味着不进行格式化
    return null
  }
}

export const newDataResultA1 = [
  {
    'x1, x2': '直接访问',
    'y1': '',
    'y2': '',
    'x1': '直接访问',
    'children': [
      {
        'x1, x2': '周一',
        'y1': 68,
        'y2': 63,
        'x2': '周一',
        '__dimensionIndex': 1,
        'uid​': 0
      }
    ],
    '__dimensionIndex': 0,
    'uid​': 1
  },
  {
    'x1, x2': '邮件营销',
    'y1': '',
    'y2': '',
    'x1': '邮件营销',
    'children': [
      {
        'x1, x2': '周二',
        'y1': 59,
        'y2': 53,
        'x2': '周二',
        '__dimensionIndex': 1,
        'uid​': 2
      }
    ],
    '__dimensionIndex': 0,
    'uid​': 3
  },
  {
    'x1, x2': '联盟广告',
    'y1': '',
    'y2': '',
    'x1': '联盟广告',
    'children': [
      {
        'x1, x2': '周三',
        'y1': 37,
        'y2': 15,
        'x2': '周三',
        '__dimensionIndex': 1,
        'uid​': 4
      }
    ],
    '__dimensionIndex': 0,
    'uid​': 5
  },
  {
    'x1, x2': '视频广告',
    'y1': '',
    'y2': '',
    'x1': '视频广告',
    'children': [
      {
        'x1, x2': '周四',
        'y1': 37,
        'y2': 78,
        'x2': '周四',
        '__dimensionIndex': 1,
        'uid​': 6
      }
    ],
    '__dimensionIndex': 0,
    'uid​': 7
  },
  {
    'x1, x2': '搜索引擎',
    'y1': '',
    'y2': '',
    'x1': '搜索引擎',
    'children': [
      {
        'x1, x2': '周五',
        'y1': 53,
        'y2': 77,
        'x2': '周五',
        '__dimensionIndex': 1,
        'uid​': 8
      }
    ],
    '__dimensionIndex': 0,
    'uid​': 9
  }
]

export const tableColumnsResultA1 = [
  {
    'axisName': 'x1, x2',
    'title': 'x1, x2',
    'dataIndex': 'x1, x2',
    'key': 'x1, x2',
    'width': 345
  },
  {
    'axisName': 'y1',
    'title': 'y1',
    'dataIndex': 'y1',
    'key': 'y1',
    'width': 345
  },
  {
    'axisName': 'y2',
    'title': 'y2',
    'dataIndex': 'y2',
    'key': 'y2',
    'width': 345
  }
]




















export const propsB1 = {
  'style': {
    'height': '100%',
    'overflow': 'inherit'
  },
  'className': 'css-16owqic',
  'metricsFormatDict': {},
  'data': [
    {
      'x1': '直接访问',
      'x2_Group': [
        {
          'y1': 53,
          'y2': 7,
          'x2': '周一'
        }
      ]
    },
    {
      'x1': '邮件营销',
      'x2_Group': [
        {
          'y1': 15,
          'y2': 100,
          'x2': '周二'
        }
      ]
    },
    {
      'x1': '联盟广告',
      'x2_Group': [
        {
          'y1': 27,
          'y2': 47,
          'x2': '周三'
        }
      ]
    },
    {
      'x1': '视频广告',
      'x2_Group': [
        {
          'y1': 15,
          'y2': 33,
          'x2': '周四'
        }
      ]
    },
    {
      'x1': '搜索引擎',
      'x2_Group': [
        {
          'y1': 68,
          'y2': 4,
          'x2': '周五'
        }
      ]
    }
  ],
  'limit': 100,
  'dimensions': [
    'x1',
    'x2'
  ],
  'metrics': [
    'y1',
    'y2'
  ],
  'settings': {
    'head': {
      'fontSize': '12px',
      'backgroundColor': 'rgba(0,0,0,0)',
      'color': '#fff',
      'show': true
    },
    'content': {
      'fontSize': '12px',
      'backgroundColor': 'rgba(0,0,0,0)',
      'color': '#fff'
    },
    'border': {
      'borderTopWidth': '1',
      'borderLeftWidth': '1',
      'borderStyle': 'solid',
      'borderColor': '#fff'
    },
    'scrolling': false
  },
  'isThumbnail': true,
  'showLegend': true,
  'dimensionExtraSettingDict': {},
  'translationDict': {},
  'setParams': {
    'metrics': [
      'y1',
      'y2'
    ],
    'dimensions': [
      'x1',
      'x2'
    ],
    'accessDataType': 'csv',
    'accessData': 'x1,x2,y1,y2\n直接访问,周一,53,7\n邮件营销,周二,15,100\n联盟广告,周三,27,47\n视频广告,周四,15,33\n搜索引擎,周五,68,4',
    'translationDict': {},
    'autoReloadInterval': 0,
    'dataPath': ''
  },
  'queryInQueue': true,
  'accessData': 'x1,x2,y1,y2\n直接访问,周一,53,7\n邮件营销,周二,15,100\n联盟广告,周三,27,47\n视频广告,周四,15,33\n搜索引擎,周五,68,4',
  'pagination': false,
  'publicAccess': true,
  'cancelListener': null,
  'druidData': [
    {
      'x1': '直接访问',
      'x2_Group': [
        {
          'y1': 53,
          'y2': 7,
          'x2': '周一'
        }
      ]
    },
    {
      'x1': '邮件营销',
      'x2_Group': [
        {
          'y1': 15,
          'y2': 100,
          'x2': '周二'
        }
      ]
    },
    {
      'x1': '联盟广告',
      'x2_Group': [
        {
          'y1': 27,
          'y2': 47,
          'x2': '周三'
        }
      ]
    },
    {
      'x1': '视频广告',
      'x2_Group': [
        {
          'y1': 15,
          'y2': 33,
          'x2': '周四'
        }
      ]
    },
    {
      'x1': '搜索引擎',
      'x2_Group': [
        {
          'y1': 68,
          'y2': 4,
          'x2': '周五'
        }
      ]
    }
  ],
  'isFetchingDataSourceDimensions': false,
  'isSyncingDataSourceDimensions': false,
  'dataSourceDimensions': [],
  'dataSourceDimensionsBak': [],
  'isFetchingDataSourceMeasures': false,
  'isSyncingDataSourceMeasures': false,
  'dataSourceMeasures': [],
  'dataSourceMeasuresBak': [],
  'metricNameDict': {},
  'total': {},
  'spWidth': 500,
  'spHeight': 300,
  dimensionColumnFormatterGen(dimension, opts) {
    const slice = {
      'params': {
        'dimensions': [
          'x1',
          'x2'
        ],
        'metrics': [
          'y1',
          'y2'
        ],
        'filters': [],
        'customMetrics': [
          {
            'name': 'y1'
          },
          {
            'name': 'y2'
          }
        ],
        'dimensionExtraSettingDict': {},
        'tempMetricDict': {},
        'autoReloadInterval': 0,
        'vizType': 'table_flat',
        'chartExtraSettings': {
          'head': {
            'show': true,
            'color': '#fff',
            'fontSize': 24,
            'backgroundColor': 'rgba(0,0,0,0)'
          },
          'border': {
            'borderColor': '#fff',
            'borderStyle': 'solid',
            'borderTopWidth': '1',
            'borderLeftWidth': '1'
          },
          'content': {
            'color': '#fff',
            'fontSize': 24,
            'backgroundColor': 'rgba(0,0,0,0)'
          },
          'scrolling': false
        },
        'timezone': 'Asia/Shanghai',
        'dataPath': '',
        'accessData': 'x1,x2,y1,y2\n直接访问,周一,85,91\n邮件营销,周二,49,95\n联盟广告,周三,66,96\n视频广告,周四,19,70\n搜索引擎,周五,30,41',
        'accessDataType': 'csv',
        'translationDict': {}
      }
    }
    const dimNameDict = {}
    if (dimension in dimNameDict) {
      let pattern = _.get(slice, `params.dimensionExtraSettingDict.${dimension}.pattern`)
      if (isTimeDimension(dimNameDict[dimension])) {
        if (pattern) {
          return dateFormatterGenerator(pattern)
        }
        let {showComplete} = opts || {}
        let granularity = _.get(slice, `params.dimensionExtraSettingDict.${dimension}.granularity`) || 'P1D'
        return leanDateFormatterGenerator(granularity, showComplete)
      }
      if (isNumberDimension(dimNameDict[dimension]) && pattern) {
        return d3.format(pattern)
      }
    }
    // null 意味着不进行格式化
    return null
  }
}


export const newDataResultB1 = [
  {
    'x1': '直接访问',
    'x2_Group': [
      {
        'y1': 85,
        'y2': 91,
        'x2': '周一'
      }
    ]
  },
  {
    'x1': '邮件营销',
    'x2_Group': [
      {
        'y1': 49,
        'y2': 95,
        'x2': '周二'
      }
    ]
  },
  {
    'x1': '联盟广告',
    'x2_Group': [
      {
        'y1': 66,
        'y2': 96,
        'x2': '周三'
      }
    ]
  },
  {
    'x1': '视频广告',
    'x2_Group': [
      {
        'y1': 19,
        'y2': 70,
        'x2': '周四'
      }
    ]
  },
  {
    'x1': '搜索引擎',
    'x2_Group': [
      {
        'y1': 30,
        'y2': 41,
        'x2': '周五'
      }
    ]
  }
] 

export const tableColumnsResultB1 = [
  {
    'axisName': 'x1',
    'title': 'x1',
    'dataIndex': 'x1',
    'key': 'x1',
    'width': 269
  },
  {
    'axisName': 'x2',
    'title': 'x2',
    'dataIndex': 'x2',
    'key': 'x2',
    'width': 269
  },
  {
    'axisName': 'y1',
    'title': 'y1',
    'dataIndex': 'y1',
    'key': 'y1',
    'width': 269
  },
  {
    'axisName': 'y2',
    'title': 'y2',
    'dataIndex': 'y2',
    'key': 'y2',
    'width': 269
  }
]

export const newSettingsResultB1 = {
  'head': {
    'show': true,
    'color': '#fff',
    'fontSize': 24,
    'backgroundColor': 'rgba(0,0,0,0)'
  },
  'border': {
    'borderColor': '#fff',
    'borderStyle': 'solid',
    'borderTopWidth': '1',
    'borderLeftWidth': '1'
  },
  'content': {
    'color': '#fff',
    'fontSize': 24,
    'backgroundColor': 'rgba(0,0,0,0)'
  },
  'scrolling': false
}
