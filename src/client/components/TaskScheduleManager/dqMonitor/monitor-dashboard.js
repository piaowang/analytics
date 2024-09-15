/**
 * Created by fengxj on 3/28/19.
 */
import React from 'react'
import Fetch from '../../../common/fetch-final'
import {genCommonOption} from '../../../common/echarts-option-generator'
import ReactEcharts from '../../Charts/ReactEchartsEnhance'
import {Spin} from 'antd'

const datasource = window.sugo.dqMonitor.datasource

const firstNQueryTemp = {
  'queryType': 'lucene_firstN',
  'dataSource': datasource,
  'intervals': '2019-03-27T16Z/2019-03-28T10:21:02.640Z',
  'granularity': 'all',
  'context': {
    'timeout': 60000,
    'groupByStrategy': 'v2',
    'signal': {
      'listeners': {},
      'aborted': false,
      'onabort': null
    }
  },
  'filter': {
    'type': 'selector',
    'dimension': 'tag.project_name',
    'value': 'OGEmiE4ib'
  },
  'dimension': {
    'type': 'default',
    'dimension': 'name',
    'outputName': 'name'
  },
  'aggregations': [
    {
      'name': 'count',
      'type': 'lucene_count'
    }
  ],
  'formatted': false,
  'threshold': 100
}

const METRIC_NAME = 'monitor_metric_value'
const metricQueryTemp = {
  'queryType': 'lucene_groupBy',
  'dataSource': datasource,
  'intervals': '2019-03-27T16Z/2019-04-03T09:39:09.082Z',
  'granularity': 'all',
  'context': {
    'timeout': 60000,
    'groupByStrategy': 'v2',
    'signal': {
      'listeners': {},
      'aborted': false,
      'onabort': null
    }
  },
  'filter': {
    'type': 'and',
    'fields': [
      {
        'type': 'selector',
        'dimension': 'tag.project_name',
        'value': 'OGEmiE4ib'
      },
      {
        'type': 'selector',
        'dimension': 'name',
        'value': 'dq.1554114705366.age_0to5'
      }
    ]
  },
  'dimensions': [
    {
      'type': 'default',
      'dimension': 'tag.busTime',
      'outputName': 'tag.busTime'
    }
  ],
  'aggregations': [
    {
      'type': 'lucene_filtered',
      'name': METRIC_NAME,
      'filter': {
        'type': 'not',
        'field': {
          'type': 'lucene',
          'query': '(*:* NOT value:*)'
        }
      },
      'aggregator': {
        'name': METRIC_NAME,
        'type': 'lucene_doubleMax',
        'fieldName': 'value'
      }
    }
  ],
  'limitSpec': {
    'type': 'default',
    'columns': [
      {
        'dimension': 'tag.busTime',
        'direction': 'ascending'
      }
    ],
    'limit': 30
  }
}


export default class MonitorDashBorad extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      metricRes: [],
      loading: false
    }
    //'intervals': [`${start.toISOString()}/${end.toISOString()}`],
  }

  async componentWillMount() {
    let {taskName} = this.props
    if (taskName) {
      this.init(taskName)
    }
  }
  componentWillUnmount(){
    this.setState = (state,callback)=>{
      return
    }
  }

  componentDidUpdate(prevProps, prevState) {
    let {taskName} = this.props
    if (taskName && prevProps.taskName !== taskName) {
      this.init(taskName)
    }
  }

  async init(taskName) {
    this.setState({loading: true})
    let firstNQuery = _.cloneDeep(firstNQueryTemp)
    firstNQuery.filter.value = taskName
    let end = moment()
    let start = moment().add(-7, 'days')
    firstNQuery.intervals = [`${start.toISOString()}/${end.toISOString()}`]
    let query = LZString.compressToEncodedURIComponent(JSON.stringify(firstNQuery))
    const res = await Fetch.get(`/app/plyql/native/tindex?q=${query}`)
    const metrics = res[0].result


    let metricRes = []
    for(let index in metrics) {
      let metricQuery = _.cloneDeep(metricQueryTemp)
      const metric = metrics[index]
      metricQuery.filter.field[0].value = taskName
      metricQuery.filter.field[1].value = metric
      metricQuery.intervals = [`${start.toISOString()}/${end.toISOString()}`]
      let querystr = LZString.compressToEncodedURIComponent(JSON.stringify(metricQuery))
      const res = await Fetch.get(`/app/plyql/native/tindex?q=${querystr}`)
      metricRes.push([metric, res])
      this.setState({metricRes})
    };
    this.setState({loading: false})
  }

  genOption = (metric) => {
    let commonOption = genCommonOption()
    let xCols = metric[1].map(d => d.event['tag.busTime'])
    return {
      ...commonOption,
      legend: {
        'data': [{
          'icon': 'circle',
          'name': metric[0]
        }],
        'show': true
      },
      tooltip: {
        trigger: 'axis',
        confine: true
      },
      xAxis: {
        type: 'category',
        data: xCols,
        silent: false,
        splitLine: {
          show: xCols.length < 15,
          interval: 0
        },
        axisLabel: {
          interval: 'auto'
        },
        axisTick: {
          show: true,
          interval: 'auto',
          alignWithLabel: 15 <= xCols.length
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {}
      },
      series: {
        name: metric[0],
        type: 'line',
        barMaxWidth: 20,
        label: {
          normal: {}
        },
        data: metric[1].map(d => d.event[METRIC_NAME])
      }
    }
  }

  render() {
    let {metricRes, loading} = this.state
    let rest = {}
    return (<div>
      {
        metricRes.map((metric)=> {
          return (
            <div key={metric[0]} className="width-50 fleft"><ReactEcharts {...rest} option={this.genOption(metric)} notMerge/></div>
          )
        })
      }
      {loading ? <div className="width-50 fleft aligncenter">
        <Spin tip="加载中..."/>
      </div> : null
      }

    </div>

    )

  }
}
