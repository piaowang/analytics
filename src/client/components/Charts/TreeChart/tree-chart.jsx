/**
 * 树图表，从 知识图谱 项目引入，与业务逻辑无关
 */
import React from 'react'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import EchartBaseOptions from '../../../common/echart-base-options'

export const TreeChartOptionSample = {
  data: {
    'member_id': '4114396',
    'member_name': '徐刚',
    'member_gender': 'male',
    'member_level': 9,
    'member_phone': '15224718020',
    'member_province': '江西省',
    'member_city': '九江市',
    '~member_next_level_of': [
      {
        'member_id': '13801666',
        'member_name': '丰璐',
        'member_gender': 'female',
        'member_level': 8
      }
    ]
  },

  idColumn: 'member_id',
  titleColumn: 'member_name',
  valueColumn: 'member_level',
  childrenColumn: '~member_next_level_of',
  orient: 'vertical'
}

// 参考
// http://echarts.baidu.com/examples/editor.html?c=pie-legend
export default class SimplifyTreeChart extends React.PureComponent {

  recurConvert(data, opts) {
    if (_.isArray(data)) {
      return data.map(d => this.recurConvert(d, opts))
    }
    let {idColumn, titleColumn, childrenColumn} = opts

    let modVals = _.mapValues(data, (v, k) => k === childrenColumn ? this.recurConvert(v, opts) : v)
    return _.mapKeys(modVals, (v, k) => {
      if (k === childrenColumn) {
        return 'children'
      }
      if (k === idColumn) {
        return 'id'
      }
      if (k === titleColumn) {
        return 'name'
      }
      return k
    })
  }

  genEchartsOption(opts = {}) {
    let {data, tooltipContentGenerator, orient = 'vertical', initialTreeDepth = 4, ...rest} = opts
    let converted = this.recurConvert(data, rest)
    let { theme } = this.props
    return {
      color: EchartBaseOptions.color,
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        enterable: true,
        formatter: tooltipContentGenerator ? async (params, ticket, cb) => {
          cb(ticket, await tooltipContentGenerator(params))
          return 'Loading'
        } : undefined ,
        extraCssText:_.get(theme,'tooltip.extraCssText')
      },
      series:[
        {
          type: 'tree',
    
          data: _.isArray(converted) ? converted : [converted],
          
          lineStyle:{
            color:_.get(theme,'tree.lineStyle.color')
          },

          tooltip:{
            backgroundColor:_.get(theme,'tooltip.backgroundColor'),
            textStyle:{
                color:_.get(theme,'tooltip.textStyle.color')
            },
          },

          ...(orient === 'vertical'
            ? {
              left: '2%',
              right: '2%',
              top: '8%',
              bottom: '20%'
            }
            : {
              top: '1%',
              left: '7%',
              bottom: '1%',
              right: '20%'
            }),
    
          symbol: 'emptyCircle',
          symbolSize: 10,
    
          orient: orient,
    
          expandAndCollapse: true,
    
          initialTreeDepth,
    
          label: orient === 'vertical'
            ? {
              normal: { position: 'bottom', fontSize: 12,color:_.get(theme,'tree.label.color') },
              
            }
            : {
              normal: { position: 'left', fontSize: 12,color:_.get(theme,'tree.label.color') },
            },
    
          leaves: orient === 'vertical'
            ? {
              label: {
                normal: { position: 'bottom', rotate: -90,color:_.get(theme,'tree.label.color') }
              }
            }
            : {
              label: {
                normal: { position: 'right',color:_.get(theme,'tree.label.color') }
              }
            },
    
          animationDurationUpdate: 750
        }
      ]
    }
  }

  render() {
    let { option, ...rest } = this.props
    let echartsOption = this.genEchartsOption(option)
    return (
      <ReactEcharts
        notMerge
        option={echartsOption}
        {...rest}
      />
    )
  }
}
