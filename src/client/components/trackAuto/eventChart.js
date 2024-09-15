import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import ReactEcharts from 'echarts-for-react'
import _ from 'lodash'
import DruidQuery from '../../models/druid-query/resource'
import moment from 'moment'

export const TEMP_METRIC = '_tempMetric_clicks'

const EventEdit = ({ autotrackPath, autotrackPagePath, token, datasourceId }) => {
  const [data, setData] = useState([])
  const getData = async () => {
    const res = await DruidQuery.query({
      druid_datasource_id: datasourceId,
      timezone: 'Asia/Shanghai',
      granularity: 'P1D',
      filters: [{
        col: 'sugo_autotrack_path',
        'op': 'startsWith',
        'eq': [autotrackPath],
        'type': 'string'
      }, {
        col: 'sugo_autotrack_page_path',
        'op': 'in',
        'eq': [autotrackPagePath],
        'type': 'string'
      }, {
        col: 'token',
        op: 'in',
        eq: [token],
        dateStringComparingFormat: null
      }, {
        col: '__time',
        op: 'in',
        eq: '-7 days',
        dateStringComparingFormat: null
      }],
      dimensions: ['__time'],
      splitType: 'groupBy',
      queryEngine: 'tindex',
      customMetrics: [{ name: TEMP_METRIC, formula: '$main.count()', dimName: 'distinct_id', dimParams: {} }],
      dimensionExtraSettings: [{ sortCol: '__time', sortDirect: 'asc', limit: 10 }]
    })
    if (_.get(res, 'result.0.resultSet', [])) {
      setData(_.get(res, 'result.0.resultSet', []))
    } else {
      message.warn('获取数据失败')
    }
  }
  useEffect(() => {
    if (autotrackPagePath && autotrackPath && datasourceId) {
      getData()
    }
  }, [autotrackPath, autotrackPagePath])
  let newData = data
  // 补充数据显示
  if (data.length < 7) {
    const eventDataMap = _.reduce(data, (r, v) => {
      r[moment(v['__time']).format('YYYY-MM-DD')] = v[TEMP_METRIC]
      return r
    }, {})
    newData = _.map(Array(7), (p, idx) => {
      const date = moment().add(idx - 7 + 1, 'd').format('YYYY-MM-DD')
      return { __time: date, [TEMP_METRIC]: _.get(eventDataMap, [date], 0) }
    })
  }

  const xAxisData = newData.map(p => {
    return moment(p.__time).format('MM/DD dddd')
  })

  const seriesData = newData.map(p => {
    return p[TEMP_METRIC]
  })
  return (
    <ReactEcharts
      option={{
        border: 1,
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          top: '40',
          left: '40',
          right: '40',
          bottom: '',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xAxisData
        },
        yAxis: {
          type: 'value',
          splitNumber: 2,
          minInterval: 1
        },
        series: [
          {
            name: '点击数',
            type: 'line',
            data: seriesData
          }
        ]
      }}
    />
  )
}

export default EventEdit
