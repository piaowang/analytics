import React from 'react'
import PropTypes from 'prop-types'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import SimplifyTreeChart from './tree-chart'
import {isEqualWithFunc, recurMap} from '../../../../common/sugo-utils'
import _ from 'lodash'
import {EMPTY_STRING, NULL_VALUE} from '../../../../common/constants'
import { chartDarkTHeme,chartLightTheme } from '../../../common/echartThemes'

const trun = _.partialRight(_.truncate, {length: 24})

export default class TreeChart extends React.Component {
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
  
  state = {
    key: Date.now()
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!isEqualWithFunc(prevProps, this.props)) {
      this.setState({
        key: Date.now()
      })
    }
  }
  
  normalizeData = (data) => {
    let {dimensions, metrics} = this.props
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
    return recurMap(data, d => _.findKey(d, v => _.isArray(v)), (d, parentInfos) => {
      const d1 = _.mapKeys(d, mapKeysFn)
      const pId = _(parentInfos).chain().last().get('__id').value()
      d1.__id = pId ? `${pId}_${d1.title || 'NULL'}` : (d1.title || 'NULL')
      d1.title = d1.title === null ? NULL_VALUE : (d1.title === '' ? EMPTY_STRING : trun(_.trim(d1.title)))
      return d1
    })
  }
  
  render() {
    let {
      data, dimensions, metrics, translationDict, dimensionColumnFormatterGen, metricsFormatDict, isThumbnail, total = {}, theme = 'light',
      ...rest
    } = this.props
    let normData = this.normalizeData(data)
    let targetTheme = theme === 'light' ? chartLightTheme : chartDarkTHeme
    return (
      <SimplifyTreeChart
        key={this.state.key} // 解决出现奇怪分支问题
        option={{
          theme,
          data: {
            __id: 'root',
            title: '全局',
            value: _.get(total, metrics[0], 0),
            children: normData
          },
          idColumn: '__id',
          titleColumn: 'title',
          valueColumn: 'value',
          childrenColumn: 'children',
          orient: 'LR',
          initialTreeDepth: isThumbnail ? 1 : 3,
          label: {
            color: _.get(targetTheme, 'tree.label.color')
          }
        }}
        theme={targetTheme}
        {...rest}
      />
    )
  }
}
