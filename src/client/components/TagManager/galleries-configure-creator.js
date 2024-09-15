/**
 * @Author sugo.io<asd>
 * @Date 17-10-18
 * @description 生成画像图表配置，该匹配放在view中计算太占位置了
 */

import EchartsBaseOpts from '../../common/echart-base-options'
import * as d3 from 'd3'

const percent = d3.format('.2%')

/**
 * @param {TagGalleryModel} tag
 * @param {?TagGalleryModel} entire
 * @return {{bar:Object, pie:Object, bar_entire:{?Object}}}
 */
function creator (tag, entire, filteredUserCount, allUserCount) {
  // 标签可能存在集合交叉，这里需要除以总数，而不是标签的人数的求和
  const count = filteredUserCount + 1e-8 // 避免除0
  const ColorLength = EchartsBaseOpts.color.length

  const pie = {
    ...EchartsBaseOpts,
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: '{a} <br/>{b}: {c}'
    },
    series: [
      {
        name: tag.name,
        type: 'pie',
        radius: ['50%', '70%'],
        roseType: 'radius',
        avoidLabelOverlap: false,
        label: {
          normal: {
            show: false,
            position: 'center'
          },
          emphasis: {
            show: true,
            textStyle: {
              fontSize: '20',
              fontWeight: 'normal'
            }
          }
        },
        labelLine: {
          normal: {
            show: false
          }
        },
        data: tag.values
      }
    ]
  }

  const bar = {
    ...EchartsBaseOpts,
    grid: {
      left: 'center',
      right: '60px'
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: '{a} <br/>{b}: {c}'
    },
    legend: {
      orient: 'vertical',
      x: 'left',
      data: tag.values.map(p => p.name)
    },
    xAxis: {
      type: 'value',
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
      },
      axisLabel: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    yAxis: [
      {
        type: 'category',
        inverse: true,
        data: tag.values.map(p => p.name),
        axisTick: {
          show: false
        },
        axisLine: {
          show: false
        },
        axisLabel: {
          textStyle: {
            color: '#333'
          }
        }
      }
    ],
    series: [
      {
        barMaxWidth: 10,
        barMinHeight: 1,
        barGap: '1%',
        barCategoryGap: '10%',
        label: {
          normal: {
            show: true,
            position: 'right',
            color: '#333',
            formatter: function (obj) {
              return percent(obj.value / count)
            }
          }
        },
        name: tag.name,
        type: 'bar',
        data: tag.values.map((v, i) => ({
          value: v.value,
          itemStyle: {
            normal: {
              color: EchartsBaseOpts.color[i % ColorLength]
            }
          }
        }))
      }
    ]
  }

  let bar_entire = null

  if (entire) {
    const legend = ['筛选用户', '整体']
    const barStyle = {
      barMaxWidth: '20px',
      barMinHeight: 0,
      barGap: '50%',
      barCategoryGap: '50%'
    }

    const tag_counter = count
    const entire_counter = allUserCount + 1e-8

    bar_entire = {
      ...EchartsBaseOpts,
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter(r){
          return `${r.seriesName}<br/>${r.name}: ${percent(r.value / 100)}`
        }
      },
      legend: {
        orient: 'vertical',
        x: 'left',
        data: legend
      },
      xAxis: {
        type: 'category',
        data: tag.values.map(p => p.name)
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: {
            formatter: '{value}%'
          }
        }
      ],
      series: [
        {
          ...barStyle,
          name: legend[0],
          type: 'bar',
          data: tag.values.map((v, i) => ({
            value: v.value / tag_counter * 100,
            itemStyle: {
              normal: {
                color: EchartsBaseOpts.color[0]
              }
            }
          }))
        },
        {
          ...barStyle,
          name: legend[1],
          type: 'bar',
          data: entire.values.map((v, i) => ({
            value: v.value / entire_counter * 100,
            itemStyle: {
              normal: {
                color: EchartsBaseOpts.color[1]
              }
            }
          }))
        }
      ]
    }
  }

  return {
    pie,
    bar,
    bar_entire
  }
}

export default creator
