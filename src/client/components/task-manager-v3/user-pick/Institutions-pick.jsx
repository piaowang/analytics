import React, { PureComponent } from 'react'
import _ from 'lodash'
import * as actions from '../../../actions/institutions'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { TreeSelect, Input } from 'antd'

@connect(state => _.pick(state.common, ['institutionsList', 'institutionsTree']), dispatch => bindActionCreators(actions, dispatch))
export default class InstitutionsPick extends PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      selectValue: []
    }
    this.props.getInstitutions()
  }

  onChange = (val, l, r) => {
    const { institutionsList, onChange, getSerialNumber = false } = this.props
    let value = val
    if (getSerialNumber) {
      value = _.get(_.find(institutionsList, p => p.id === val), 'serialNumber', '')
    }
    this.setState({ selectValue: val })
    onChange && onChange(value)
  }

  render() {
    const { institutionsList = [], institutionsTree, isFlat = false, isMultiple = false, className} = this.props
    if(!institutionsList.length) {
      return null
    }
    const treeData = isFlat
      ? _.orderBy(institutionsList.map(p => ({ key: p.id, value: p.serialNumber, title: p.name, level: p.level })), ['level'])
      : institutionsTree
    const treeDefaultExpandedKeys = _.reduce(treeData, (r, v) => {
      r.push(v.key)
      r = _.concat(r, _.get(v, 'children', []).map(p => p.key))
      return r
    }, [])
    const tProps = {
      treeData,
      // value,
      treeDefaultExpandedKeys,
      className,
      onChange: (v, l, r) => this.onChange(v, l, r),
      multiple: isMultiple,
      treeCheckStrictly: false,
      showCheckedStrategy: TreeSelect.SHOW_CHILD,
      placeholder: '选择机构',
      style: {
        width: 200
      }
    }
    return <TreeSelect {...tProps}/>
  }
}
