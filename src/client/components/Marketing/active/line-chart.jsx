import React, { Component } from 'react'
import ReactEcharts from '../../Charts/ReactEchartsEnhance'
import Chart from '../../Charts/LineChart'
import moment from 'moment'

class LineChart extends Component {
  render() {
    const { data = {}, selectedMetric = '', resultSet = {} } = this.props
    const { sendGroupRevisit = [], contrastGroupRevisit = [], sendGroupOpen = [] } = data
    if (_.isEmpty(resultSet)) return <div />
    let send_time = _.get(resultSet, 'send_time', null)
    let duration = Math.max(moment().diff(moment(send_time), 'h'), 1)
    if (duration > 24) duration = 25
    let isInteger = moment(send_time).format('mmss') === '0000'
    if (isInteger) duration = 24

    let translationDict = {}
    let tData = []
    let metrics = []
    let dimensions = []
    translationDict = {
      sendGroup: '发送组',
      control: '对比组',
      __time: '时间'
    }

    dimensions = ['__time']
    metrics = ['sendGroup', 'control']

    let { send_target_total, contrast_target_total } = resultSet
    send_target_total = Math.max(send_target_total, 1)
    contrast_target_total = Math.max(contrast_target_total, 1)
    for (let i = 0; i < duration; i ++) {
      if (selectedMetric === 'revisit_total') {
        let send_group_revisit = _.get(sendGroupRevisit,`[${i}].send_group_revisit`, 0)
        let control_group_revisit = _.get(contrastGroupRevisit,`[${i}].contrast_group_revisit`, 0)
        tData.push({
          sendGroup: send_group_revisit,
          control: control_group_revisit,
          __time: i + '时'
        })
      }

      if (selectedMetric === 'revisit_rate') {
        let send_group_revisit_rate = (_.get(sendGroupRevisit,`[${i}].send_group_revisit`, 0) * 100 / send_target_total).toFixed(2)
        let control_group_revisit_rate = (_.get(contrastGroupRevisit,`[${i}].contrast_group_revisit`, 0) * 100 / contrast_target_total).toFixed(2)
        tData.push({
          sendGroup: send_group_revisit_rate,
          control: control_group_revisit_rate,
          __time: i + '时'
        })
      }

      if (selectedMetric === 'open_total') { 
        let open = _.get(sendGroupOpen,`[${i}].send_group_open`, 0)
        translationDict = {
          sendGroup: '发送组',
          __time: '时间'
        }
        tData.push({
          sendGroup: open,
          __time: i + '时'
        })
      }

      if (selectedMetric === 'open_rate') {
        let open_rate = (_.get(sendGroupOpen,`[${i}].send_group_open`, 0) * 100 / send_target_total).toFixed(2)
        translationDict = {
          sendGroup: '发送组',
          __time: '时间'
        }
        tData.push({
          sendGroup: open_rate,
          __time: i + '时'
        })
      }
    }


    return (
      <Chart
        data={tData}
        dimensions={dimensions}
        dimension="__time"
        metrics={metrics}
        metricsFormatDict={{}}
        translationDict={translationDict}
        optionsOverwriter={(option) => {
          option.grid = {
            ...option.grid,
            left: '2%'
          }
          if (selectedMetric === 'open_rate' || selectedMetric === 'revisit_rate') {
            option.yAxis = {
              ...option.yAxis,
              axisLabel: {  
                show: true,  
                interval: 'auto',  
                formatter: '{value} %'  
              }
            }
            option.tooltip.formatter = (params) => {
              let val = params[0].name
              let arr = params.map( i => `<span style='display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${i.color}' ></span>${i.seriesName} : ${i.value}%`)
              return `${val}<br/>${arr.join('<br/>')}`
            }
          }
          return option
        }}
      />
    )
  }
}

export default LineChart
