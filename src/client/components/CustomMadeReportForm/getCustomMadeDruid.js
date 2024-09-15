

export const queryAll = (druid_datasource_id) => {
  return {
    druid_datasource_id: druid_datasource_id,
    'granularity': 'P1D',
    'dimensionExtraSettings': [],
    params: {
      'customMetrics': [{
        'name': '新用户',
        'formula': '$main.filter($distinct_id.isnt("")).countDistinct($distinct_id)'
      }
      // {
      //   'name': '用户数',
      //   'formula': `$main.filter($distinct_id.isnt("")).filter(${+moment(date.mainDate)} <= $first_visit_time.cast('NUMBER') and $first_visit_time.cast('NUMBER') < ${+moment(date.secondDate)}).countDistinct($distinct_id)`
      // }
      ],
      'filters': [{
        'col': '__time',
        'op': 'in',
        'eq': ['1000', '3000']
      }]
    }
  }
}
