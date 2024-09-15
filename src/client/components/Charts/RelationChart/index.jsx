import React from 'react'
import PropTypes from 'prop-types'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import _ from 'lodash'
import SimplifyRelationChart from './relation-chart'
import {EMPTY_STRING, NULL_VALUE} from '../../../../common/constants'

const trun = _.partialRight(_.truncate, {length: 24})

export default class RelationChart extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    translationDict: PropTypes.object,
    data: PropTypes.array,
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func
  }
  
  static defaultProps = {
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }
  
  flatMapDeep = (nodeArr, getChildKey, mapper, parentInfos = []) => {
    if (!_.isArray(nodeArr) || _.isEmpty(nodeArr)) {
      return []
    }
    return _.flatMap(nodeArr, n => {
      let next = mapper(n, parentInfos)
      let childArrKey = getChildKey(next)
      return [
        next,
        ...this.flatMapDeep(next[childArrKey], getChildKey, mapper, [...parentInfos, next])
      ]
    })
  }
  
  genInfoDict = (data) => {
    let {dimensions, metrics, translationDict} = this.props
    /*    let sample = [{
          article_share: [],
          member_name: "雍娜",
          product_share: [],
          purchase: [],
          uid: "0x140782",
          view: [],
          '~member_next_level_of': []
        }]*/
  
    // flatted: [{id, children: [id, id, ...]}, ...]
    let mapKeysFn = (v, k) => {
      if (k === metrics[0]) {
        return 'value'
      }
      if (_.includes(dimensions, k)) {
        return 'title'
      }
      if (_.isArray(v)) {
        return 'children'
      }
      return k
    }
    let flatted = this.flatMapDeep(data, d => _.findKey(d, v => _.isArray(v)), (d, parentInfos) => {
      let label = dimensions[parentInfos.length] || '全局'
      const d1 = _.mapKeys(d, mapKeysFn)
      d1.id = `${label}_${d1.title || 'NULL'}`
      d1.label = label
      d1.name = d[label] || NULL_VALUE
      d1.title = d1.title === null ? NULL_VALUE : (d1.title === '' ? EMPTY_STRING : trun(d1.title))
      return d1
    })
  
    // return: {[id]: {label, to: [{id, weight}], weight}}
    let valCol = metrics[0]
    let nodeIdDict = _(flatted).groupBy('id').mapValues((nodes, id) => {
      let v = nodes[0]
      let level = _.findIndex(dimensions, dim => dim === v.label)
      let nextLevelLabel = dimensions[level + 1]
      const valSum = _.sumBy(nodes, c => c.value || 0)
      const res = {
        label: _.get(translationDict, v.label, v.label),
        name: v.name,
        to: _.flatMap(nodes, v => {
          if (_.isEmpty(v.children)) {
            return []
          }
          return v.children.map(c => ({
            id: `${nextLevelLabel}_${c[nextLevelLabel] || 'NULL'}`,
            weight: c[valCol],
            action: '-'
          }))
        }),
        weight: valSum
      }
      return res
    }).value()
    return nodeIdDict
  }
  
  render() {
    let {
      data, dimensions, metrics, translationDict, dimensionColumnFormatterGen, metricsFormatDict, total, isThumbnail,
      opts,theme='light', ...rest
    } = this.props
    let infoDict = this.genInfoDict(data)
    return (
      <SimplifyRelationChart
        theme={this.props.theme}
        option={{
          repulsion: isThumbnail ? 60 : 120,
          maxSymbolSize: isThumbnail ? 50 : 75,
          nodeInfoDict: infoDict,
          tooltipContentGenerator: params => {
            if (params.dataType === 'node') {
              return `${params.name}：${_.round(params.value, 2)}`
            } else if (params.dataType === 'edge') {
              let {sourceName, targetName, name} = params.data
              return `${sourceName} ${name} ${targetName}`
            }
            return 'unknown dataType'
          }
        }}
        opts={{...(opts || {}), renderer: 'canvas'}} // 修正拖动后文本错位问题
        {...rest}
      />
    )
  }
}
