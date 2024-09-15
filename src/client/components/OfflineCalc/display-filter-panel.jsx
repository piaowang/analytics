import React from 'react'
import { Row, Col } from 'antd'
import _ from 'lodash'
import { interpose } from '../../../common/sugo-utils'
import { bindActionCreators } from 'redux'
import * as roleActions from '../../actions/roles'
import { connect } from 'react-redux'

let mapStateToProps = state => _.pick(state.common, 'roles')
let mapDispatchToProps = dispatch => bindActionCreators(roleActions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class ModelFilterPanel extends React.Component {

  constructor(props) {
    super(props)
  }

  renderFilter = (idx, i, filter) => {
    const { tableIdDict } = this.props
    return (
      <div className="tag-group-filter pd1b " key={`${idx}_${i}_tgf1`}>
        {_.get(tableIdDict, [filter.table, 'title']) || _.get(tableIdDict, [filter.table, 'name'], '')}.
        {filter.col}
        <span className="pd3x">{_.get(FilterOpNameMap, filter.op, filter.op)}</span>
        {filter.eq}
      </div>
    )
  }

  renderSubFilterGroup = (filter, idx) => {
    let { relation, filters = [] } = filter
    return (
      <div className="mg1b pd1y pd2l" style={{ border: '1px dashed #aaa' }} key={idx}>
        {
          filters.length <= 1
            ? null
            : relation === 'and' ? '并且' : '或者'
        }

        {filters.map((flt, i) => this.renderFilter(idx, i, flt))}
      </div>
    )
  }

  renderParams() {
    let { relation = 'and', filters = [] } = this.props.value
    if (filters.length === 0) {
      return null
    }
    return (
      <div className="tag-group-filters">
        {interpose(
          (d, idx) => <div className="color-green" key={`sep${idx}`}>{relation === 'or' ? '或者' : '并且'}</div>,
          filters.map((flt, idx) => this.renderSubFilterGroup(flt, idx)))}
      </div>
    )
  }

  render() {
    return <div className="pd2x">{this.renderParams()}</div>
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
