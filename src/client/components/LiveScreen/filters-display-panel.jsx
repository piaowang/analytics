import React from 'react'
import _ from 'lodash'
import {interpose} from '../../../common/sugo-utils'


export default class FiltersDisplayPanel extends React.Component {
  
  constructor(props) {
    super(props)
  }
  
  renderFilter = (filter, i) => {
    let {col, op, eq} = filter
    if (_.endsWith(op, 'and') || _.endsWith(op, 'or')) {
      return (
        <div
          className="mg1b pd1y pd2l"
          style={{border: '1px dashed #aaa'}}
          key={i}
        >
          {
            eq.length <= 1
              ? null
              : op === 'and' ? '并且' : '或者'
          }
          {_.map(eq, (subFlt, j) => this.renderFilter({...filter, ...subFlt}, j))}
        </div>
      )
    }
    return (
      <div className="tag-group-filter pd1b " key={`${i}_tgf1`}>
        {col}
        <span className="pd3x">{_.get(FilterOpNameMap, op, op)}</span>
        {eq}
      </div>
    )
  }
  
  render() {
    let {value: filters = []} = this.props
  
    let currRootOp = _.get(filters, [0, 'op']) || 'and'
    let subFlts = /(and|or)$/.test(currRootOp)
      ? filters[0].eq.map(subFlt => ({...filters[0], ...subFlt}))
      : filters
    return (
      <div className="pd2x">
        {interpose(
          (d, idx) => <div className="color-green" key={`sep${idx}`}>{currRootOp === 'or' ? '或者' : '并且'}</div>,
          subFlts.map((flt, idx) => this.renderFilter(flt, idx)))}
      </div>
    )
  }
}

export const FilterOpNameMap = {
  contains: '含有',
  equal: '等于',
  nullOrEmpty: '为空',
  greaterThan: '大于',
  lessThan: '小于',
  greaterThanOrEqual: '大于等于',
  lessThanOrEqual: '小于等于'
}
