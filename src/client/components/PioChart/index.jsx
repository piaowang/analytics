import React from 'react'
import echarts from 'echarts'
import chartData from './chart'
import './style.styl'

export default class PioChart extends React.Component {
  componentDidMount() {
    this.initTree(chartData.treeData)
    this.initScatter(chartData.scatter)
    this.initRondom(chartData.rondom)
  }
  initTree(treeData) {
    const myChart = echarts.init(document.getElementById('Jtree'))
    echarts.util.each(treeData.children, () => {
      return true
    })
    myChart.setOption({
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      title: {
        text: '决策树状图',
        left: 'center'
      },
      series: [
        {
          type: 'tree',
          initialTreeDepth: -1,
          data: [treeData],

          top: '1%',
          left: '7%',
          bottom: '1%',
          right: '20%',

          symbolSize: 7,

          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            fontSize: 9
          },

          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left'
            }
          },
          expandAndCollapse: true,
          animationDuration: 550,
          animationDurationUpdate: 750
        }
      ]
    })
  }
  initScatter(data) {
    const myChart = echarts.init(document.getElementById('Jscatter'))
    echarts.util.each(data.children, () => {
      return true
    })
    myChart.setOption({
      xAxis: {
        scale: true,
        axisLabel: {
          formatter: '{value} cm'
        }
      },
      yAxis: {
        scale: true,
        axisLabel: {
          formatter: '{value} cm'
        }
      },
      legend: {
        data: ['setosa', 'versicolor', 'virginica'],
        left: 'center',
        top: '30'
      },
      title: {
        text: '鸢尾花种大小分布图',
        left: 'center'
      },
      tooltip: {
        showDelay: 0,
        formatter: function (params) {
          return `${params.seriesName}花瓣 ' :<br/> 长度：${params.value[0]}cm 宽度：${params.value[1]}cm`
        },
        axisPointer: {
          show: true,
          type: 'cross',
          lineStyle: {
            type: 'dashed',
            width: 1
          }
        }
      },
      series: data
    })
    setTimeout(()=>{
      myChart.resize()

    },200)
  }
  initRondom(data){
    const myChart = echarts.init(document.getElementById('Jrondom'))
    echarts.util.each(data.children, () => {
      return true
    })
    myChart.setOption({
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove'
      },
      title: {
        text: '随机树状图',
        left: 'center'
      },
      series: [
        {
          type: 'tree',
          initialTreeDepth: -1,
          data: [data],
          top: '5%',
          left: '7%',
          bottom: '1%',
          symbolSize: 7,
          label: {
            position: 'left',
            verticalAlign: 'middle',
            align: 'right',
            fontSize: 9
          },

          leaves: {
            label: {
              position: 'right',
              verticalAlign: 'middle',
              align: 'left'
            }
          },
          expandAndCollapse: true,
          animationDuration: 550,
          animationDurationUpdate: 750
        }
      ]
    })
    setTimeout(()=>{
      myChart.resize()
    },200)
  }
  render() {
    return (
      <div className='pio-body-box'>
        <div className='pio-chart-box'>
          <div className='item'>
            <div id='Jtree' className='box' />
          </div>
          <div className='item'>
            <div id='Jscatter' className='box' />
          </div>
        </div>
        <div className='pio-random-box'>
          <div id='Jrondom' className='box' />
        </div>
      </div>
    )
  }
}
