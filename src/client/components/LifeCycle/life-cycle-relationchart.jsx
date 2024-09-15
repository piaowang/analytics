import React, { Component } from 'react'
import ReactEcharts from 'echarts-for-react'
import { saveAndBrowserInInsight } from '../../common/usergroup-helper'

class LCRelationChart extends Component {

  state = {
    echartsInst: null
  }

  saveEchartInstance(e) {
    if (e) {
      this.setState({ echartsInst: e })
    }
  }

  eventHandler(e) {

    e.on('click', (params) => {
      if (_.get(params,'data.label.param.usergroupWithTotal')) {
        saveAndBrowserInInsight(_.get(params,'data.label.param.usergroupWithTotal'))
      }
    })
  }

  render() {
    const { nowUg, preUg, rotatedUsergroup } = this.props

    const option = {
      title: {
        text: '流转关系'
      },
      color: ['#6365D8'],
      tooltip: {},
      //数据更新动画的时长。
      animationDurationUpdate: 1500,
      //数据更新动画的缓动效果。
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          type: 'graph',
          layout: 'none',
          top: '50%',
          symbol: 'rect',
          //节点大小
          symbolSize: [100, 50],
          //roam: true,
          //节点文字是否显示
          label: {
            normal: {
              show: true
            }
          },
          //指向箭头
          edgeSymbol: ['circle', 'arrow'],
          //edgeSymbolSize: [1, 10],
          //连接线文字大小
          edgeLabel: {
            normal: {
              textStyle: {
                fontSize: 20
              }
            }
          },
          data: nowUg.map( (i, idx) => ({
            name: i.title.split('_')[1] ? i.title.split('_')[1] : i.title.split('_')[0],
            x: idx * 200,
            y: 0 
          })),
          links: rotatedUsergroup.map( i => ({
            source: i.start.split('_')[1] ? i.start.split('_')[1] : i.start.split('_')[0],
            target:i.terminal.split('_')[1] ? i.terminal.split('_')[1] : i.terminal.split('_')[0],
            symbolSize: [4, 10],
            label: {
              show: true,
              formatter:(v) => `${i.usergroupWithTotal.params.total}人`,
              param: i
            },
            lineStyle: {
              normal: {
                width: 2,
                //线的曲度
                curveness: 0.4
              }
            }
          }))
        }
      ]
    }
    return (
      <ReactEcharts
        ref="echarts"
        className="height500"
        option={option}
        onChartReady={e => {
          // this.saveEchartInstance(e)
          this.eventHandler(e)
        }}
      />
    )
  }
}

export default LCRelationChart
