import React from 'react'
import { TreeSelect } from 'antd'
import { convertToTreeSelectData } from './store/utils'
import { KEY_NONE_TYPE } from 'common/constants'
import _ from 'lodash'

/**
 * 标签分类树-下拉树形组件
 * @export TagTypeTreeSelect
 * @class TagTypeTreeSelect
 * @extends {React.Component}
 */
export default class TagTypeTreeSelect extends React.Component {

  constructor(props) {
    super(props)
    let { treeList, selectedValue } = this.props
    if (!_.isEmpty(this.props.value)) {
      treeList = _.get(this.props.value, 'treeList')
      selectedValue = _.get(this.props.value, 'selectedValue')
    }
    this.state = {
      treeList,
      selectedValue: selectedValue || KEY_NONE_TYPE
    }
  }

  componentWillReceiveProps(nextProps) {
    // Should be a controlled component.
    if ('value' in nextProps) {
      const value = nextProps.value
      if (value)
        this.setState(value)
    }
  }

  handleChange = (k, v) => {
    let changedValue = {}
    changedValue[k] = v
    if (!('value' in this.props)) {
      this.setState(changedValue)
    }
    this.triggerChange(changedValue)
  }

  triggerChange = (changedValue) => {
    // Should provide an event to pass value to Form.
    const onChange = this.props.onChange
    if (onChange) {
      onChange(Object.assign({}, this.state, changedValue))
    }
  }

  render() {
    const { selectedValue, treeList } = this.state
    const treeData = convertToTreeSelectData(_.clone(treeList), 'id', 'parent_id')
    return (
      <div className="treeSelectContainer">
        <TreeSelect
          showSearch
          placeholder="请选择标签分类"
          treeData={treeData}
          defaultValue={selectedValue}
          value={selectedValue}
          treeNodeFilterProp="name"
          allowClear
          getPopupContainer={() => document.querySelector('.treeSelectContainer')}
          treeDefaultExpandAll
          onChange={(v) => this.handleChange('selectedValue', v)}
        />
      </div>
    )
  }
}
