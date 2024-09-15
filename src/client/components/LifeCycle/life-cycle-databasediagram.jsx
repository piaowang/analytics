import React, { Component } from 'react'
import moment from 'moment'
import ReactEcharts from '../../components/Charts/ReactEchartsEnhance'
import EchartsBaseOpts from '../../common/echart-base-options'


export default class DataBaseDiagram extends Component {

  generateArrayData(size) {
    let array = []
    for (let i = 0; i < size; i++) {
      array.push(this.randomData())
    }
    return array
  }

  randomData() {
    return Math.round(Math.random() * 1000)
  }

  render() {
    const { since, until, nowUg, preUg, diagram } = this.props

    let showPercent = diagram === 'userRatio'

    let option = {
      ...EchartsBaseOpts,
      'legend': {
        'show': true,
        'data': [
          since.format('YYYY-MM-DD'),
          until.format('YYYY-MM-DD')
        ]
      },
      'grid': {
        'top': '50px',
        'left': 'auto',
        'right': '4%',
        'bottom': '10px',
        'containLabel': true
      },
      'tooltip': {
        'axisPointer': {
          'type': 'shadow'
        },
        'trigger': 'axis',
        'confine': true,
        formatter: (params) => {
          if (showPercent) {
            let format = ''
            if (!params) return ''
            params.map( i => {
              format += `<br/>${i.seriesName}: ${i.data}%`
            })
            return `${params[0].name.replace(since.format('YYYY-MM-DD', ''))}${format}`
          } else {
            let format = params.map( i => `</br><span>${i.seriesName}: ${i.data}</span>`)
            return params[0].name.replace(since.format('YYYY-MM-DD') + '_', '') + format
          }
        }
      },
      'animationEasing': 'elasticOut',
      'xAxis': {
        'type': 'category',
        'data': nowUg.map( i => i.title.replace(since.format('YYYY-MM-DD') + '_', '')),
        'silent': false,
        'splitLine': {
          'show': true,
          'interval': 0
        },
        'axisLabel': {
          'interval': 'auto'
        },
        'axisTick': {
          'show': true,
          'interval': 0
        }
      },
      'yAxis': {
        'type': 'value',
        'axisLabel': showPercent ? {
          formatter: '{value} %'  
        } : {}
      },
      'series': [
        {
          'name': since.format('YYYY-MM-DD'),
          'type': 'bar',
          'barMaxWidth': 20,
          'data': nowUg.map( i => i[diagram])
        },
        {
          'name': until.format('YYYY-MM-DD'),
          'type': 'bar',
          'barMaxWidth': 20,
          'data': preUg.map( i => _.get( i, diagram, 0))
        }
      ]
    }

    return (
      <ReactEcharts
        style={{height: '300px'}}
        option={option}
        notMerge
      />
    )
  }
}
