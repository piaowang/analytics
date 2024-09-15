
import React from 'react'
import { Select } from 'antd'
const { Option } = Select
export default class LabelWithSelect extends React.Component {
  /** 
   * onSelect {Event} select的onSelect事件
   * options {Array} 可以选择的options {name:'项目',value:'all'}
  */
  render() {
    let { onSelect,  options = [] } = this.props
    return (
      <React.Fragment>
        <div
          className='labaleSelector'
        >
          项目名称:
        </div>
        <div
          className='selectContainer'
        >
          <Select
            allowClear
            showSearch
            className='select'
            onSelect={onSelect}
            placeholder='请输入关键字筛选'
            filterOption={(input, option) =>
              option.children.indexOf(input) >= 0
            }
          >
            {
              options.map(e => (<Option key={e.id} value={e.id}>{e.name}</Option>))
            }

          </Select>
        </div>
      </React.Fragment>
    )
  }
}

