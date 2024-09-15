import React from 'react'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio } from 'antd';
import FilterItemDimension from './filter-item-dimension'
const FormItem = Form.Item
const RadioButton = Radio.Button
const RadioGroup = Radio.Group
import _ from 'lodash'
import { immutateUpdate } from '../../../common/sugo-utils'

export default class DimFilters extends React.Component {

  setRelation = e => {
    let { modifier, content, basePath } = this.props
    let { value: nextRelation } = e.target
    modifier({
      content: immutateUpdate(content, `${basePath}.relation`, () => nextRelation)
    })
  }

  addFilter = () => {
    let { modifier, basePath } = this.props
    let content = _.cloneDeep(this.props.content)
    let filter = {
      relation: 'and',
      filters: [{
        dimension: '',
        action: 'in',
        value: [],
        actionType: 'str'
      }]
    }
    const newContent = immutateUpdate(content, `${basePath}.filters`, (val = []) => [...val, filter])
    modifier({ content: newContent })
  }

  renderFilters = (filters) => {
    return (
      <div className="filters">
        {filters.map((filter, index) => {
          let props = {
            ...this.props,
            filter,
            index
          }
          return <FilterItemDimension {...props} key={index + '@dimf'} />
        })}
      </div>
    )

  }

  renderAddBtn = disabled => {
    return disabled
      ? null
      : <div className="add-button-wrap">
        <span
          className="pointer"
          onClick={this.addFilter}
          title="增加一个条件"
        >
          <PlusCircleOutlined className="mg1r" />
          增加一个条件
        </span>
      </div>;
  }

  render() {
    let { content, basePath, disabled } = this.props
    let { relation = 'and', filters = [] } = _.get(content, `${basePath}`, {})
    return (
      <div>
        <div className="relation-set">
          <RadioGroup
            value={relation}
            onChange={this.setRelation}
          >
            <RadioButton value="and">并且</RadioButton>
            <RadioButton value="or">或者</RadioButton>
          </RadioGroup>
        </div>
        {this.renderFilters(filters)}
        {this.renderAddBtn(disabled)}
      </div>
    )

  }
}
