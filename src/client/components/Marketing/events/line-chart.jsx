import React, { Component } from 'react'
import Chart from '../../Charts/LineChart'
import moment from 'moment'

class LineChart extends Component {
  render() {
    const { data = [], title='', selectedMetric = ['target_total', 'revisit_total'] } = this.props
    const translationDict = {
      send_time: '发送日期',
      target_total: '目标用户数',
      revisit_total: '回访用户数',
      open_total: '打开用户数',
      revisit_rate: '回访率',
      open_rate: '打开率'
    }
    let tData = data.map( i => {
      const { send_time, send_target_total, send_revisit_total, send_open_total } = i
      let res = {
        send_time: moment(send_time).format('YYYY-MM-DD')
      }
      if (selectedMetric.includes('target_total')) {
        res.target_total = send_target_total
      }
      if (selectedMetric.includes('revisit_total')) {
        res.revisit_total = send_revisit_total
      }
      if (selectedMetric.includes('open_total')) {
        res.open_total = send_open_total
      }
      if (selectedMetric.includes('revisit_rate')) {
        res.revisit_rate = ((send_revisit_total / send_target_total) * 100).toFixed(2)
      }
      if (selectedMetric.includes('open_rate')) {
        res.open_rate = ((send_open_total / send_target_total ) * 100).toFixed(2)
      }
      return res
    })
    return (
      <div>
        {title}
        <Chart
          data={tData}
          dimensions={['send_time']}
          dimension="__time"
          metrics={selectedMetric || ['target_total', 'revisit_total']}
          metricsFormatDict={{}}
          translationDict={translationDict}
          optionsOverwriter={(option) => {
            option.grid = {
              ...option.grid,
              left: '4%'
            }
            if (selectedMetric.includes('revisit_rate') || selectedMetric.includes('open_rate')) {
              option.yAxis = [{
                name: '0',
                type: 'value'
              }, {
                name: '1',
                type: 'value',
                axisLabel: {  
                  show: true,  
                  interval: 'auto',  
                  formatter: '{value} %'  
                }
              }]
              option.series = option.series.map( i => {
                i.yAxisIndex = 0
                if (i.name.includes('率')) {
                  i.yAxisIndex = 1
                }
                return i
              })
              option.tooltip.formatter = (params) => {
                let val = params[0].name
                let arr = params.map( i => {
                  if (i.seriesName.includes('率')) {
                    return `<span style='display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${i.color}' ></span>${i.seriesName} : ${i.value}%`
                  } else {
                    return `<span style='display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${i.color}' ></span>${i.seriesName} : ${i.value}`
                  }
                })
                return `${val}<br/>${arr.join('<br/>')}`
              }
            }
            return option
          }}
        />
      </div>
    )
  }
}

export default LineChart
