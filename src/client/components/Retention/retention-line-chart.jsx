import PropTypes from 'prop-types'
import Echart from 'echarts-for-react'
import React from 'react'
import _ from 'lodash'
import echartBaseOption from '../../common/echart-base-options'

export default class RetentionLineEChart extends React.Component {
  static propTypes = {
    retention: PropTypes.object.isRequired,
    data: PropTypes.array
  }
  
  static defaultProps = {
    data: [{ data: [] }]
  }
  
  constructor(props) {
    super(props)

    this.state = {
      colorList: ['#89c0c1', '#2F9799', '#B5FFD7', '#FF7591', '#CC7CB4']
    }
  }

  getOption = () => {
    let {multiStepData} = this.props
    // [{name: "概况", data: Array[7]}, {name: '上海', data: Array[7]}, ...]
    let granularity = this.props.granularityType === 'P1D' ? '天' : this.props.granularityType === 'P1W' ? '周' : '个月'
    const skipZeroRetention = _.get(this.props.retention, 'params.skipZeroRetention')
    let xAxisLabels = [`当${granularity}`].concat(_.range(multiStepData[0].data.length - 1).map(i => `${i+1}${granularity}后`))
    let legendDatas = multiStepData.map(d => {
      return {
        name: d.name,
        icon: 'circle',// 强制设置图形为圆
        textStyle: {
          color: '#333',
          fontWeight: 'bold'
        }
      }
    })

    const option = {
      title: {
        text: ''
      },
      color: ['#bebef2', ...echartBaseOption.color],
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          return params.map(param => {
            return param.seriesName + ' ' +  (Math.floor(param.value * 10000) / 100).toFixed(1) + '%'
          }).join('<br />')
        }
      },
      legend: {
        data: legendDatas,
        left: 20
      },
      toolbox: {
        right: 20,
        feature: {
          saveAsImage: {}
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: xAxisLabels
        }
      ],
      yAxis: [
        {
          name: '平均留存率',
          nameLocation: 'middle',
          nameGap: 50,
          type: 'value',
          min: 0,
          max: 1,
          axisLabel: {
            formatter: (value) => {
              return Math.floor(value * 100) + '%'
            }
          }
        }
      ],
      series: multiStepData.map(s => {
        let sdata = s.data
        //if (len > 0) sdata = sdata.slice(0, len - 1)
        let result = {
          name: s.name,
          type: 'line',
          // areaStyle: { normal: {} }, // 填充
          data: sdata.map((data, i) => {
            let {children, total} = s
            let divider = children
              ? children.reduce((acc, curr, j) => {
                if (skipZeroRetention && _.get(curr.data, [i, 'value'], 0) === 0) {
                  return acc
                }
                return j < children.length - i ? acc + curr.total : acc
              }, 0)
              : total

            // return (data.value / sdata[0].total) || 0 // 旧算法，分母为用户总数
            return 0 < divider ? (data.value / divider) : 0 // 新算法，数值跟下边表格一致
          }),
          smooth: true
        }
        return result
      })
    }
    return option
  }

  render() {
    let {multiStepData} = this.props
    return (
      <div className="pdy">
        {multiStepData.length && multiStepData[0].data.length ? (
          <Echart
            option={this.getOption()}
            notMerge
          />
        ) : (<div className="hintNoData">无符合条件的数据</div>)}
      </div>
    )
  }
}

