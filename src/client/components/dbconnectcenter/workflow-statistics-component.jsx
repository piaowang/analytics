/**
 *  运维管理-周期调度管理-工作流统计
 */
import ReactEcharts from 'echarts-for-react'
import { useEffect, useState } from 'react'

import './index.styl'
export default function WorkflowStatisticsComponent(props) {
  const [echartOptions, setEchartOption] = useState({})
  // 由于这儿的使用者有两种情况，一种是次数，一种是时长，所以这儿加一个isTime，如有，则是次数，否则就是时长
  const { title: chartsTitle = '', isTime, xlsxdata = [], data: optionData = [] } = props
  // 设置options
  useEffect(() => {
    let XUnit = 0 //0代表的是单位为秒。1代表单位为小时
    // 如果optionData的长度有一条大于3600，则把单位转化为小时
    if (optionData.find(option => option.value > 3600)) {
      XUnit = 1
      optionData.forEach(option => {
        option.show = (option.value / 3600).toFixed(4)
      })
    }
    setEchartOption({
      color: ['#4466EC', '#8C54FF'],
      title: {
        text: chartsTitle,
        textStyle: {
          fontSize: 12,
          color: 'rgba(0, 0, 0, 0.65)',
          fontFamily: 'Microsoft YaHei',
          fontWeight: '500'
        },
        padding: 10,
        left: 5
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function (params) {
          const { name: name, value: value } = params[0]
          return `<span>${name}的执行${isTime ? '次数' : '时长'}为<br />${value}${isTime ? '次' : XUnit === 0 ? '秒' : '小时'}</span>`
        }
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01],
        name: isTime ? '次' : XUnit === 0 ? '秒' : '小时'
      },
      yAxis: { type: 'category', data: optionData.map(e => e.name).reverse() },
      series: [
        {
          type: 'bar',
          itemStyle: {
            barBorderRadius: 10
          },
          barWidth: 20,
          data: optionData.map(e => e.show).reverse()
        }
      ]
    })
  }, [optionData])

  // 下载excels文件
  async function downExcels() {
    let XLSX = await import('xlsx')
    let wb = XLSX.utils.book_new() /*新建book*/
    xlsxdata.forEach((xlsx, index) => {
      let ws = XLSX.utils.json_to_sheet(xlsx.data) /* 新建空workbook，然后加入worksheet */
      XLSX.utils.book_append_sheet(wb, ws, xlsx.sheetName || 'sheet' + index) /* 生成xlsx文件(book,sheet数据,sheet命名) */
    })
    XLSX.writeFile(wb, `${chartsTitle}.xlsx`) /*写文件(book,xlsx文件名称)*/
  }

  return (
    <div className='workflow_statistics_component'>
      <div className='pie'>
        <ReactEcharts option={echartOptions} />
        <div className='btn' onClick={downExcels}>
          导出明细
        </div>
      </div>
    </div>
  )
}
