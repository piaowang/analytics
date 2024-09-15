/**
 * 关系图，从 知识图谱 迁移过来，与单图业务逻辑无关的图表组件
 */
import React from 'react'
import _ from 'lodash'
import EchartBaseOptions from '../../../common/echart-base-options'
import { chartLightTheme,chartDarkTHeme } from '../../../common/echartThemes'
import ReactEchartsEnhance from '../ReactEchartsEnhance'
import * as d3 from 'd3'

export const RelationMapOptionSample = {
  nodeInfoDict: {
    '斯坦福大学id': {
      name: '斯坦福大学',
      label: '无限极会员',
      to: [{ id: '赵勇id', weight: 1, action: '邀请' }],
      weight: 2
    },
    '真格基金id': {
      name: '真格基金',
      label: '无限极活动',
      to: [{id: '万达集团id', weight: 1}],
      weight: 2
    },
    '赵勇id': {
      name: '赵勇',
      to: [{id: '万达集团id', weight: 1}],
      weight: 1
    }
  },
  tooltipContentGenerator: params => {
    if (params.dataType === 'node') {
      return params.name
    } else if (params.dataType === 'edge') {
      let {sourceName, targetName, name} = params.data
      return `${sourceName} ${name} ${targetName}`
    }
    return 'unknown dataType'
  }
}

const maxTakeCount = 9
const initSelectedCount = 6

// 参考
// http://echarts.baidu.com/examples/editor.html?c=graph-npm
export default class SimplifyRelationChart extends React.PureComponent {
  
  autoDetectSymbleFn = (maxSymbolSize, [min, max]) => {
    let pow = 1/( Math.log(max - min)/Math.log(maxSymbolSize))
    return v => Math.pow(v, pow) + 5
  }

  genEchartsOption(option,theme) {
    let {
      nodeInfoDict,
      repulsion = 120,
      edgeLength = 60,
      gravity = 0.1,
      maxSymbolSize = 75,
      tooltipContentGenerator = RelationMapOptionSample.tooltipContentGenerator,
      tooltipTriggerOn,
      symbolSizeFn
    } = option || {}

    let targetTheme = theme === 'light'?chartLightTheme:chartDarkTHeme

    if (!nodeInfoDict) {
      nodeInfoDict = {}
    }
    
    if (!symbolSizeFn) {
      symbolSizeFn = this.autoDetectSymbleFn(maxSymbolSize, d3.extent(_.values(nodeInfoDict), v => Math.max(0, v.weight)))
    }

    let nodeIds = _.keys(nodeInfoDict)
    let getType = node => `${_.get(node, 'label') || '其他'}`

    let categoriesFreq = _(nodeInfoDict).values().countBy(getType).value()
    let sortedCategories = _(categoriesFreq).keys().orderBy(n => n, 'asc').value()
    let categoriesIndexDict = _.zipObject(sortedCategories, sortedCategories.map((t, i) => i))
    let echartsCategories = sortedCategories.map(v => ({name: v}))
    let data = _(nodeIds).map(id => {
      let value = _.get(nodeInfoDict[id], 'weight') || 1
      let type = getType(nodeInfoDict[id])
      let categoryIdx = categoriesIndexDict[type]
      
      return {
        id,
        name: _.get(nodeInfoDict[id], 'name'),
        value,
        symbolSize: symbolSizeFn(value),
        category: categoryIdx,
        type
      }
    }).orderBy(n => n.category).value()
    return {
      color: EchartBaseOptions.color,
      // color:targetTheme.color,
      tooltip: {
        enterable: true,
        showDelay: tooltipContentGenerator === RelationMapOptionSample.tooltipContentGenerator ? 0 : 100,
        hideDelay: tooltipContentGenerator === RelationMapOptionSample.tooltipContentGenerator ? 100 : 300,
        position: tooltipContentGenerator === RelationMapOptionSample.tooltipContentGenerator ? undefined : pointer => pointer,
        triggerOn: tooltipTriggerOn || 'mousemove|click'
      },
      legend: {
        ...targetTheme.legend,
        show: true,
        // selectedMode: 'single',
        data: sortedCategories,
        selected: _.zipObject(sortedCategories, sortedCategories.map((v, i) => i < initSelectedCount))
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series : [
        {
          name: '关系',
          type: 'graph',
          layout: 'force',
          force: {
            repulsion,
            edgeLength,
            gravity
          },
          draggable: true,
          tooltip: {
            formatter: tooltipContentGenerator && ((params, ticket, cb) => {
              Promise.resolve(tooltipContentGenerator(params)).then(content => {
                cb(ticket, content)
              })
              return 'loading'
            })
          },
          data: data,
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [1, 5],    //箭头的大小
          edgeLabel: {
            emphasis: {
              show: true,
              formatter: function(x) {
                return x.data.name
              }
            }
          },
          links: _.flatMap(nodeIds, id => {
            return (_.get(nodeInfoDict, [id, 'to']) || []).map(to => {
              return {
                target: to.id,
                source: id,
                name: to.action,
                sourceName: _.get(nodeInfoDict[id], 'name'),
                targetName: _.get(nodeInfoDict[to.id], 'name')
              }
            })
          }),
          categories: echartsCategories,
          roam: true,
          focusNodeAdjacency: true,
          itemStyle: {
            normal: {
              borderColor: '#fff',
              borderWidth: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          label: {
            position: 'right',
            formatter: '{b}'
          },
          lineStyle: {
            color: 'source',
            curveness: 0.1
          },
          emphasis: {
            lineStyle: {
              width: 10
            }
          }
        }
      ]
    }
  }

  render() {
    let { option,theme='light', ...rest } = this.props
    let newOption = this.genEchartsOption(option,theme)
    return (
      <ReactEchartsEnhance
        // notMerge
        theme={this.props.theme}
        lazyUpdate
        option={newOption}
        {...rest}
      />
    )
  }
}
