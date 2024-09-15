/**
 * 环形饼图组件
 */

import ReactEcharts from '../Charts/ReactEchartsEnhance'
import baseOpts from '../../common/echart-base-options'

const extend = require('recursive-assign')

/**
 * @param {array} data 数据，格式 [{value:335, name:'直接访问'}]
 * @param {string} title 标题
 * @param {object} options, 额外的设定，扩展或者覆盖下面的base设定
 * @param {rest} 宽高等额外设定
 */
export default ({
  data,
  title,
  options = {},
  ...rest
}) => {

  let base = {
    ...baseOpts,
    tooltip: {
      trigger: 'item',
      position: ['0%', '20%'],
      formatter: params => {
        let {name, percent} = params.data
        return `${name}: ${percent}%`
      }
    },
    legend: {
      show: false
    },
    series: [{
      name: title,
      type: 'pie',
      hoverAnimation:false,
      radius: ['30%', '60%'],
      avoidLabelOverlap: false,
      label: {
        normal: {
          show: false,
          position: 'center',
          textStyle: {
            fontSize: '10'
          }
        },
        emphasis: {
          show: false,
          textStyle: {
            fontSize: '10',
            fontWeight: 'bold'
          }
        }
      },
      labelLine: {
        normal: {
          show: false
        }
      },
      data
    }]
  }
  let opt = extend(base, options)
  return (
    <ReactEcharts
      {...rest}
      option={opt}
      opts={{devicePixelRatio:2}}
      notMerge
    />
  )
}
