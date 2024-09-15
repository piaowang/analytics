/**
 *  运维管理-周期调度管理-开发总览统计
 */
import ReactEcharts from 'echarts-for-react'
import { useEffect, useState } from 'react'

import { Table } from 'antd'

import './index.styl'
export default function OverviewStatisticsComponent(props) {
  const tableKey = +new Date() //设置key
  const [echartOptions, setEchartOption] = useState({})
  const { title: chartsTitle = '', data: optionData = [] } = props
  // 设置options
  useEffect(() => {
    // 空数组的时候，提供一个初始值(0)作为操作符的中立元素
    let total = optionData.map(e => e.value || 0).reduce((a, b) => a + b, 0)
    setEchartOption({
      title: {
        text: chartsTitle,
        left: 'center'
      },
      color: ['#ffb357', '#9071ff', '#3398cc', '#fa70b7', '#f57676', '#5cb85c', '#d9534f', '#fad052'],
      tooltip: {
        trigger: 'item',
        formatter: function (params) {
          const { name, value } = params.data
          return `<span>${name}<br />${((value * 100) / total || 0).toFixed(2)}%</span>`
        }
      },
      legend: {
        orient: 'horizontal',
        type:'scroll',
        right: 5,
        top: 30,
        itemheight: {
          padding: [1, 0, 0, 0]
        },
        data: optionData.map(e => e.name)
      },
      series: [
        {
          radius: '45%',
          type: 'pie',
          center: ['50%', '60%'],
          selectedMode: 'single',
          data: optionData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    })
  }, [optionData])
  // table的列
  const columns = [
    {
      title: '状态',
      dataIndex: 'name',
      key: 'name',
      align: 'center'
    },
    {
      title: '数量',
      dataIndex: 'value',
      key: 'value',
      align: 'center'
    }
  ]
  return (
    <div className='overview_statistics_component'>
      <div className='pie'>
        <ReactEcharts option={echartOptions} />
      </div>
      <div className='table'>
        <Table key={tableKey} bordered columns={columns} rowClassName='rowClassName' dataSource={optionData} pagination={false} />
      </div>
    </div>
  )
}
