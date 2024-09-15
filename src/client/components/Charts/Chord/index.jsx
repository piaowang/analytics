import React, { Component } from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import { isEqualWithFunc } from '../../../../common/sugo-utils'
import { defaultDimensionColumnFormatterGen } from '../../../common/echarts-option-generator'
import _ from 'lodash'
import {NULL_VALUE} from '../../../../common/constants'
import SliceChartFacade from '../../Slice/slice-chart-facade'

// const AlwaysDisplayLabelItemCount = 20

export default class Chord extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  render() {
    let {
      data, dimensions, metrics, translationDict, metricsFormatDict, dimensionColumnFormatterGen, isThumbnail, opts, ...rest
    } = this.props
    if (dimensions.length !== 2) {
      return <Alert msg={'请为和弦图选择两个维度'} {...rest} />
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    let xAxisName = dimensions[0]
    let yAxisName = dimensions[1]
    let valCol = metrics[0]

    let targetData = data.filter((i, k) => !k.isTotalRow)

    let legends = []
    let links = []
    let nodes = []
    //统计最多逻辑 保留
    // let maxContain = {
    //   num: 0,
    //   name: null
    // }
    // let containMax = {
    //   num: 0,
    //   name: null
    // }
    targetData.forEach(i => {
      let symbolSize = 0
      let hasProperty = false
      const xId = `${xAxisName}:${i[xAxisName] || NULL_VALUE}`
      for (let k in i) {
        if (!_.isArray(i[k])) {
          continue
        }
        symbolSize = i[k].length
        // if (symbolSize > maxContain.num) {
        //   maxContain.name = i[xAxisName]
        //   maxContain.num = symbolSize
        // }
        i[k].forEach(j => {
          const yId = `${yAxisName}:${j[yAxisName] || NULL_VALUE}`
          links.push({
            source: xId,
            target: yId,
            sourceTitle: i[xAxisName] || NULL_VALUE,
            targetTitle: j[yAxisName] || NULL_VALUE
          })
          
          nodes.forEach(node => {
            if (node.id === yId) {
              hasProperty = true
              node.symbolSize++
              // if (node.symbolSize > containMax.num) {
              //   containMax.name = node.name
              //   containMax.num = node.symbolSize
              // }
            }
          })
          if (!hasProperty) {
            legends.push({name: yId})
            nodes.push({
              id: yId,
              name: j[yAxisName] || NULL_VALUE,
              category: yId,
              symbolSize: 1
            })
          }
        })
      }
      legends.push({ name: xId })
      nodes.push({
        id: xId,
        name: i[xAxisName] || NULL_VALUE,
        category: xId,
        symbolSize
      })
    })

    // var lineColor='#e53935';
    
    let sourceTitleLinkGroup = _.groupBy(links, l => l.sourceTitle)
    let targetTitleLinkGroup = _.groupBy(links, l => l.targetTitle)
  
    // merge nodes
    const uniqLegends = _.uniqBy(legends, l => l.name)
    const uniqNodes = _(nodes).groupBy(n => n.id)
      .mapValues(arr => {
        return arr.length === 1 ? arr[0] : {...arr[0], symbolSize: _.sumBy(arr, o => o.symbolSize)}
      })
      .values()
      .value()
  
    let option = {
      //统计最多逻辑 保留
      // title: {
      //   text: `${dict[xAxisName]}与${dict[yAxisName]}和弦图`,
      //   textStyle: {
      //     fontSize: 30,
      //   },
      //   subtext: `{a|${maxContain.name}}包含${dict[yAxisName]}最多\n{a|${containMax.name}}是出现最多的${dict[yAxisName]}`,
      //   subtextStyle: {
      //     fontSize: 22,
      //     rich: {
      //       a: {
      //         color: 'red',
      //         fontWeight: 'bold',
      //         fontSize: 25,
      //       },

      //     }
      //   },
      // },
      ...baseOptions,
      legend: {
        //selectedMode: 'single',
        data: uniqLegends,
        show: uniqLegends.length < 7
      },

      animationDurationUpdate: 2,
      animationEasingUpdate: 'quinticInOut',

      series: [{
        type: 'graph',
        left: 'center',
        top: 'center',
        width: '80%',
        height: '60%',
        ribbonType: true,
        layout: 'circular',
        edgeSymbol: ['circle','arrow'],
        edgeSymbolSize: [0, 10],
        circular: {
          rotateLabel: true
        },

        force: {
          initLayout: 'circular',
          repulsion: 50,
          gravity: 0.5,
          edgeLength: 500,
          layoutAnimation: true
        },

        roam: false,
        focusNodeAdjacency: true,
        hoverAnimation: true,
        label: {
          normal: {
            position: 'center',
            fontWeight: 'bold',
            fontSize: 14,
            // formatter: '{b}',
            formatter: (param) => {
              let [col, val] = param.data.id.split(':')
              // 如果有相同名称的指向，则显示列名
              if (col === xAxisName) {
                return val in targetTitleLinkGroup ? `${translationDict[col] || col}:${val}` : val
              }
              if (col === yAxisName) {
                return val in sourceTitleLinkGroup ? `${translationDict[col] || col}:${val}` : val
              }
              return param.name
            },
            normal: {
              textStyle: {

                fontFamily: '宋体'
              }
            }
          }
        },
        draggable: true,
        itemStyle: {
          normal: {
            label: {
              rotate: true,
              show: true
            }
          },
          emphasis: {
            label: {
              show: true
              // textStyle: null      // 默认使用全局文本样式，详见TEXTSTYLE
            }
          }
        },
        lineStyle: {
          normal: {
            color: '#e53935',
            width: 2,
            type: 'solid',
            opacity: 0.2,
            curveness: 0.3
          }
        },
        categories: uniqLegends,
        data: uniqNodes,
        links: links
      }]
    }
    return (
      <ReactEcharts
        key={Date.now()}
        {...rest}
        opts={{...(opts || {}), renderer: 'canvas'}}
        option={option}
        notMerge
      />
    )
  }
}
